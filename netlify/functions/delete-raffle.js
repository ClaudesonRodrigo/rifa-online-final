// netlify/functions/delete-raffle.js

const admin = require('firebase-admin');

// Inicializa o Firebase Admin (reutilizando a lógica que já temos)
function initializeFirebaseAdmin() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error("A chave de serviço do Firebase não está configurada.");
    }
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    return admin.firestore();
}

// Função para apagar uma coleção inteira em lotes
async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
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
        deleteQueryBatch(db, query, resolve);
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
            return { statusCode: 400, body: 'O ID da rifa é obrigatório.' };
        }

        const db = initializeFirebaseAdmin();
        const raffleRef = db.collection('rifas').doc(raffleId);
        
        // Apaga a subcoleção 'sold_numbers'
        await deleteCollection(db, `rifas/${raffleId}/sold_numbers`, 100);

        // Apaga o documento principal da rifa
        await raffleRef.delete();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Rifa ${raffleId} e todos os seus dados foram apagados com sucesso.` }),
        };

    } catch (error) {
        console.error("Erro ao apagar rifa:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao apagar a rifa: ${error.message}` }),
        };
    }
};
