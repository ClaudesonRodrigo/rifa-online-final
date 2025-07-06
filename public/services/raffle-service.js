// public/services/raffle-service.js

// Importa o necessário do Firebase e do nosso módulo de inicialização
import { app } from '../firebase-init.js';
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const db = getFirestore(app);
const settingsDocRef = doc(db, "settings", "generalRules");

/**
 * Fica a "ouvir" as atualizações de uma rifa específica no Firestore.
 * @param {string} raffleId - O ID da rifa a ser observada.
 * @param {function} onUpdate - A função a ser chamada sempre que os dados da rifa mudarem.
 * @returns A função de 'unsubscribe' para parar de ouvir as atualizações.
 */
export function listenToRaffleUpdates(raffleId, onUpdate) {
    const rifaDocRef = doc(db, "rifas", raffleId);
    // O onSnapshot devolve uma função que, quando chamada, para de ouvir o listener.
    return onSnapshot(rifaDocRef, (doc) => {
        if (!doc.exists()) {
            onUpdate(null); // Envia null se a rifa não existir
            return;
        }
        onUpdate(doc.data()); // Envia os dados da rifa para a função de callback
    }, (error) => {
        console.error("Erro no listener do Firestore:", error);
        onUpdate(null, error); // Envia um erro se algo falhar
    });
}

/**
 * Busca as regras gerais do sorteio no Firestore.
 * @returns {Promise<string>} O texto das regras.
 */
export async function getRules() {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists() && docSnap.data().text) {
            return docSnap.data().text;
        }
        return 'Nenhuma regra geral foi definida pelo administrador.';
    } catch (error) {
        console.error("Erro ao buscar regras:", error);
        return 'Não foi possível carregar as regras.';
    }
}

/**
 * Chama a Netlify Function para gerar o link de pagamento do Mercado Pago.
 * @param {object} paymentData - Dados necessários para o pagamento.
 * @returns {Promise<object>} A resposta da função Netlify.
 */
export async function createPaymentPreference(paymentData) {
    const res = await fetch('/.netlify/functions/create-payment', { 
        method: 'POST', 
        body: JSON.stringify(paymentData) 
    });
    if (!res.ok) {
        throw new Error('Falha ao gerar link de pagamento.');
    }
    return res.json();
}

/**
 * Chama a Netlify Function para obter números da sorte do Gemini.
 * @param {string} theme - O tema para a sugestão.
 * @param {string} raffleType - O tipo da rifa ('dezena', 'centena', etc.).
 * @returns {Promise<object>} As sugestões do Oráculo.
 */
export async function getLuckyNumbersFromOracle(theme, raffleType) {
    const res = await fetch('/.netlify/functions/getLuckyNumbers', { 
        method: "POST", 
        body: JSON.stringify({ theme, raffleType })
    });
    if (!res.ok) {
        throw new Error('A resposta da função do Oráculo não foi OK.');
    }
    return res.json();
}
