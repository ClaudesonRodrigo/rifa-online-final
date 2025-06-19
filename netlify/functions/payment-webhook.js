import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// --- Função de Inicialização Segura ---
// Esta função garante que o Firebase só é inicializado uma vez.
function initializeFirebaseAdmin() {
    // Verifica se a chave de serviço existe nas variáveis de ambiente
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error("A chave de serviço do Firebase (FIREBASE_SERVICE_ACCOUNT_KEY) não está configurada na Netlify.");
    }
    // Evita erros de reinicialização em ambientes de teste
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
    console.log("-> Webhook do Mercado Pago recebido!");

    try {
        const db = initializeFirebaseAdmin();
        const body = JSON.parse(event.body);

        if (body.type !== 'payment') {
            console.log("Webhook não é do tipo 'payment'. A ignorar.");
            return { statusCode: 200, body: 'Notificação ignorada.' };
        }

        const paymentId = body.data.id;
        console.log(`PASSO 1: A processar o ID de pagamento: ${paymentId}`);

        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
            throw new Error("A chave de acesso do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) não está configurada na Netlify.");
        }

        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        console.log(`PASSO 2: Informação do pagamento obtida. Status: [${paymentInfo.status}]`);

        if (paymentInfo.status === 'approved' && paymentInfo.metadata) {
            const { user_data, selected_numbers, raffle_id } = paymentInfo.metadata;

            console.log(`PASSO 3: Pagamento aprovado. Metadata recebido para a rifa [${raffle_id}] com os números [${selected_numbers.join(', ')}]`);

            if (!raffle_id || !user_data || !user_data.userId) {
                console.error("ERRO CRÍTICO: Dados essenciais (raffle_id ou user_data.userId) em falta no metadata.");
                return { statusCode: 400, body: 'Dados da rifa ou do utilizador em falta.' };
            }

            const rifaDocRef = db.collection('rifas').doc(raffle_id);

            console.log(`PASSO 4: A iniciar transação segura no Firestore para a rifa [${raffle_id}]...`);
            
            await db.runTransaction(async (transaction) => {
                const rifaDoc = await transaction.get(rifaDocRef);
                if (!rifaDoc.exists) {
                    throw new Error(`Documento da rifa ${raffle_id} não encontrado!`);
                }

                const rifaData = rifaDoc.data();
                const alreadyTaken = selected_numbers.filter(num => rifaData[num]);
                
                if (alreadyTaken.length > 0) {
                    console.error(`FALHA NA COMPRA para o utilizador ${user_data.email}. Números já ocupados: ${alreadyTaken.join(', ')}`);
                    throw new Error(`Os números ${alreadyTaken.join(', ')} já não estão disponíveis.`);
                }

                const updates = {};
                selected_numbers.forEach(number => {
                    updates[number] = user_data;
                });

                transaction.update(rifaDocRef, updates);
                console.log(`PASSO 5: Transação preparada para atualizar ${selected_numbers.length} números.`);
            });

            console.log(`SUCESSO: Transação concluída para o utilizador ${user_data.name}.`);
        } else {
            console.log(`Pagamento com status [${paymentInfo.status}] ou sem metadata. Nenhuma ação tomada.`);
        }

    } catch (error) {
        console.error("ERRO GERAL no processamento do webhook:", error);
        return { statusCode: 500, body: `Erro interno do servidor: ${error.message}` };
    }

    return {
        statusCode: 200,
        body: 'Webhook recebido e processado.',
    };
};
