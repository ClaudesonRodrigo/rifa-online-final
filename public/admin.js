import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// **LINHA CORRIGIDA**: O correto é 'firebase-firestore.js'
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
const ADMIN_PASSWORD = "Cariocaju@2025";

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rafflesCollectionRef = collection(db, "rifas");

// --- ELEMENTOS DO DOM ---
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
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

// --- LÓGICA DE LOGIN ---
function checkLogin() {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        listenToAllRaffles();
    }
}
function handleLogin() {
    if (passwordInput.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        checkLogin();
    } else {
        loginError.classList.remove('hidden');
        passwordInput.value = '';
    }
}
function handleLogout() {
    sessionStorage.removeItem('isAdminLoggedIn');
    window.location.reload();
}

// --- LÓGICA DE GESTÃO DE RIFAS ---
async function createRaffle() {
    const name = raffleNameInput.value.trim();
    const price = parseFloat(rafflePriceInput.value);
    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor, preencha o nome do prémio e um preço válido.");
        return;
    }
    try {
        await addDoc(rafflesCollectionRef, {
            name: name,
            pricePerNumber: price,
            createdAt: new Date(),
            status: 'active'
        });
        alert(`Rifa "${name}" criada com sucesso!`);
        raffleNameInput.value = '';
        rafflePriceInput.value = '';
    } catch (error) {
        console.error("Erro ao criar rifa:", error);
        alert("Ocorreu um erro ao criar a rifa.");
    }
}

async function deleteRaffle(raffleId, raffleName) {
    const confirmation = window.confirm(`Tem a certeza de que pretende excluir permanentemente a rifa "${raffleName}"?\n\nTodos os dados dos participantes e números vendidos serão perdidos. Esta ação não pode ser desfeita.`);

    if (confirmation) {
        try {
            const docToDelete = doc(db, "rifas", raffleId);
            await deleteDoc(docToDelete);
            alert(`Rifa "${raffleName}" excluída com sucesso.`);
            if (currentRaffleId === raffleId) {
                raffleDetailsSection.classList.add('hidden');
                currentRaffleId = null;
            }
        } catch (error) {
            console.error("Erro ao excluir a rifa:", error);
            alert("Ocorreu um erro ao excluir a rifa. Verifique a consola para mais detalhes.");
        }
    }
}


