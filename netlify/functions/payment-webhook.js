// netlify/functions/payment-webhook.js

const admin = require('firebase-admin');

<<<<<<< HEAD
// Função para inicializar o Firebase Admin
=======
>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
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
<<<<<<< HEAD

        // O evento que nos interessa é a confirmação do pagamento
        if (notification.event !== 'PAYMENT_CONFIRMED' && notification.event !== 'PAYMENT_RECEIVED') {
            return { statusCode: 200, body: 'Notificação não relevante, ignorada.' };
        }
        
        const paymentInfo = notification.payment;
        const { metadata } = paymentInfo;

        if (!metadata || !metadata.raffle_id || !metadata.user_id || !metadata.selected_numbers) {
            console.warn("Webhook Asaas recebido com metadados insuficientes.", metadata);
            return { statusCode: 400, body: 'Dados essenciais em falta nos metadados do pagamento.' };
        }

        const {
            selected_numbers,
            raffle_id,
            user_id,
            user_name,
            user_email,
            user_whatsapp,
            user_pix,
            vendor_id
        } = metadata;
=======
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
>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5

        const rifaDocRef = db.collection('rifas').doc(raffle_id);
        const soldNumbersColRef = rifaDocRef.collection('sold_numbers');

<<<<<<< HEAD
        // Usamos uma transação para garantir que os números não sejam vendidos duas vezes
        await db.runTransaction(async (transaction) => {
            const numberDocsPromises = selected_numbers.map(num => transaction.get(soldNumbersColRef.doc(num)));
            const numberDocs = await Promise.all(numberDocsPromises);
            
            for (const doc of numberDocs) {
                if (doc.exists) {
                    // Se o número já foi comprado, registramos um log e pulamos o resto
                    console.error(`TENTATIVA DE COMPRA DUPLA: O número ${doc.id} na rifa ${raffle_id} já foi vendido.`);
                    return; // Aborta a transação para este pagamento
                }
            }

            const dataToSave = {
                name: user_name,
                email: user_email,
                whatsapp: user_whatsapp,
                pix: user_pix,
                userId: user_id,
                createdAt: new Date(),
                paymentProvider: 'asaas',
                paymentId: paymentInfo.id
            };
            
            if (vendor_id) {
                dataToSave.vendorId = vendor_id;
            }

            selected_numbers.forEach(number => {
                const newNumberDocRef = soldNumbersColRef.doc(number);
                transaction.set(newNumberDocRef, dataToSave);
            });

            // Incrementa o contador de vendidos no documento principal
=======
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

>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
            const increment = admin.firestore.FieldValue.increment(selected_numbers.length);
            transaction.update(rifaDocRef, { soldCount: increment });
        });

<<<<<<< HEAD
=======
        await pendingDocRef.delete();

>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
    } catch (error) {
        console.error("ERRO no processamento do webhook Asaas:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

<<<<<<< HEAD
    // Responda ao Asaas com status 200 para confirmar o recebimento.
    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
=======
    return { statusCode: 200, body: 'Webhook processado com sucesso.' };
};
>>>>>>> a96fbd2d0cf8e874b1b6021a433c1baf41330ec5
