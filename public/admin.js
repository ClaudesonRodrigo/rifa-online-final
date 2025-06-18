// Importações do Firebase - Usamos as mesmas do nosso app principal
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
// ATENÇÃO: Use a mesma configuração do seu arquivo script.js principal.
const firebaseConfig = {
    apiKey: "AIzaSyCNFkoa4Ark8R2uzhX95NlV8Buwg2GHhvo",
    authDomain: "cemvezesmais-1ab48.firebaseapp.com",
    projectId: "cemvezesmais-1ab48",
    storageBucket: "cemvezesmais-1ab48.firebasestorage.app",
    messagingSenderId: "206492928997",
    appId: "1:206492928997:web:763cd52f3e9e91a582fd0c",
    measurementId: "G-G3BX961SHY"
};

// --- DEFINA SUA SENHA AQUI ---
// Para um sistema real, usaríamos o Firebase Auth, mas para começar,
// uma senha direto no código é mais simples.
const ADMIN_PASSWORD = "admin"; // Mude para uma senha segura de sua preferência!

// --- INICIALIZAÇÃO DOS SERVIÇOS ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
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

let allParticipantsData = []; // Array para guardar os dados para a busca

// --- LÓGICA DE LOGIN ---

function checkLogin() {
    // sessionStorage mantém o usuário logado apenas enquanto a aba estiver aberta.
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

        const rifaData = doc.data();
        processRifaData(rifaData);
    }, (error) => {
        console.error("Erro ao carregar dados do admin:", error);
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-400">Erro ao carregar os dados. Verifique o console.</td></tr>`;
    });
}

function processRifaData(rifaData) {
    const participants = {}; // Usamos um objeto para agrupar números por participante (pelo userId)
    let soldCount = 0;

    // Itera por todos os campos do documento da rifa
    for (const key in rifaData) {
        // Verifica se a chave é um número de dois dígitos (00-99)
        if (!isNaN(key) && key.length === 2) {
            soldCount++;
            const playerData = rifaData[key];
            const userId = playerData.userId;

            if (!participants[userId]) {
                participants[userId] = {
                    name: playerData.name,
                    email: playerData.email,
                    whatsapp: playerData.whatsapp,
                    pix: playerData.pix,
                    numbers: []
                };
            }
            participants[userId].numbers.push(key);
        }
    }

    allParticipantsData = Object.values(participants); // Converte o objeto em um array para a tabela
    renderTable(allParticipantsData);
    updateSummary(soldCount, allParticipantsData.length);
}

function renderTable(dataToRender) {
    participantsTableBody.innerHTML = ''; // Limpa a tabela

    if (dataToRender.length === 0) {
        participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhum participante encontrado.</td></tr>`;
        return;
    }

    dataToRender.forEach(player => {
        // Ordena os números do jogador para melhor visualização
        player.numbers.sort();

        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/50';
        
        row.innerHTML = `
            <td class="p-3 font-semibold">${player.name}</td>
            <td class="p-3 text-gray-400">
                <div class="flex flex-col">
                    <span>${player.email}</span>
                    <span>${player.whatsapp}</span>
                </div>
            </td>
            <td class="p-3 font-mono text-gray-300">${player.pix}</td>
            <td class="p-3">
                <div class="flex flex-wrap gap-2">
                    ${player.numbers.map(num => `<span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">${num}</span>`).join('')}
                </div>
            </td>
        `;
        participantsTableBody.appendChild(row);
    });
}

function updateSummary(soldCount, participantCount) {
    soldNumbersEl.textContent = soldCount;
    totalParticipantsEl.textContent = participantCount;
    // Exemplo: se cada número custa R$ 5,00
    const pricePerNumber = 5;
    totalRevenueEl.textContent = (soldCount * pricePerNumber).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        renderTable(allParticipantsData); // Mostra todos se a busca estiver vazia
        return;
    }

    const filteredData = allParticipantsData.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(searchTerm);
        const numberMatch = player.numbers.some(num => num.includes(searchTerm));
        return nameMatch || numberMatch;
    });

    renderTable(filteredData);
}


// --- EVENT LISTENERS ---
loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
});
logoutBtn.addEventListener('click', handleLogout);
searchInput.addEventListener('input', handleSearch);

// --- INICIALIZAÇÃO ---
checkLogin();
