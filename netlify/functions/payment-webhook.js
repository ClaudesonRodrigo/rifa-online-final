import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// --- Configuração do Firebase Admin ---
// As credenciais são obtidas de forma segura das variáveis de ambiente da Netlify
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa a aplicação do Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// --- Handler da Função (o que a Netlify executa) ---
exports.handler = async function(event) {
  // O corpo do aviso do Mercado Pago vem como uma string JSON
  const body = JSON.parse(event.body);

  // 1. Verificamos se o aviso é sobre um pagamento
  if (body.type === 'payment') {
    const paymentId = body.data.id;

    console.log(`Webhook recebido para o pagamento ID: ${paymentId}`);

    try {
      // 2. Configura o cliente do Mercado Pago para obter os detalhes do pagamento
      const client = new MercadoPagoConfig({ 
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
      });
      const payment = new Payment(client);
      
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('Status do Pagamento do MP:', paymentInfo.status);

      // 4. Se o pagamento foi aprovado e contém os nossos dados personalizados (metadata)
      if (paymentInfo.status === 'approved' && paymentInfo.metadata) {
        const { user_data, selected_numbers, raffle_id } = paymentInfo.metadata;

        if (!raffle_id) {
            console.error("Erro: ID da rifa não encontrado no metadata do pagamento.");
            return { statusCode: 400, body: 'ID da rifa em falta.' };
        }

        const rifaDocRef = db.collection('rifas').doc(raffle_id);

        // Lógica de Transação Segura para evitar venda duplicada
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
                updates[number] = { ...user_data };
            });

            transaction.update(rifaDocRef, updates);
        });

        console.log(`Transação bem-sucedida para o utilizador ${user_data.name}. Números: ${selected_numbers.join(', ')}`);
      }

    } catch (error) {
      console.error("Erro ao processar o webhook do Mercado Pago ou na transação do Firestore:", error);
      return { statusCode: 500, body: 'Erro interno do servidor.' };
    }
  }

  // 6. Responde ao Mercado Pago com sucesso (200) para que ele saiba que recebemos o aviso
  return {
    statusCode: 200,
    body: 'Webhook recebido.',
  };
};
