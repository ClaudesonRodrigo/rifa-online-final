// Importa o SDK do Mercado Pago para verificar o pagamento
import { MercadoPagoConfig, Payment } from 'mercadopago';
// Importa o Firebase Admin para poder escrever no banco de dados com segurança
import admin from 'firebase-admin';

// --- Configuração do Firebase Admin ---
// Pegamos as credenciais seguras que vamos configurar na Netlify
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa o app do Firebase Admin, se ainda não foi inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// --- Handler da Função ---
exports.handler = async function(event) {
  // O corpo do aviso do Mercado Pago vem como uma string
  const body = JSON.parse(event.body);

  // 1. Verificamos se o aviso é sobre um pagamento
  if (body.type === 'payment') {
    const paymentId = body.data.id;

    console.log(`Recebido webhook para o pagamento ID: ${paymentId}`);

    try {
      // 2. Configura o cliente do Mercado Pago para verificar a informação
      const client = new MercadoPagoConfig({ 
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
      });
      const payment = new Payment(client);
      
      // 3. Busca os detalhes completos do pagamento no Mercado Pago
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('Status do Pagamento:', paymentInfo.status);

      // 4. Se o pagamento foi aprovado e tem os nossos dados (metadata)
      if (paymentInfo.status === 'approved' && paymentInfo.metadata) {
        const { user_data, selected_numbers } = paymentInfo.metadata;

        console.log(`Pagamento aprovado! Salvando números: ${selected_numbers.join(', ')} para o utilizador: ${user_data.name}`);

        // 5. Salva os números no banco de dados usando o Firebase Admin
        const rifaDocRef = db.collection('rifas').doc('rifa-100');
        
        const updates = {};
        selected_numbers.forEach(number => {
          // A sintaxe [number] usa o valor da variável (ex: "05") como a chave do campo
          updates[number] = { ...user_data };
        });

        // Usa 'update' para adicionar os novos campos ao documento existente
        await rifaDocRef.update(updates);

        console.log('Números salvos com sucesso no Firestore!');
      }

    } catch (error) {
      console.error("Erro ao processar o webhook do Mercado Pago:", error);
      // Retorna um erro para que o Mercado Pago possa tentar novamente mais tarde
      return { statusCode: 500, body: 'Erro interno do servidor.' };
    }
  }

  // 6. Responde ao Mercado Pago com sucesso (200) para que ele saiba que recebemos o aviso
  return {
    statusCode: 200,
    body: 'Webhook recebido.',
  };
};
