// netlify/functions/firebase-admin-config.js

const admin = require('firebase-admin');

// Só inicializa o app se ele ainda não foi inicializado
if (!admin.apps.length) {
  // Decodifica a chave de serviço que está em Base64 nas variáveis de ambiente
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Exporta a instância do admin já inicializada
module.exports = admin;
