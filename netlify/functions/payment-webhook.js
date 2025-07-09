// netlify/functions/payment-webhook.js (Atualizado com contador)

import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Função para inicializar o Firebase Admin (sem alterações)
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.firestore();
    }
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    return admin.firestore();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const db = initializeFirebaseAdmin();
    const body = JSON.parse(event.body);

    if (body.type !== 'payment') {
        return { statusCode: 200, body: 'Notificação não relacionada a pagamento, ignorada.' };
    }

    try {
        const paymentId = body.data.id;
        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo.status === 'approved' && paymentInfo.metadata) {
            const {
                selected_numbers,
                raffle_id,
                user_id,
                user_name,
                user_email,
                user_whatsapp,
                user_pix,
                vendor_id
            } = paymentInfo.metadata;

            if (!raffle_id || !user_id || !selected_numbers || selected_numbers.length === 0) {
                console.warn("Webhook recebido com dados de metadados insuficientes.", paymentInfo.metadata);
                return { statusCode: 400, body: 'Dados essenciais em falta nos metadados do pagamento.' };
            }

            const rifaDocRef = db.collection('rifas').doc(raffle_id);
            const soldNumbersColRef = rifaDocRef.collection('sold_numbers');

            await db.runTransaction(async (transaction) => {
                const numberDocsPromises = selected_numbers.map(num => transaction.get(soldNumbersColRef.doc(num)));
                const numberDocs = await Promise.all(numberDocsPromises);
                
                for (const doc of numberDocs) {
                    if (doc.exists) {
                        throw new Error(`O número ${doc.id} já foi comprado.`);
                    }
                }

                const dataToSave = {
                    name: user_name,
                    email: user_email,
                    whatsapp: user_whatsapp,
                    pix: user_pix,
                    userId: user_id,
                    createdAt: new Date()
                };
                
                if (vendor_id) {
                    dataToSave.vendorId = vendor_id;
                }

                selected_numbers.forEach(number => {
                    const newNumberDocRef = soldNumbersColRef.doc(number);
                    transaction.set(newNumberDocRef, dataToSave);
                });

                // ✅ NOVA LÓGICA: Incrementa o contador de vendidos no documento principal
                const increment = admin.firestore.FieldValue.increment(selected_numbers.length);
                transaction.update(rifaDocRef, { soldCount: increment });
            });
        }
    } catch (error) {
        console.error("ERRO no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
