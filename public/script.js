import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// **LINHA CORRIGIDA**: O correto é 'firebase-firestore.js'
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = {
    apiKey: "AIzaSyCNFkoa4Ark8R2uzhX95NlV8Buwg2GHhvo",
    authDomain: "cemvezesmais-1ab48.firebaseapp.com",
    projectId: "cemvezesmais-1ab48",
    storageBucket: "cemvezesmais-1ab48.firebasestorage.app",
    messagingSenderId: "206492928997",
    appId: "1:206492928997:web:763cd52f3e9e91a582fd0c",
    measurementId: "G-G3BX961SHY"
};

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rafflesCollectionRef = collection(db, "rifas");

// --- ELEMENTOS DO DOM ---
const rafflesContainer = document.getElementById('raffles-container');

// --- LÓGICA PRINCIPAL ---

function listenToActiveRaffles() {
    // Cria uma consulta para buscar apenas as rifas com status 'active'
    const q = query(rafflesCollectionRef, where("status", "==", "active"));

    onSnapshot(q, (snapshot) => {
        if(!rafflesContainer) return;
        rafflesContainer.innerHTML = ''; // Limpa o container
        if (snapshot.empty) {
            rafflesContainer.innerHTML = `
                <div class="text-center md:col-span-2 lg:col-span-3">
                    <p class="text-xl text-gray-500">Nenhuma rifa ativa no momento. Volte em breve!</p>
                </div>`;
            return;
        }

        const sortedRaffles = snapshot.docs.sort((a,b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis());

        sortedRaffles.forEach(doc => {
            const raffle = doc.data();
            const raffleId = doc.id;
            
            const card = document.createElement('a');
            card.href = `/rifa.html?id=${raffleId}`; // Link para a página da rifa específica
            card.className = 'raffle-card bg-gray-800 rounded-lg p-6 flex flex-col justify-between transition-all duration-300';
            
            card.innerHTML = `
                <div>
                    <h2 class="text-2xl font-bold text-yellow-400 mb-2">${raffle.name}</h2>
                    <p class="text-gray-400 mb-4">Participe e concorra a este prémio incrível!</p>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <span class="text-xl font-bold text-white">${(raffle.pricePerNumber || 10).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span class="bg-teal-500 text-white font-bold px-4 py-2 rounded-md">Participar</span>
                </div>
            `;
            
            rafflesContainer.appendChild(card);
        });
    }, (error) => {
        console.error("Erro ao buscar rifas:", error);
        if(rafflesContainer) rafflesContainer.innerHTML = `<p class="text-red-400">Erro ao carregar as rifas.</p>`;
    });
}

// --- INÍCIO ---
listenToActiveRaffles();
