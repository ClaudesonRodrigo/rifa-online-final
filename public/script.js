// public/script.js

// ✅ Importa a instância 'app' do nosso novo módulo central.
import { app } from './firebase-init.js';
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- INICIALIZAÇÃO ---
// ✅ O 'app' já vem inicializado, só precisamos usar os serviços.
const db = getFirestore(app);
const auth = getAuth(app);
const rafflesCollectionRef = collection(db, "rifas");

// --- ELEMENTOS DO DOM ---
const rafflesContainer = document.getElementById('raffles-container');

// --- LÓGICA PRINCIPAL ---
function listenToActiveRaffles() {
    const q = query(rafflesCollectionRef, where("status", "==", "active"));

    onSnapshot(q, (snapshot) => {
        if(!rafflesContainer) return;
        rafflesContainer.innerHTML = '';
        if (snapshot.empty) {
            rafflesContainer.innerHTML = `
                <div class="text-center md:col-span-2 lg:col-span-3 py-10">
                    <p class="text-xl text-gray-500">Nenhuma rifa ativa no momento. Volte em breve!</p>
                </div>`;
            return;
        }

        const sortedRaffles = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));

        sortedRaffles.forEach(doc => {
            const raffle = doc.data();
            const raffleId = doc.id;
            
            const card = document.createElement('a');
            card.href = `/rifa.html?id=${raffleId}`;
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
        if(rafflesContainer) rafflesContainer.innerHTML = `<p class="text-red-400">Erro ao carregar as rifas. Verifique as regras de segurança do seu banco de dados.</p>`;
    });
}

// --- INÍCIO ---
async function main() {
    try {
        await signInAnonymously(auth);
        console.log("Página principal autenticada anonimamente.");
        listenToActiveRaffles();
    } catch (error) {
        console.error("Falha na autenticação da página principal:", error);
        if(rafflesContainer) rafflesContainer.innerHTML = `<p class="text-red-400">Erro de autenticação. Não foi possível carregar as rifas.</p>`;
    }
}

main();
