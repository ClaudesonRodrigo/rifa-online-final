// netlify/functions/delete-raffle.js - Versão Correta para o projeto rifa-online-final
const admin = require('./firebase-admin-config');
const db = admin.firestore();

// Função para inicializar o Firebase Admin
function initializeFirebaseAdmin() {
    // Evita que o app seja inicializado mais de uma vez se a função for chamada "a quente"
    if (admin.apps.length) {
        return;
    }
    // Pega a chave da variável de ambiente e decodifica
    const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
    // Inicializa o Firebase
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

// Função para apagar uma coleção inteira em lotes
async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, db).catch(reject);
    });
}

async function deleteQueryBatch(query, resolve, db) {
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
        deleteQueryBatch(query, resolve, db);
    });
}

// Handler principal da função Netlify
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { raffleId } = JSON.parse(event.body);
        if (!raffleId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'O ID do sorteio é obrigatório.' }) };
        }

        // Garante que o Firebase Admin está inicializado
        initializeFirebaseAdmin();
        const db = admin.firestore();
        
        const raffleRef = db.collection('rifas').doc(raffleId);
        
        // Apaga a subcoleção 'sold_numbers'
        await deleteCollection(db, `rifas/${raffleId}/sold_numbers`, 100);

        // Apaga a subcoleção 'vendors' (se existir)
        await deleteCollection(db, `rifas/${raffleId}/vendors`, 100);

        // Apaga o documento principal do sorteio
        await raffleRef.delete();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Sorteio ${raffleId} e todos os seus dados foram apagados com sucesso.` }),
        };

    } catch (error) {
        console.error("Erro ao apagar sorteio:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao apagar o sorteio: ${error.message}` }),
        };
    }
};
