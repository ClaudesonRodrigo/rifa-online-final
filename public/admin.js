import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = { /* ... a sua configuração do Firebase ... */ };
const ADMIN_PASSWORD = "Cariocaju@2025";

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rafflesCollectionRef = collection(db, "rifas"); // Agora trabalhamos com a coleção inteira

// --- ELEMENTOS DO DOM ---
// ... (elementos de login)
const createRaffleBtn = document.getElementById('create-raffle-btn');
const raffleNameInput = document.getElementById('raffle-name');
const rafflePriceInput = document.getElementById('raffle-price');
const rafflesListEl = document.getElementById('raffles-list');
const raffleDetailsSection = document.getElementById('raffle-details-section');
const detailsRaffleName = document.getElementById('details-raffle-name');
// ... (outros elementos do painel de detalhes)

let currentRaffleId = null; // Guarda o ID da rifa selecionada
let currentRaffleUnsubscribe = null; // Para parar de ouvir a rifa anterior

// --- LÓGICA DE GESTÃO DE RIFAS ---

async function createRaffle() {
    const name = raffleNameInput.value.trim();
    const price = parseFloat(rafflePriceInput.value);

    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor, preencha o nome do prémio e um preço válido.");
        return;
    }

    try {
        // Adiciona um novo documento à coleção 'rifas'
        await addDoc(rafflesCollectionRef, {
            name: name,
            pricePerNumber: price,
            createdAt: new Date(),
            status: 'active' // active, finished
        });
        alert(`Rifa "${name}" criada com sucesso!`);
        raffleNameInput.value = '';
        rafflePriceInput.value = '';
    } catch (error) {
        console.error("Erro ao criar rifa:", error);
        alert("Ocorreu um erro ao criar a rifa.");
    }
}

function listenToAllRaffles() {
    onSnapshot(rafflesCollectionRef, (snapshot) => {
        rafflesListEl.innerHTML = '';
        if (snapshot.empty) {
            rafflesListEl.innerHTML = '<p class="text-gray-500">Nenhuma rifa criada ainda.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const raffle = doc.data();
            const raffleEl = document.createElement('div');
            raffleEl.className = 'p-3 bg-gray-700 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-600';
            raffleEl.innerHTML = `
                <div>
                    <p class="font-semibold">${raffle.name}</p>
                    <p class="text-xs text-gray-400">Status: ${raffle.status}</p>
                </div>
                <span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span>
            `;
            raffleEl.onclick = () => selectRaffle(doc.id, raffle.name);
            rafflesListEl.appendChild(raffleEl);
        });
    });
}

function selectRaffle(raffleId, raffleName) {
    currentRaffleId = raffleId;
    detailsRaffleName.textContent = raffleName;
    raffleDetailsSection.classList.remove('hidden');

    // Se já estiver a ouvir uma rifa, cancela a subscrição para não carregar dados misturados
    if (currentRaffleUnsubscribe) {
        currentRaffleUnsubscribe();
    }

    const selectedRaffleDocRef = doc(db, "rifas", currentRaffleId);
    
    // Ouve em tempo real apenas os dados da rifa selecionada
    currentRaffleUnsubscribe = onSnapshot(selectedRaffleDocRef, (doc) => {
        const raffleData = doc.data() || {};
        // Aqui chamamos as funções que já tínhamos para processar e exibir os dados
        // (processRifaData, renderTable, updateSummary)
        // Precisam ser adaptadas para estarem dentro deste contexto.
    });
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---
// ... (código de login e autenticação anónima)
createRaffleBtn.addEventListener('click', createRaffle);
// ...

async function initializeAdmin() {
    try {
        await signInAnonymously(auth);
        checkLogin();
    } catch (error) {
        // ...
    }
}

function checkLogin() {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        listenToAllRaffles(); // Inicia ouvindo a lista de rifas
    }
}
//... (resto do ficheiro)
