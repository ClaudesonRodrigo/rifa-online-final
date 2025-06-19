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

        console.log(`Pagamento aprovado! A guardar números: ${selected_numbers.join(', ')} para o utilizador: ${user_data.name} na rifa ${raffle_id}`);

        // 5. Guarda os números no documento correto da rifa usando o Firebase Admin
        const rifaDocRef = db.collection('rifas').doc(raffle_id);
        
        const updates = {};
        selected_numbers.forEach(number => {
          updates[number] = { ...user_data };
        });

        // Usa 'update' para adicionar/sobrescrever os campos dos números no documento
        await rifaDocRef.update(updates);

        console.log('Números guardados com sucesso no Firestore!');
      }

    } catch (error) {
      console.error("Erro ao processar o webhook do Mercado Pago:", error);
      // Retorna um erro para que o Mercado Pago possa tentar notificar novamente mais tarde
      return { statusCode: 500, body: 'Erro interno do servidor.' };
    }
  }

  // 6. Responde ao Mercado Pago com sucesso (200) para que ele saiba que recebemos o aviso
  return {
    statusCode: 200,
    body: 'Webhook recebido.',
  };
};
