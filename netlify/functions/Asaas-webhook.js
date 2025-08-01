// netlify/functions/asaas-webhook.js

const admin = require('./firebase-admin-config');
const db = admin.firestore();

exports.handler = async (event) => {
    // 1. Apenas aceita requisições POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Segurança: Verifica se a notificação veio da Asaas (opcional, mas recomendado)
        // No painel da Asaas, você pode configurar um Token de Autenticação para o webhook.
        // Se você configurar lá, descomente o código abaixo e crie a variável de ambiente.
        /*
        const authToken = event.headers['asaas-webhook-token'];
        if (!authToken || authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
            console.warn('Webhook com token inválido recebido.');
            return { statusCode: 401, body: 'Unauthorized' };
        }
        */

        const notification = JSON.parse(event.body);

        // 3. Verifica se o evento é uma cobrança recebida
        if (notification.event === 'PAYMENT_RECEIVED') {
            const payment = notification.payment;

            // 4. Pega a nossa "etiqueta" de volta
            const externalData = JSON.parse(payment.externalReference);

            const { raffleId, selectedNumbers, payerData } = externalData;
            
            const playerDataToSave = {
                userId: payerData.userId,
                name: payerData.name,
                email: payerData.email,
                whatsapp: payerData.whatsapp,
                pix: payerData.pix,
                vendorId: payerData.vendorId || null,
                createdAt: new Date()
            };
            
            // 5. Salva os números no Firestore
            const soldNumbersRef = db.collection('rifas').doc(raffleId).collection('sold_numbers');
            const batch = db.batch();

            selectedNumbers.forEach(number => {
                const docRef = soldNumbersRef.doc(String(number)); // Garante que o número seja string
                batch.set(docRef, playerDataToSave);
            });
            
            const raffleRef = db.collection('rifas').doc(raffleId);
            const increment = selectedNumbers.length;
            batch.update(raffleRef, { soldCount: admin.firestore.FieldValue.increment(increment) });

            await batch.commit();
            console.log(`SUCESSO: Números ${selectedNumbers.join(', ')} para o sorteio ${raffleId} salvos via webhook.`);
        }

    } catch (error) {
        console.error("Erro no webhook da Asaas:", error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
    
    // 6. Responde à Asaas que recebemos a notificação com sucesso
    return { statusCode: 200, body: 'OK' };
};
