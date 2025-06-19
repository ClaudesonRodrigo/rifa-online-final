import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// --- Configuração do Firebase Admin ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// --- Handler da Função ---
exports.handler = async function(event) {
  const body = JSON.parse(event.body);

  if (body.type === 'payment') {
    const paymentId = body.data.id;
    console.log(`Webhook recebido para o pagamento ID: ${paymentId}`);

    try {
      const client = new MercadoPagoConfig({ 
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
      });
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('Status do Pagamento do MP:', paymentInfo.status);

      if (paymentInfo.status === 'approved' && paymentInfo.metadata) {
        // **LÓGICA CORRIGIDA**: Capturamos o user_id separadamente para garantir que ele existe.
        const { user_data, selected_numbers, raffle_id, user_id } = paymentInfo.metadata;

        if (!raffle_id) {
            console.error("Erro Crítico: ID da rifa não encontrado no metadata do pagamento.");
            return { statusCode: 400, body: 'ID da rifa em falta.' };
        }
        if (!user_id) {
            console.error("Erro Crítico: ID do utilizador não encontrado no metadata do pagamento.");
            return { statusCode: 400, body: 'ID do utilizador em falta.' };
        }

        const rifaDocRef = db.collection('rifas').doc(raffle_id);

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
                // **LÓGICA CORRIGIDA**: Garantimos que o userId está sempre presente no objeto a ser guardado.
                updates[number] = { ...user_data, userId: user_id };
            });

            transaction.update(rifaDocRef, updates);
        });

        console.log(`Transação bem-sucedida para o utilizador ${user_data.name}. Números: ${selected_numbers.join(', ')}`);
      }

    } catch (error) {
      console.error("Erro ao processar o webhook do Mercado Pago ou na transação do Firestore:", error);
      return { statusCode: 500, body: 'Erro interno do servidor ao processar o pagamento.' };
    }
  }

  return {
    statusCode: 200,
    body: 'Webhook recebido com sucesso.',
  };
};
