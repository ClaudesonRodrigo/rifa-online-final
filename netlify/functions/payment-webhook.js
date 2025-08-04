// netlify/functions/payment-webhook.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

function initializeFirebaseAdmin() {
    if (admin.apps.length) { return admin.firestore(); }
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const db = initializeFirebaseAdmin();
    
    try {
        const notification = JSON.parse(event.body);
        
        // LOG 1: Mostrar a notificação crua que chega do Asaas
        console.log('Webhook INICIAL recebido:', JSON.stringify(notification, null, 2));

        if (notification.event !== 'PAYMENT_CONFIRMED' && notification.event !== 'PAYMENT_RECEIVED') {
            return { statusCode: 200, body: 'Notificação não relevante, ignorada.' };
        }
        
        const paymentId = notification.payment.id;
        if (!paymentId) {
             console.warn("Webhook recebido sem ID de pagamento.");
             return { statusCode: 400, body: 'ID do pagamento ausente.' };
        }

        // LOG 2: Confirmar que estamos buscando os detalhes
        console.log('Buscando detalhes completos para o ID:', paymentId);
        const fullPaymentResponse = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentId}`, {
            method: 'GET',
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });

        const paymentInfo = await fullPaymentResponse.json();

        // LOG 3: Mostrar o objeto COMPLETO que recebemos de volta do Asaas
        console.log('Resposta COMPLETA do Asaas:', JSON.stringify(paymentInfo, null, 2));

        if (!fullPaymentResponse.ok) {
            console.error('Falha ao buscar detalhes do pagamento no Asaas:', paymentInfo.errors);
            throw new Error('Não foi possível obter os detalhes da cobrança.');
        }

        const { metadata } = paymentInfo;

        if (!metadata || !metadata.raffle_id || !metadata.user_id || !metadata.selected_numbers) {
            console.warn("Webhook Asaas recebido com metadados insuficientes.", metadata);
            return { statusCode: 400, body: 'Dados essenciais em falta nos metadados do pagamento.' };
        }

        const {
            selected_numbers, raffle_id, user_id, user_name,
            user_email, user_whatsapp, user_pix, vendor_id
        } = metadata;

        const rifaDocRef = db.collection('rifas').doc(raffle_id);
        const soldNumbersColRef = rifaDocRef.collection('sold_numbers');

        await db.runTransaction(async (transaction) => {
            const numberDocsPromises = selected_numbers.map(num => transaction.get(soldNumbersColRef.doc(String(num))));
            const numberDocs = await Promise.all(numberDocsPromises);
            
            for (const doc of numberDocs) {
                if (doc.exists) {
                    console.error(`TENTATIVA DE COMPRA DUPLA: O número ${doc.id} na rifa ${raffle_id} já foi vendido.`);
                    return;
                }
            }

            const dataToSave = {
                name: user_name, email: user_email, whatsapp: user_whatsapp, pix: user_pix,
                userId: user_id, createdAt: new Date(), paymentProvider: 'asaas', paymentId: paymentInfo.id
            };
            
            if (vendor_id) { dataToSave.vendorId = vendor_id; }

            selected_numbers.forEach(number => {
                const newNumberDocRef = soldNumbersColRef.doc(String(number));
                transaction.set(newNumberDocRef, dataToSave);
            });

            const increment = admin.firestore.FieldValue.increment(selected_numbers.length);
            transaction.update(rifaDocRef, { soldCount: increment });
        });

    } catch (error) {
        console.error("ERRO no processamento do webhook Asaas:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
