// netlify/functions/payment-webhook.js (Versão com Subcoleção)

import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

function initializeFirebaseAdmin() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error("A chave de serviço do Firebase não está configurada.");
    }
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    return admin.firestore();
}

exports.handler = async function(event) {
    const db = initializeFirebaseAdmin();
    const body = JSON.parse(event.body);

    if (body.type !== 'payment') {
        return { statusCode: 200, body: 'Notificação ignorada.' };
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

            if (!raffle_id || !user_id) {
                return { statusCode: 400, body: 'Dados essenciais em falta.' };
            }

            const rifaDocRef = db.collection('rifas').doc(raffle_id);
            const soldNumbersColRef = rifaDocRef.collection('sold_numbers');

            await db.runTransaction(async (transaction) => {
                const numberDocs = await transaction.getAll(...selected_numbers.map(num => soldNumbersColRef.doc(num)));
                
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

                // ✅ LÓGICA ATUALIZADA: Cria um novo documento para cada número
                selected_numbers.forEach(number => {
                    const newNumberDocRef = soldNumbersColRef.doc(number);
                    transaction.set(newNumberDocRef, dataToSave);
                });
            });
        }
    } catch (error) {
        console.error("ERRO no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
