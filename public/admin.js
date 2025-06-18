import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rifaDocRef = doc(db, "rifas", "rifa-100");

// --- ELEMENTOS DO DOM ---
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const soldNumbersEl = document.getElementById('sold-numbers');
const totalParticipantsEl = document.getElementById('total-participants');
const totalRevenueEl = document.getElementById('total-revenue');
const participantsTableBody = document.getElementById('participants-table-body');
const searchInput = document.getElementById('search-input');
// **NOVOS ELEMENTOS DO DOM**
const declareWinnerArea = document.getElementById('declare-winner-area');
const winningNumberInput = document.getElementById('winning-number-input');
const declareWinnerBtn = document.getElementById('declare-winner-btn');
const winnerInfoAdmin = document.getElementById('winner-info-admin');
const adminWinnerNumber = document.getElementById('admin-winner-number');
const adminWinnerName = document.getElementById('admin-winner-name');
const adminWinnerContact = document.getElementById('admin-winner-contact');
const adminWinnerPix = document.getElementById('admin-winner-pix');
const noWinnerInfoAdmin = document.getElementById('no-winner-info-admin');

let allParticipantsData = [];
let rawRifaData = {}; // Guarda os dados brutos para encontrar o ganhador

// --- LÓGICA DE LOGIN ---
function checkLogin() { /* ... código existente ... */ }
function handleLogin() { /* ... código existente ... */ }
function handleLogout() { /* ... código existente ... */ }
// ... (copie as funções de login daqui)
function checkLogin() {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        loadAdminData();
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
    loginScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}


// --- LÓGICA DO PAINEL ---

function loadAdminData() {
    onSnapshot(rifaDocRef, (doc) => {
        if (!doc.exists()) {
            participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhum dado encontrado para esta rifa.</td></tr>`;
            return;
        }
        rawRifaData = doc.data(); // Guarda os dados brutos
        processRifaData(rawRifaData);
        // **NOVO**: Verifica se já há um ganhador
        if (rawRifaData.winner) {
            showWinnerInAdminPanel(rawRifaData.winner);
        }
    }, (error) => {
        console.error("Erro ao carregar dados do admin:", error);
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-400">Erro ao carregar os dados. Verifique a consola.</td></tr>`;
    });
}

function processRifaData(rifaData) {
    // ... (código existente sem alterações)
    const participants = {};
    let soldCount = 0;
    for (const key in rifaData) {
        if (!isNaN(key) && key.length === 2) {
            soldCount++;
            const playerData = rifaData[key];
            const userId = playerData.userId;
            if (userId) {
                if (!participants[userId]) {
                    participants[userId] = {
                        name: playerData.name, email: playerData.email, whatsapp: playerData.whatsapp, pix: playerData.pix, numbers: []
                    };
                }
                participants[userId].numbers.push(key);
            }
        }
    }
    allParticipantsData = Object.values(participants);
    renderTable(allParticipantsData);
    updateSummary(soldCount, allParticipantsData.length);
}

function renderTable(dataToRender) {
    // ... (código existente sem alterações)
    participantsTableBody.innerHTML = ''; 
    if (dataToRender.length === 0) {
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhum participante encontrado.</td></tr>`;
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

function updateSummary(soldCount, participantCount) {
    // ... (código existente sem alterações)
    soldNumbersEl.textContent = soldCount;
    totalParticipantsEl.textContent = participantCount;
    const pricePerNumber = 10;
    totalRevenueEl.textContent = (soldCount * pricePerNumber).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function handleSearch() {
    // ... (código existente sem alterações)
    const searchTerm = searchInput.value.toLowerCase();
    if (!searchTerm) {
        renderTable(allParticipantsData);
        return;
    }
    const filteredData = allParticipantsData.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(searchTerm);
        const numberMatch = player.numbers.some(num => num.includes(searchTerm));
        return nameMatch || numberMatch;
    });
    renderTable(filteredData);
}

// **NOVAS FUNÇÕES PARA DECLARAR O GANHADOR**
async function declareWinner() {
    const number = winningNumberInput.value.trim();
    if (!number || number.length > 2 || parseInt(number, 10) < 0 || parseInt(number, 10) > 99) {
        alert("Por favor, insira um número válido de 0 a 99.");
        return;
    }

    const winningNumber = number.padStart(2, '0');
    const winnerData = rawRifaData[winningNumber] || null;

    if (winnerData) {
        console.log(`Ganhador encontrado: ${winnerData.name} com o número ${winningNumber}`);
    } else {
        console.log(`Ninguém comprou o número sorteado ${winningNumber}.`);
    }

    try {
        await updateDoc(rifaDocRef, {
            winner: {
                number: winningNumber,
                player: winnerData 
            }
        });
        alert(`Sorteio finalizado! O resultado foi guardado.`);
        // A UI será atualizada automaticamente pelo `onSnapshot`
    } catch (error) {
        console.error("Erro ao declarar o ganhador:", error);
        alert("Ocorreu um erro ao guardar o resultado. Tente novamente.");
    }
}

function showWinnerInAdminPanel(winnerInfo) {
    declareWinnerArea.classList.add('hidden'); // Esconde o formulário
    const { number, player } = winnerInfo;

    if (player) {
        adminWinnerNumber.textContent = number;
        adminWinnerName.textContent = player.name;
        adminWinnerContact.textContent = `${player.email} / ${player.whatsapp}`;
        adminWinnerPix.textContent = player.pix;
        winnerInfoAdmin.classList.remove('hidden');
        noWinnerInfoAdmin.classList.add('hidden');
    } else {
        noWinnerInfoAdmin.classList.remove('hidden');
        winnerInfoAdmin.classList.add('hidden');
    }
}

// --- EVENT LISTENERS ---
loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
logoutBtn.addEventListener('click', handleLogout);
searchInput.addEventListener('input', handleSearch);
declareWinnerBtn.addEventListener('click', declareWinner); // **NOVO**

// --- INICIALIZAÇÃO ---
async function initializeAdmin() { /* ... código existente ... */ }
// ... (copie a função initializeAdmin daqui)
async function initializeAdmin() {
    try {
        await signInAnonymously(auth);
        console.log("Admin autenticado anonimamente com sucesso.");
        checkLogin();
    } catch (error) {
        console.error("Erro na autenticação anônima do admin:", error);
        document.body.innerHTML = `<div class="p-8 text-center text-red-400">Falha crítica na autenticação com o Firebase. Verifique a consola.</div>`;
    }
}
initializeAdmin();