function listenToAllRaffles() {
    onSnapshot(rafflesCollectionRef, (snapshot) => {
        rafflesListEl.innerHTML = '';
        if (snapshot.empty) {
            rafflesListEl.innerHTML = '<p class="text-gray-500">Nenhuma rifa criada ainda.</p>';
            return;
        }
        
        const sortedRaffles = snapshot.docs.sort((a, b) => {
            const timeA = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
            const timeB = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
            return timeB - timeA;
        });
        
        sortedRaffles.forEach(doc => {
            const raffle = doc.data();
            const raffleId = doc.id;
            const raffleEl = document.createElement('div');
            
            raffleEl.className = 'p-3 bg-gray-700 rounded-lg flex justify-between items-center';
             if (raffle.status === 'finished') {
                raffleEl.classList.add('opacity-60');
            }
            if (doc.id === currentRaffleId) {
                raffleEl.classList.add('ring-2', 'ring-blue-400');
            }

            const infoEl = document.createElement('div');
            infoEl.className = 'flex-grow cursor-pointer';
            infoEl.innerHTML = `
                <p class="font-semibold">${raffle.name}</p>
                <p class="text-xs text-gray-400">Status: ${raffle.status}</p>
            `;
            infoEl.onclick = () => selectRaffle(raffleId, raffle.name);

            const controlsEl = document.createElement('div');
            controlsEl.className = 'flex items-center space-x-2';
            controlsEl.innerHTML = `
                <span class="text-xs font-mono text-blue-300">${raffleId.substring(0,6)}...</span>
                <button title="Excluir Rifa" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            controlsEl.querySelector('.delete-raffle-btn').onclick = (e) => {
                e.stopPropagation(); 
                deleteRaffle(raffleId, raffle.name);
            };

            raffleEl.appendChild(infoEl);
            raffleEl.appendChild(controlsEl);
            rafflesListEl.appendChild(raffleEl);
        });
    });
}

function selectRaffle(raffleId, raffleName) {
    currentRaffleId = raffleId;
    detailsRaffleName.textContent = raffleName;
    raffleDetailsSection.classList.remove('hidden');
    
    listenToAllRaffles();

    if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
    
    const selectedRaffleDocRef = doc(db, "rifas", currentRaffleId);
    currentRaffleUnsubscribe = onSnapshot(selectedRaffleDocRef, (doc) => {
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

function processRifaData(rifaData) {
    const participants = {};
    let soldCount = 0;
    for (const key in rifaData) {
        if (!isNaN(key) && key.length === 2) {
            soldCount++;
            const playerData = rifaData[key];
            if (playerData && playerData.userId) {
                if (!participants[playerData.userId]) {
                    participants[playerData.userId] = { ...playerData, numbers: [] };
                }
                participants[playerData.userId].numbers.push(key);
            }
        }
    }
    allParticipantsData = Object.values(participants);
    renderTable(allParticipantsData);
    updateSummary(soldCount, allParticipantsData.length, rifaData.pricePerNumber);
}

function renderTable(dataToRender) {
    participantsTableBody.innerHTML = '';
    if (dataToRender.length === 0) {
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhum participante para esta rifa.</td></tr>`;
        return;
    }
    dataToRender.forEach(player => {
        player.numbers.sort();
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/50';
        row.innerHTML = `<td class="p-3 font-semibold">${player.name}</td><td class="p-3 text-gray-400"><div class="flex flex-col"><span>${player.email}</span><span>${player.whatsapp}</span></div></td><td class="p-3 font-mono text-gray-300">${player.pix}</td><td class="p-3"><div class="flex flex-wrap gap-2">${player.numbers.map(num => `<span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">${num}</span>`).join('')}</div></td>`;
        participantsTableBody.appendChild(row);
    });
}

function updateSummary(soldCount, participantCount, pricePerNumber = 0) {
    soldNumbersEl.textContent = soldCount;
    totalParticipantsEl.textContent = participantCount;
    totalRevenueEl.textContent = (soldCount * pricePerNumber).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function declareWinner() {
    if (!currentRaffleId) return alert("Nenhuma rifa selecionada.");
    const number = winningNumberInput.value.trim();
    if (!number || number.length > 2 || parseInt(number, 10) < 0 || parseInt(number, 10) > 99) {
        alert("Por favor, insira um número válido de 0 a 99.");
        return;
    }
    const winningNumber = number.padStart(2, '0');
    const winnerData = rawRifaData[winningNumber] || null;
    try {
        const selectedRaffleDocRef = doc(db, "rifas", currentRaffleId);
        await updateDoc(selectedRaffleDocRef, {
            winner: { number: winningNumber, player: winnerData },
            status: 'finished'
        });
        alert(`Sorteio finalizado! O resultado foi guardado.`);
    } catch (error) {
        console.error("Erro ao declarar o ganhador:", error);
        alert("Ocorreu um erro ao guardar o resultado.");
    }
}

function showWinnerInAdminPanel(winnerInfo) {
    declareWinnerArea.classList.add('hidden');
    const { number, player } = winnerInfo;
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
    const searchTerm = searchInput.value.toLowerCase();
    const filteredData = searchTerm ? allParticipantsData.filter(p => p.name.toLowerCase().includes(searchTerm) || p.numbers.some(n => n.includes(searchTerm))) : allParticipantsData;
    renderTable(filteredData);
}

// --- EVENT LISTENERS ---
loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
logoutBtn.addEventListener('click', handleLogout);
createRaffleBtn.addEventListener('click', createRaffle);
declareWinnerBtn.addEventListener('click', declareWinner);
searchInput.addEventListener('input', handleSearch);

// --- INICIALIZAÇÃO ---
async function initializeAdmin() {
    try {
        await signInAnonymously(auth);
        checkLogin();
    } catch (error) {
        console.error("Erro na autenticação anónima do admin:", error);
        document.body.innerHTML = `<div class="p-8 text-center text-red-400">Falha crítica na autenticação com o Firebase. Verifique a consola.</div>`;
    }
}

initializeAdmin();
