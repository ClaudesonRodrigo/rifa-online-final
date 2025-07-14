// netlify/functions/delete-raffle.js - Versão Corrigida

const admin = require('./firebase-admin-config');
const db = admin.firestore();

// Função auxiliar para apagar uma coleção inteira (necessária para os sub-dados)
async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });

  async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      return resolve();
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
      deleteQueryBatch(query, resolve);
    });
  }
}

exports.handler = async (event) => {
  // 1. Validação de segurança básica
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const { raffleId } = JSON.parse(event.body);
    if (!raffleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'O ID do sorteio (raffleId) é obrigatório' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const raffleRef = db.collection('rifas').doc(raffleId);

    // Apagar sub-coleções primeiro para não deixar dados órfãos
    await deleteCollection(`rifas/${raffleId}/sold_numbers`, 100);
    await deleteCollection(`rifas/${raffleId}/vendors`, 100); // Se você usa a gestão de revendedores

    // Agora apagar o documento principal do sorteio
    await raffleRef.delete();

    console.log(`SUCESSO: Sorteio ${raffleId} e seus sub-dados foram apagados.`);

    // 2. Resposta de sucesso em JSON
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Sorteio ${raffleId} apagado com sucesso!` }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error) {
    console.error("ERRO AO APAGAR SORTEIO:", error);

    // 3. Resposta de erro SEMPRE em JSON
    return {
      statusCode: 500,
      // Garante que a mensagem de erro esteja dentro de um objeto JSON válido
      body: JSON.stringify({ error: `Falha ao apagar o sorteio: ${error.message}` }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
