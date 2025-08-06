// netlify/functions/payment-webhook.js - VERSÃO DE PRODUÇÃO

const admin = require('firebase-admin');

function initializeFirebaseAdmin() {
    if (admin.apps.length) { return admin.firestore(); }
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
}

exports.handler = async function(event) {
    // Responde a testes de 'saúde' do Asaas
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: 'Endpoint ativo. Apenas requisições POST são processadas.' };
    }

    const db = initializeFirebaseAdmin();
    
    try {
        const notification = JSON.parse(event.body);
        if (notification.event !== 'PAYMENT_CONFIRMED' && notification.event !== 'PAYMENT_RECEIVED') {
            return { statusCode: 200, body: 'Notificação não relevante.' };
        }
        
        const paymentInfo = notification.payment;
        const externalReference = paymentInfo.externalReference;

        if (!externalReference) {
            console.warn("Webhook recebido sem externalReference.");
            return { statusCode: 400, body: 'externalReference ausente.' };
        }

        const pendingDocRef = db.collection('pending_payments').doc(externalReference);
        const pendingDoc = await pendingDocRef.get();
        if (!pendingDoc.exists) {
            console.error(`Documento pendente não encontrado: ${externalReference}`);
            return { statusCode: 404, body: 'Registro de compra não encontrado.' };
        }

        const purchaseData = pendingDoc.data();
        const {
            selected_numbers, raffle_id, user_id, user_name,
            user_email, user_whatsapp, user_pix, vendor_id
        } = purchaseData;

        const rifaDocRef = db.collection('rifas').doc(raffle_id);
        const soldNumbersColRef = rifaDocRef.collection('sold_numbers');

        await db.runTransaction(async (transaction) => {
            const numberDocsPromises = selected_numbers.map(num => transaction.get(soldNumbersColRef.doc(String(num))));
            const numberDocs = await Promise.all(numberDocsPromises);
            
            for (const doc of numberDocs) { if (doc.exists) { return; } }

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

        await pendingDocRef.delete();

    } catch (error) {
        console.error("ERRO no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook processado com sucesso.' };
};
