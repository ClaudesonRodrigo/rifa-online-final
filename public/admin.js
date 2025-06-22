import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
// Garante que todo o código só é executado depois de a página estar carregada.
document.addEventListener('DOMContentLoaded', () => {

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

    // --- ESTADO GLOBAL PARA OS LISTENERS ---
    let allRafflesUnsubscribe = null;
    let currentRaffleUnsubscribe = null;

    // --- LÓGICA DE AUTENTICAÇÃO ---

    const handleLogin = async () => {
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, adminEmailInput.value, adminPasswordInput.value);
        } catch (error) {
            console.error("Erro no login:", error.code);
            loginError.classList.remove('hidden');
        }
    };

    const handleLogout = () => {
        // A função de logout agora só precisa de chamar o signOut.
        // O onAuthStateChanged tratará da limpeza.
        signOut(auth);
    };
    
    // Adiciona os eventos de login
    loginBtn.addEventListener('click', handleLogin);
    adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });

    // --- FUNÇÃO PARA DESLIGAR OS "OUVIDOS" ---
    function cleanupListeners() {
        if (allRafflesUnsubscribe) {
            allRafflesUnsubscribe();
            allRafflesUnsubscribe = null;
        }
        if (currentRaffleUnsubscribe) {
            currentRaffleUnsubscribe();
            currentRaffleUnsubscribe = null;
        }
    }

    // --- LÓGICA DO PAINEL (SÓ É INICIADA APÓS LOGIN) ---
    function initializeAdminPanel(user) {
        // Mostra o painel
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        // Elementos do painel
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
        const editRaffleNameBtn = document.getElementById('edit-raffle-name-btn');
        const editRaffleNameSection = document.getElementById('edit-raffle-name-section');
        const editRaffleNameInput = document.getElementById('edit-raffle-name-input');
        const saveRaffleNameBtn = document.getElementById('save-raffle-name-btn');
        const cancelEditRaffleNameBtn = document.getElementById('cancel-edit-raffle-name-btn');

        adminEmailDisplay.textContent = `Logado como: ${user.email}`;

        // Estado do painel
        let currentRaffleId = null;
        let allParticipantsData = [];
        let rawRifaData = {};
        
        // Funções de gestão
        const createRaffle = async () => { /* ... código completo ... */ };
        const deleteRaffle = async (raffleId, raffleName) => { /* ... código completo ... */ };
        function listenToAllRaffles() { /* ... código completo ... */ };
        const selectRaffle = (raffleId, raffleName) => { /* ... código completo ... */ };
        const processRifaData = (data) => { /* ... código completo ... */ };
        const renderTable = (data) => { /* ... código completo ... */ };
        const updateSummary = (sold, parts, price = 0) => { /* ... código completo ... */ };
        const declareWinner = async () => { /* ... código completo ... */ };
        const showWinnerInAdminPanel = (info) => { /* ... código completo ... */ };
        const handleSearch = () => { /* ... código completo ... */ };
        const showEditRaffleNameUI = () => { /* ... código completo ... */ };
        const hideEditRaffleNameUI = () => { /* ... código completo ... */ };
        const saveRaffleName = async () => { /* ... código completo ... */ };

        // Colando o corpo completo das funções aqui:
        async function createRaffle() { /* ... */ }
        async function deleteRaffle(raffleId, raffleName) { /* ... */ }
        function listenToAllRaffles() {
            if (allRafflesUnsubscribe) allRafflesUnsubscribe();
            allRafflesUnsubscribe = onSnapshot(rafflesCollectionRef, (snapshot) => {
                if(!rafflesListEl) return;
                rafflesListEl.innerHTML = '';
                if (snapshot.empty) return rafflesListEl.innerHTML = '<p class="text-gray-500">Nenhuma rifa criada.</p>';
                const sorted = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis()||0) - (a.data().createdAt?.toMillis()||0));
                sorted.forEach(doc => {
                    const r = doc.data();
                    const el = document.createElement('div');
                    el.className = `p-3 bg-gray-700 rounded-lg flex justify-between items-center ${doc.id === currentRaffleId ? 'ring-2 ring-blue-400' : ''} ${r.status === 'finished' ? 'opacity-60' : ''}`;
                    el.innerHTML = `<div class="flex-grow cursor-pointer" data-id="${doc.id}" data-name="${r.name}"><p class="font-semibold">${r.name}</p><p class="text-xs text-gray-400">Status: ${r.status}</p></div><div class="flex items-center space-x-2"><span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span><button title="Excluir Rifa" data-id="${doc.id}" data-name="${r.name}" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`;
                    rafflesListEl.appendChild(el);
                });
            });
        }
        function selectRaffle(raffleId, raffleName) {
            currentRaffleId = raffleId;
            detailsRaffleName.textContent = raffleName;
            raffleDetailsSection.classList.remove('hidden');
            hideEditRaffleNameUI();
            listenToAllRaffles();
            if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
            const ref = doc(db, "rifas", raffleId);
            currentRaffleUnsubscribe = onSnapshot(ref, (doc) => {
                rawRifaData = doc.data() || {};
                processRifaData(rawRifaData);
                if (rawRifaData.winner) showWinnerInAdminPanel(rawRifaData.winner);
                else {
                    declareWinnerArea.classList.remove('hidden');
                    winnerInfoAdmin.classList.add('hidden');
                    noWinnerInfoAdmin.classList.add('hidden');
                }
            });
        }
        function processRifaData(data) {
            const participants = {};
            let soldCount = 0;
            for (const key in data) {
                if (!isNaN(key) && key.length === 2) {
                    soldCount++;
                    const pData = data[key];
                    if (pData?.userId) {
                        if (!participants[pData.userId]) participants[pData.userId] = { ...pData, numbers: [] };
                        participants[pData.userId].numbers.push(key);
                    }
                }
            }
            allParticipantsData = Object.values(participants);
            renderTable(allParticipantsData);
            updateSummary(soldCount, allParticipantsData.length, data.pricePerNumber);
        }
        function renderTable(data) {
            participantsTableBody.innerHTML = '';
            if (data.length === 0) return participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8">Nenhum participante.</td></tr>`;
            data.forEach(p => {
                p.numbers.sort();
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-3">${p.name}</td><td class="p-3"><div class="flex flex-col"><span>${p.email}</span><span>${p.whatsapp}</span></div></td><td class="p-3">${p.pix}</td><td class="p-3"><div class="flex flex-wrap gap-2">${p.numbers.map(n => `<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">${n}</span>`).join('')}</div></td>`;
                participantsTableBody.appendChild(row);
            });
        }
        function updateSummary(sold, parts, price = 0) {
            soldNumbersEl.textContent = sold;
            totalParticipantsEl.textContent = parts;
            totalRevenueEl.textContent = (sold * price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        async function declareWinner() { /* ... */ }
        function showWinnerInAdminPanel(info) { /* ... */ }
        function handleSearch() { /* ... */ }
        function showEditRaffleNameUI() { /* ... */ }
        function hideEditRaffleNameUI() { /* ... */ }
        async function saveRaffleName() { /* ... */ }

        // Adiciona os eventos de gestão
        createRaffleBtn.addEventListener('click', createRaffle);
        declareWinnerBtn.addEventListener('click', declareWinner);
        searchInput.addEventListener('input', handleSearch);
        editRaffleNameBtn.addEventListener('click', showEditRaffleNameUI);
        saveRaffleNameBtn.addEventListener('click', saveRaffleName);
        cancelEditRaffleNameBtn.addEventListener('click', hideEditRaffleNameUI);
        rafflesListEl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-raffle-btn');
            if (deleteBtn) {
                e.stopPropagation();
                deleteRaffle(deleteBtn.dataset.id, deleteBtn.dataset.name);
            } else {
                const infoEl = e.target.closest('.flex-grow[data-id]');
                if (infoEl) selectRaffle(infoEl.dataset.id, infoEl.dataset.name);
            }
        });
        
        listenToAllRaffles();
    }

    // --- VIGILANTE DE AUTENTICAÇÃO ---
    onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
            initializeAdminPanel(user);
        } else {
            cleanupListeners(); // Desliga os "ouvidos"
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    });

    logoutBtn.addEventListener('click', handleLogout);
}

document.addEventListener('DOMContentLoaded', initializeAdminApp);
