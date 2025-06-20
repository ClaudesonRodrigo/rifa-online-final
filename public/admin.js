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

// --- INICIALIZAÇÃO ---
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
let currentRaffleUnsubscribe = null;
let allParticipantsData = [];
let rawRifaData = {};

// --- LÓGICA DE AUTENTICAÇÃO SEGURA ---
function handleAuthState(user) {
    if (user) {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        adminEmailDisplay.textContent = `Logado como: ${user.email}`;
        listenToAllRaffles(); 
    } else {
        loginScreen.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
}

async function handleLogin() {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Erro no login:", error.code);
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    signOut(auth);
}

// --- LÓGICA DE GESTÃO DE RIFAS (COMPLETA) ---
async function createRaffle() {
    const name = raffleNameInput.value.trim();
    const price = parseFloat(rafflePriceInput.value);
    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor, preencha o nome do prémio e um preço válido.");
        return;
    }
    try {
        await addDoc(rafflesCollectionRef, {
            name: name, pricePerNumber: price, createdAt: new Date(), status: 'active'
        });
        alert(`Rifa "${name}" criada com sucesso!`);
        raffleNameInput.value = '';
        rafflePriceInput.value = '';
    } catch (error) { console.error("Erro ao criar rifa:", error); }
}

async function deleteRaffle(raffleId, raffleName) {
    if (window.confirm(`Tem a certeza de que pretende excluir permanentemente a rifa "${raffleName}"?`)) {
        try {
            await deleteDoc(doc(db, "rifas", raffleId));
            alert(`Rifa "${raffleName}" excluída com sucesso.`);
            if (currentRaffleId === raffleId) {
                raffleDetailsSection.classList.add('hidden');
                currentRaffleId = null;
            }
        } catch (error) { console.error("Erro ao excluir a rifa:", error); }
    }
}

function listenToAllRaffles() {
    onSnapshot(rafflesCollectionRef, (snapshot) => {
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
            el.innerHTML = `<div class="flex-grow cursor-pointer" data-id="${doc.id}" data-name="${raffle.name}"><p class="font-semibold">${raffle.name}</p><p class="text-xs text-gray-400">Status: ${raffle.status}</p></div><div class="flex items-center space-x-2"><span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span><button title="Excluir Rifa" data-id="${doc.id}" data-name="${raffle.name}" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`;
            rafflesListEl.appendChild(el);
        });
    });
}

function selectRaffle(raffleId, raffleName) {
    currentRaffleId = raffleId;
    detailsRaffleName.textContent = raffleName;
    raffleDetailsSection.classList.remove('hidden');
    listenToAllRaffles(); 
    if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
    const ref = doc(db, "rifas", raffleId);
    currentRaffleUnsubscribe = onSnapshot(ref, (doc) => {
        rawRifaData = doc.data() || {};
        processRifaData(rawRifaData);
        if (rawRifaData.winner) {
            showWinnerInAdminPanel(rawRifaData.winner);
        } else {
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
    if (data.length === 0) {
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8">Nenhum participante.</td></tr>`;
        return;
    }
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

async function declareWinner() {
    if (!currentRaffleId) return alert("Nenhuma rifa selecionada.");
    const num = winningNumberInput.value.trim().padStart(2, '0');
    if (parseInt(num, 10) < 0 || parseInt(num, 10) > 99) return alert("Número inválido.");
    const winnerData = rawRifaData[num] || null;
    try {
        await updateDoc(doc(db, "rifas", currentRaffleId), { winner: { number: num, player: winnerData }, status: 'finished' });
        alert(`Sorteio finalizado!`);
    } catch (e) { console.error("Erro ao declarar ganhador:", e); }
}

function showWinnerInAdminPanel(info) {
    declareWinnerArea.classList.add('hidden');
    const { number, player } = info;
    if (player) {
        adminWinnerNumber.textContent = number;
        adminWinnerName.textContent = player.name;
        adminWinnerContact.textContent = `${player.email} / ${player.whatsapp}`;
        adminWinnerPix.textContent = player.pix;
        winnerInfoAdmin.classList.remove('hidden');
        noWinnerInfoAdmin.classList.add('hidden');
    } else {
        adminWinnerNumber.textContent = number;
        noWinnerInfoAdmin.classList.remove('hidden');
        winnerInfoAdmin.classList.add('hidden');
    }
}

function handleSearch() {
    const term = searchInput.value.toLowerCase();
    const filtered = term ? allParticipantsData.filter(p => p.name.toLowerCase().includes(term) || p.numbers.some(n => n.includes(term))) : allParticipantsData;
    renderTable(filtered);
}

// --- EVENT LISTENERS ---
loginBtn.addEventListener('click', handleLogin);
adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
logoutBtn.addEventListener('click', handleLogout);
createRaffleBtn.addEventListener('click', createRaffle);
declareWinnerBtn.addEventListener('click', declareWinner);
searchInput.addEventListener('input', handleSearch);

rafflesListEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-raffle-btn');
    if (deleteBtn) {
        e.stopPropagation();
        deleteRaffle(deleteBtn.dataset.id, deleteBtn.dataset.name);
        return;
    }
    
    const infoEl = e.target.closest('.flex-grow');
    if (infoEl) {
        selectRaffle(infoEl.dataset.id, infoEl.dataset.name);
    }
});

// --- INICIALIZAÇÃO ---
onAuthStateChanged(auth, handleAuthState);
