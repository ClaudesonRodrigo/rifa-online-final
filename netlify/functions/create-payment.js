// netlify/functions/create-payment.js

const admin = require('firebase-admin'); // PRECISAMOS DO FIREBASE ADMIN AQUI AGORA
const fetch = require('node-fetch');

// Função de inicialização do Firebase Admin
function initializeFirebaseAdmin() {
    if (admin.apps.length) { return; }
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, payerData } = JSON.parse(event.body);

        if (!items || !payerData || !payerData.cpf) {
            return { statusCode: 400, body: JSON.stringify({ error: "Dados inválidos." }) };
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();

        // PASSO 1: Criar um registro de "intenção de compra" no nosso Firebase
        const pendingRef = db.collection('pending_payments').doc();
        const pendingId = pendingRef.id;

        const dataToSave = {
            selected_numbers: items.map(item => item.id),
            raffle_id: payerData.raffleId,
            user_id: payerData.userId,
            user_name: payerData.name,
            user_email: payerData.email,
            user_whatsapp: payerData.whatsapp,
            user_pix: payerData.pix,
            vendor_id: payerData.vendorId || null,
            createdAt: new Date()
        };
        
        await pendingRef.set(dataToSave);

        // PASSO 2: Criar a cobrança no Asaas, passando nosso ID como externalReference
        const totalValue = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        
        const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                customer: { name: payerData.name, cpfCnpj: payerData.cpf },
                billingType: 'PIX',
                dueDate: new Date().toISOString().split('T')[0],
                value: totalValue,
                description: `Pagamento Rifa - Pedido ${pendingId}`,
                externalReference: pendingId, // Passando nosso ID aqui!
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error('Erro ao criar cobrança Asaas:', paymentData.errors);
            throw new Error(paymentData.errors[0].description);
        }

        const qrCodeResponse = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentData.id}/pixQrCode`, {
            method: 'GET',
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });

        const qrCodeData = await qrCodeResponse.json();

        if (!qrCodeResponse.ok) { throw new Error('Falha ao obter QR Code.'); }

        return {
            statusCode: 200,
            body: JSON.stringify({
                paymentId: paymentData.id,
                qrCodePayload: qrCodeData.payload,
                qrCodeImage: qrCodeData.encodedImage
            })
        };

    } catch (error) {
        console.error("Erro em create-payment:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Falha: ${error.message}` }) };
    }
};
