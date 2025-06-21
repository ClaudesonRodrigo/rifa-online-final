import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// --- Função de Inicialização Segura ---
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

// --- Handler da Função ---
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
            // Lemos os dados "planos" do metadata para garantir que nada se perde.
            const {
                selected_numbers,
                raffle_id,
                user_id,
                user_name,
                user_email,
                user_whatsapp,
                user_pix
            } = paymentInfo.metadata;

            if (!raffle_id || !user_id) {
                console.error("ERRO CRÍTICO: ID da rifa ou do utilizador em falta no metadata.");
                return { statusCode: 400, body: 'Dados essenciais em falta.' };
            }

            const rifaDocRef = db.collection('rifas').doc(raffle_id);

            // Executa a operação como uma transação segura
            await db.runTransaction(async (transaction) => {
                const rifaDoc = await transaction.get(rifaDocRef);
                if (!rifaDoc.exists) throw new Error(`Rifa ${raffle_id} não encontrada!`);

                const rifaData = rifaDoc.data();
                const alreadyTaken = selected_numbers.filter(num => rifaData[num]);

                if (alreadyTaken.length > 0) {
                    throw new Error(`Números já ocupados: ${alreadyTaken.join(', ')}`);
                }

                // Reconstrói o objeto do utilizador com todos os dados
                const dataToSave = {
                    name: user_name,
                    email: user_email,
                    whatsapp: user_whatsapp,
                    pix: user_pix,
                    userId: user_id,
                    createdAt: new Date() // Adiciona a data da compra
                };

                const updates = {};
                selected_numbers.forEach(number => {
                    updates[number] = dataToSave;
                });

                transaction.update(rifaDocRef, updates);
            });

            console.log(`SUCESSO: Transação concluída para ${user_name}.`);
        }
    } catch (error) {
        console.error("ERRO no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno: ${error.message}` };
    }

    return { statusCode: 200, body: 'Webhook recebido com sucesso.' };
};
