import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
function initializeAdminApp() {
    // --- INICIALIZAÇÃO DOS SERVIÇOS ---
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const rafflesCollectionRef = collection(db, "rifas");

    // --- ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const adminEmailDisplay = document.getElementById('admin-email-display');
    const createRaffleBtn = document.getElementById('create-raffle-btn');
    const raffleNameInput = document.getElementById('raffle-name');
    const rafflePriceInput = document.getElementById('raffle-price');
    const rafflesListEl = document.getElementById('raffles-list');
    const raffleDetailsSection = document.getElementById('raffle-details-section');
    const detailsRaffleName = document.getElementById('details-raffle-name');
    const soldNumbersEl = document.getElementById('sold-numbers');
    const totalParticipantsEl = document.getElementById('total-participants');
    const totalRevenueEl = document.getElementById('total-revenue');
    const participantsTableBody = document.getElementById('participants-table-body');
    const searchInput = document.getElementById('search-input');
    const declareWinnerArea = document.getElementById('declare-winner-area');
    const winningNumberInput = document.getElementById('winning-number-input');
    const declareWinnerBtn = document.getElementById('declare-winner-btn');
    const winnerInfoAdmin = document.getElementById('winner-info-admin');
    const adminWinnerNumber = document.getElementById('admin-winner-number');
    const adminWinnerName = document.getElementById('admin-winner-name');
    const adminWinnerContact = document.getElementById('admin-winner-contact');
    const adminWinnerPix = document.getElementById('admin-winner-pix');
    const noWinnerInfoAdmin = document.getElementById('no-winner-info-admin');

    // --- ESTADO GLOBAL ---
    let currentRaffleId = null;
    let allRafflesUnsubscribe = null; // **NOVO**: para o "ouvido" da lista de rifas
    let currentRaffleUnsubscribe = null;
    let rawRifaData = {};

    // --- LÓGICA DE AUTENTICAÇÃO SEGURA ---
    const handleAuthState = (user) => {
        if (user) {
            loginScreen.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            adminEmailDisplay.textContent = `Logado como: ${user.email}`;
            listenToAllRaffles();
        } else {
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    };

    const handleLogin = async () => {
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Erro no login:", error.code);
            loginError.classList.remove('hidden');
        }
    };

    // **LÓGICA DE LOGOUT CORRIGIDA**
    const handleLogout = () => {
        // Primeiro, "desliga os ouvidos" para evitar erros de permissão
        if (allRafflesUnsubscribe) {
            allRafflesUnsubscribe();
        }
        if (currentRaffleUnsubscribe) {
            currentRaffleUnsubscribe();
        }
        // Só depois faz o logout
        signOut(auth);
    };

    // --- LÓGICA DE GESTÃO DE RIFAS ---
    const createRaffle = async () => { /* ... código sem alterações ... */ };
    const deleteRaffle = async (raffleId, raffleName) => { /* ... código sem alterações ... */ };
    
    function listenToAllRaffles() {
        // Se já existe um "ouvido" para a lista, desliga-o antes de criar um novo
        if (allRafflesUnsubscribe) {
            allRafflesUnsubscribe();
        }
        // Guarda a referência da função de "desligar"
        allRafflesUnsubscribe = onSnapshot(rafflesCollectionRef, (snapshot) => {
            if(!rafflesListEl) return;
            rafflesListEl.innerHTML = '';
            if (snapshot.empty) {
                rafflesListEl.innerHTML = '<p class="text-gray-500">Nenhuma rifa criada.</p>';
                return;
            }
            const sortedRaffles = snapshot.docs.sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));
            sortedRaffles.forEach(doc => {
                const raffle = doc.data();
                const el = document.createElement('div');
                el.className = `p-3 bg-gray-700 rounded-lg flex justify-between items-center ${doc.id === currentRaffleId ? 'ring-2 ring-blue-400' : ''} ${raffle.status === 'finished' ? 'opacity-60' : ''}`;
                el.innerHTML = `
                    <div class="flex-grow cursor-pointer" data-id="${doc.id}" data-name="${raffle.name}">
                        <p class="font-semibold">${raffle.name}</p>
                        <p class="text-xs text-gray-400">Status: ${raffle.status}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span>
                        <button title="Excluir Rifa" data-id="${doc.id}" data-name="${raffle.name}" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button>
                    </div>`;
                rafflesListEl.appendChild(el);
            });
        });
    }

    // A função 'selectRaffle' e as outras continuam iguais
    function selectRaffle(raffleId, raffleName) { /* ... */ }
    function processRifaData(data) { /* ... */ }
    function renderTable(data) { /* ... */ }
    function updateSummary(sold, parts, price = 0) { /* ... */ }
    async function declareWinner() { /* ... */ }
    function showWinnerInAdminPanel(info) { /* ... */ }
    function handleSearch() { /* ... */ }

    // --- EVENT LISTENERS ---
    if(loginBtn) loginBtn.addEventListener('click', handleLogin);
    if(adminPasswordInput) adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if(createRaffleBtn) createRaffleBtn.addEventListener('click', createRaffle);
    if(declareWinnerBtn) declareWinnerBtn.addEventListener('click', declareWinner);
    if(searchInput) searchInput.addEventListener('input', handleSearch);
    
    if(rafflesListEl) rafflesListEl.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-raffle-btn');
        if (deleteBtn) {
            e.stopPropagation();
            deleteRaffle(deleteBtn.dataset.id, deleteBtn.dataset.name);
            return;
        }
        
        const infoEl = e.target.closest('.flex-grow[data-id]');
        if (infoEl) {
            selectRaffle(infoEl.dataset.id, infoEl.dataset.name);
        }
    });

    // --- INICIALIZAÇÃO ---
    onAuthStateChanged(auth, handleAuthState);
}

// Inicia todo o script apenas quando a página estiver completamente carregada
document.addEventListener('DOMContentLoaded', initializeAdminApp);

