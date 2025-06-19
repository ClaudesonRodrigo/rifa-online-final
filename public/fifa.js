import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = { /* ... a sua configuração do Firebase ... */ };

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- LÓGICA PRINCIPAL ---

// 1. Obtém o ID da rifa a partir da URL
const urlParams = new URLSearchParams(window.location.search);
const raffleId = urlParams.get('id');

if (!raffleId) {
    // Se não houver ID, redireciona para a página inicial
    window.location.href = '/';
} else {
    // Se houver um ID, referencia o documento correto no Firestore
    const rifaDocRef = doc(db, "rifas", raffleId);
    
    // O resto da lógica da página é muito semelhante à que já tínhamos,
    // mas todas as operações (leitura, escrita) agora usam 'rifaDocRef'.
    
    // Exemplo de como carregar os dados:
    // onSnapshot(rifaDocRef, (doc) => { ... });
    
    // TODO: Mover a lógica do antigo 'script.js' para aqui,
    // adaptando-a para usar o 'raffleId' e 'rifaDocRef'.
    
    // Por enquanto, apenas para demonstração:
    const loadingSection = document.getElementById('loading-section');
    onSnapshot(rifaDocRef, (doc) => {
        if (doc.exists()) {
            const raffleData = doc.data();
            document.getElementById('raffle-title').textContent = raffleData.name;
            // E aqui chamaria a lógica para renderizar a grade de números...
            loadingSection.textContent = `Página da Rifa: ${raffleData.name}`;
        } else {
            loadingSection.textContent = 'Rifa não encontrada.';
        }
    });
}
