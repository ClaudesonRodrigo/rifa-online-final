// netlify/functions/payment-webhook.js (com debug)

import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

function initializeFirebaseAdmin() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error("A chave de serviço do Firebase (FIREBASE_SERVICE_ACCOUNT_KEY) não está configurada na Netlify.");
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
    console.log("--- Início: payment-webhook ---");
    const db = initializeFirebaseAdmin();
    const body = JSON.parse(event.body);

    if (body.type !== 'payment') {
        console.log("Notificação não é do tipo 'payment'. Ignorando.");
        return { statusCode: 200, body: 'Notificação ignorada.' };
    }

    try {
        const paymentId = body.data.id;
        console.log(`Processando pagamento com ID: ${paymentId}`);
        
        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        // LOG DE DEBUG 3 (O MAIS IMPORTANTE):
        console.log("Informação completa do pagamento recebida do Mercado Pago. Metadata:", paymentInfo.metadata);

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
            
            console.log("Vendor ID extraído do metadata:", vendor_id);

            if (!raffle_id || !user_id) {
                console.error("ERRO CRÍTICO: ID da rifa ou do utilizador em falta no metadata.");
                return { statusCode: 400, body: 'Dados essenciais em falta.' };
            }

            const rifaDocRef = db.collection('rifas').doc(raffle_id);

            await db.runTransaction(async (transaction) => {
                const rifaDoc = await transaction.get(rifaDocRef);
                if (!rifaDoc.exists) throw new Error(`Rifa ${raffle_id} não encontrada!`);

                const rifaData = rifaDoc.data();
                const alreadyTaken = selected_numbers.filter(num => rifaData[num]);

                if (alreadyTaken.length > 0) {
                    throw new Error(`Números já ocupados: ${alreadyTaken.join(', ')}`);
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
                    console.log("Adicionando vendorId ao objeto a ser salvo:", vendor_id);
                } else {
                    console.log("Nenhum vendorId encontrado para salvar.");
                }

                const updates = {};
                selected_numbers.forEach(number => {
                    updates[number] = dataToSave;
                });

                transaction.update(rifaDocRef, updates);
            });

            console.log(`SUCESSO: Transação concluída para ${user_name}. Vendedor: ${vendor_id || 'Nenhum'}`);
        } else {
            console.log(`Pagamento ${paymentId} não está aprovado ou não contém metadata. Status: ${paymentInfo.status}`);
        }
    } catch (error) {
        console.error("ERRO no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
