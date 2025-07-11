// public/script.js (Atualizado para exibir a barra de progresso)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { app } from './firebase-init.js';

const db = getFirestore(app);
const auth = getAuth(app);
const rafflesCollectionRef = collection(db, "rifas");

const rafflesContainer = document.getElementById('raffles-container');

function listenToActiveRaffles() {
    const q = query(rafflesCollectionRef, where("status", "==", "active"));

    onSnapshot(q, (snapshot) => {
        if(!rafflesContainer) return;
        
        if (snapshot.empty) {
            rafflesContainer.innerHTML = `<div class="text-center col-span-full bg-gray-800 p-8 rounded-lg"><p class="text-gray-400">Nenhuma rifa ativa no momento. Volte em breve!</p></div>`;
            return;
        }
        
        rafflesContainer.innerHTML = ''; 

        const sortedRaffles = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));

        sortedRaffles.forEach(doc => {
            const raffle = doc.data();
            const raffleId = doc.id;
            
            // ✅ NOVA LÓGICA: Calcula a porcentagem
            const soldCount = raffle.soldCount || 0;
            let totalNumbers = 100; // Padrão para 'dezena'
            if (raffle.type === 'centena') totalNumbers = 1000;
            if (raffle.type === 'milhar') totalNumbers = 10000;
            const percentage = totalNumbers > 0 ? Math.round((soldCount / totalNumbers) * 100) : 0;

            const card = document.createElement('a');
            card.href = `/rifa.html?id=${raffleId}`;
            card.className = 'raffle-card bg-gray-800 rounded-lg p-6 flex flex-col justify-between transition-all duration-300 hover:ring-2 hover:ring-teal-400 hover:scale-105';
            
            // ✅ NOVA LÓGICA: Template HTML com a barra de progresso
            card.innerHTML = `
                <div>
                    <h2 class="text-2xl font-bold text-yellow-400 mb-2 truncate">${raffle.name}</h2>
                    <p class="text-gray-400 mb-4">Participe e concorra a este prémio incrível!</p>
                    
                    <div class="w-full bg-gray-700 rounded-full h-2.5 mb-1">
                        <div class="bg-teal-400 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <div class="text-right text-xs text-gray-400 mb-4">${soldCount} / ${totalNumbers} vendidos (${percentage}%)</div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <span class="text-xl font-bold text-white">${(raffle.pricePerNumber || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span class="bg-teal-500 text-white font-bold px-4 py-2 rounded-md">Participar</span>
                </div>
            `;
            
            rafflesContainer.appendChild(card);
        });
    }, (error) => {
        console.error("Erro ao buscar rifas:", error);
        if(rafflesContainer) rafflesContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">Erro ao carregar as rifas. Tente recarregar a página.</p>`;
    });
}

async function main() {
    try {
        await signInAnonymously(auth);
        listenToActiveRaffles();
    } catch (error) {
        console.error("Falha na autenticação da página principal:", error);
        if(rafflesContainer) rafflesContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">Erro de autenticação. Não foi possível carregar as rifas.</p>`;
    }
}

main();
