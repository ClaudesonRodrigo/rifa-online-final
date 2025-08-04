// netlify/functions/create-payment.js

<<<<<<< HEAD
const fetch = require('node-fetch');
=======
const admin = require('firebase-admin');
const fetch = require('node-fetch');

function initializeFirebaseAdmin() {
    if (admin.apps.length) { return; }
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, payerData } = JSON.parse(event.body);
<<<<<<< HEAD

        if (!items || items.length === 0 || !payerData || !payerData.cpf) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Dados da compra ou CPF do pagador estão faltando." }),
            };
        }

        const totalValue = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        const description = `Pagamento para a rifa: ${payerData.raffleId}. Números: ${items.map(i => i.id).join(', ')}`;
        const externalReference = `RIFA_${payerData.raffleId}_${new Date().getTime()}`;

        // 1. Criar o cliente no Asaas
        const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                name: payerData.name,
                email: payerData.email,
                cpfCnpj: payerData.cpf,
                externalReference: payerData.userId // Usando o ID do Firebase como referência externa do cliente
            })
        });

        const customerData = await customerResponse.json();
        // Se o cliente já existir pelo CPF, o Asaas retorna os dados dele, o que é ótimo.
        if (!customerResponse.ok && !customerData.errors.some(e => e.code === 'invalid_customer')) {
             console.error('Erro ao criar cliente Asaas:', customerData.errors);
             throw new Error('Falha ao registrar dados do cliente.');
        }
        const customerId = customerData.id;


        // 2. Criar a cobrança PIX
        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                customer: customerId,
                billingType: 'PIX',
                dueDate: new Date().toISOString().split('T')[0],
                value: totalValue,
                description: description,
                externalReference: externalReference, // ID único da transação
                // Passando os dados para o webhook via metadata
                metadata: {
                    selected_numbers: items.map(item => item.id),
                    raffle_id: payerData.raffleId,
                    user_id: payerData.userId,
                    user_name: payerData.name,
                    user_email: payerData.email,
                    user_whatsapp: payerData.whatsapp,
                    user_pix: payerData.pix,
                    vendor_id: payerData.vendorId || null
                }
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error('Erro ao criar cobrança Asaas:', paymentData.errors);
            throw new Error(paymentData.errors[0].description);
        }

        // 3. Retornar os dados do PIX para o frontend
=======
        if (!items || !payerData || !payerData.cpf) {
            return { statusCode: 400, body: JSON.stringify({ error: "Dados inválidos." }) };
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();

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

        const totalValue = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        
        const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': process.env.ASAAS_API_KEY },
            body: JSON.stringify({
                customer: { name: payerData.name, cpfCnpj: payerData.cpf },
                billingType: 'PIX',
                dueDate: new Date().toISOString().split('T')[0],
                value: totalValue,
                description: `Pagamento Rifa - Pedido ${pendingId}`,
                externalReference: pendingId,
            })
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok) { throw new Error(paymentData.errors[0].description); }

        const qrCodeResponse = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentData.id}/pixQrCode`, {
            method: 'GET',
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        const qrCodeData = await qrCodeResponse.json();
        if (!qrCodeResponse.ok) { throw new Error('Falha ao obter QR Code.'); }

>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
        return {
            statusCode: 200,
            body: JSON.stringify({
                paymentId: paymentData.id,
<<<<<<< HEAD
                qrCodePayload: paymentData.pixQrCode.payload,
                qrCodeImage: paymentData.pixQrCode.encodedImage,
                externalReference: paymentData.externalReference
            })
        };

    } catch (error) {
        console.error("Erro em create-payment (Asaas):", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Falha ao gerar cobrança: ${error.message}` }) };
    }
};
=======
                qrCodePayload: qrCodeData.payload,
                qrCodeImage: qrCodeData.encodedImage
            })
        };
    } catch (error) {
        console.error("Erro em create-payment:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Falha: ${error.message}` }) };
    }
};
>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
