// Importações dos serviços do Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// ** LINHA CORRIGIDA **: Adicionamos o 'onAuthStateChanged' que estava faltando.
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const rifaDocRef = doc(db, "rifas", "rifa-100");

// --- ELEMENTOS DO DOM ---
const mainContainer = document.getElementById('main-container');
const loadingSection = document.getElementById('loading-section');
const userSection = document.getElementById('user-section');
const appSection = document.getElementById('app-section');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const whatsappInput = document.getElementById('whatsapp');
const pixInput = document.getElementById('pix');
const saveUserBtn = document.getElementById('save-user-btn');
const numberGrid = document.getElementById('number-grid');
const welcomeUserSpan = document.getElementById('welcome-user');
const luckThemeInput = document.getElementById('luck-theme-input');
const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');
const luckyNumbersResult = document.getElementById('lucky-numbers-result');
const declareWinnerBtn = document.getElementById('declare-winner-btn');
const winningNumberInput = document.getElementById('winning-number-input');
const winnerInfoDiv = document.getElementById('winner-info');
const noWinnerInfoDiv = document.getElementById('no-winner-info');
const shareModal = document.getElementById('share-modal');
const shareModalText = document.getElementById('share-modal-text');
const generateShareMessageBtn = document.getElementById('generate-share-message-btn');
const shareMessageTextarea = document.getElementById('share-message-textarea');
const copyShareMessageBtn = document.getElementById('copy-share-message-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// --- ESTADO DO APLICATIVO ---
let currentUser = null;
let userId = null;
let numbersData = {};
let chosenNumberForModal = null;

// --- FUNÇÕES PRINCIPAIS ---

function setButtonLoading(button, isLoading) {
    const text = button.querySelector('.gemini-button-text');
    const spinner = button.querySelector('i.fa-spinner');
    if (isLoading) {
        button.disabled = true;
        text.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        button.disabled = false;
        text.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

async function getLuckyNumbers() {
    const theme = luckThemeInput.value.trim();
    if (!theme) {
        luckyNumbersResult.innerHTML = `<p class="text-yellow-400">Por favor, digite um tema para o Oráculo.</p>`;
        return;
    }
    setButtonLoading(getLuckyNumbersBtn, true);
    luckyNumbersResult.innerHTML = `<p class="text-purple-300">Consultando o cosmos...</p>`;

    try {
        const functionUrl = `/.netlify/functions/getLuckyNumbers`;
        const response = await fetch(functionUrl, {
            method: "POST",
            body: JSON.stringify({ theme: theme }),
        });

        if (!response.ok) throw new Error('A resposta da função não foi OK.');
        
        const data = await response.json();

        let html = '<div class="grid md:grid-cols-3 gap-4">';
        data.sugestoes.forEach(s => {
            html += `<div class="bg-gray-700 p-4 rounded-lg border border-purple-500">
                        <p class="text-2xl font-bold text-purple-300 mb-2">${s.numero}</p>
                        <p class="text-sm text-gray-300">${s.explicacao}</p>
                     </div>`;
        });
        html += '</div>';
        luckyNumbersResult.innerHTML = html;

    } catch (error) {
        console.error("Erro ao chamar a função da Netlify:", error);
        luckyNumbersResult.innerHTML = `<p class="text-red-400">O Oráculo está com dor de cabeça. Tente novamente mais tarde.</p>`;
    } finally {
        setButtonLoading(getLuckyNumbersBtn, false);
    }
}

async function generateShareMessage() {
    setButtonLoading(generateShareMessageBtn, true);
    shareMessageTextarea.value = "Criando uma mensagem mágica...";
    copyShareMessageBtn.classList.add('hidden');

    try {
        const functionUrl = `/.netlify/functions/getLuckyNumbers`; 
        const prompt = `Crie uma mensagem curta e animada para o WhatsApp que ${currentUser.name} possa compartilhar. A mensagem deve celebrar a escolha do número ${chosenNumberForModal} na rifa "Sorte Premiada" e convidar amigos para participar também. Inclua emojis e um espaço para o link da rifa. Seja criativo e divertido. Não inclua a estrutura JSON.`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            body: JSON.stringify({ theme: prompt })
        });

        if (!response.ok) throw new Error('A resposta da função não foi OK.');

        const message = await response.text();
        shareMessageTextarea.value = message;
        copyShareMessageBtn.classList.remove('hidden');

    } catch (error) {
        console.error("Erro ao gerar mensagem:", error);
        shareMessageTextarea.value = "Não foi possível criar uma mensagem agora. Tente novamente!";
    } finally {
        setButtonLoading(generateShareMessageBtn, false);
    }
}

function copyShareMessage() {
    shareMessageTextarea.select();
    document.execCommand('copy');
    copyShareMessageBtn.textContent = 'Copiado!';
    setTimeout(() => {
         copyShareMessageBtn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copiar Mensagem';
    }, 2000);
}

function setupAuthListener() {
    onAuthStateChanged(auth, user => {
        if (user) {
            userId = user.uid;
            loadUserDataOrShowLogin();
        } else {
            signInAnonymously(auth).catch(handleAuthError);
        }
    });
}

function handleAuthError(error) {
    console.error("Falha na autenticação:", error);
    let errorMessage = `<div class="text-center p-8"><h2 class="text-2xl font-bold text-red-400 mb-4">Erro de Autenticação</h2><p class="text-gray-300">Não foi possível conectar. Verifique sua conexão e a configuração do Firebase.</p></div>`;
    if (error.code === 'auth/configuration-not-found') {
        errorMessage = `<div class="text-center p-8"><h2 class="text-2xl font-bold text-red-400 mb-4">Erro de Configuração</h2><p class="text-gray-300">O método de login "Anônimo" não está ativado no seu painel do Firebase.</p><p class="mt-2 text-sm">Siga o guia para ativá-lo na aba "Authentication".</p></div>`;
    }
    mainContainer.innerHTML = errorMessage;
}

function loadUserDataOrShowLogin() {
    const savedUser = localStorage.getItem(`rifaUser`);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupFirestoreListener();
    } else {
        loadingSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
}

function showApp() {
    welcomeUserSpan.textContent = currentUser.name;
    loadingSection.classList.add('hidden');
    userSection.classList.add('hidden');
    appSection.classList.remove('hidden');
}

function setupFirestoreListener() {
    onSnapshot(rifaDocRef, (doc) => {
        numbersData = doc.exists() ? doc.data() : {};
        renderNumberGrid();
        if (numbersData.winner) {
            displayWinner(numbersData.winner.number, numbersData.winner.player);
        }
        showApp(); 
    }, (error) => {
        console.error("Erro ao ouvir o Firestore:", error);
        const errorMessage = `<div class="text-center p-8"><h2 class="text-2xl font-bold text-red-400 mb-4">Erro de Conexão com o Banco de Dados</h2><p class="text-gray-300">Não foi possível carregar os números da rifa. Verifique as regras de segurança do seu Firestore no painel do Firebase.</p></div>`;
        mainContainer.innerHTML = errorMessage;
    });
}


function renderNumberGrid() {
    numberGrid.innerHTML = '';
    for (let i = 0; i < 100; i++) {
        const numberStr = i.toString().padStart(2, '0');
        const ownerData = numbersData[numberStr];
        const button = document.createElement('button');
        button.textContent = numberStr;
        button.dataset.number = numberStr;
        button.className = "p-2 rounded-lg text-sm md:text-base font-bold transition-all duration-200 ease-in-out";
        if (ownerData) {
            button.disabled = true;
            if (ownerData.userId === userId) {
                button.classList.add('bg-purple-600', 'cursor-not-allowed', 'ring-2', 'ring-purple-300');
            } else {
                button.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-70', 'tooltip');
                const tooltipText = document.createElement('span');
                tooltipText.className = 'tooltiptext';
                tooltipText.textContent = `Por: ${ownerData.name}`;
                button.appendChild(tooltipText);
            }
        } else {
            button.classList.add('bg-blue-500', 'hover:bg-blue-400', 'number-available');
            button.addEventListener('click', handleNumberClick);
        }
        numberGrid.appendChild(button);
    }
}

async function handleNumberClick(event) {
    const number = event.target.dataset.number;
    if (numbersData[number]) return alert("Ops! Alguém acabou de pegar este número.");
    
    const confirmation = window.confirm(`Você confirma a escolha do número ${number}?`);
    if (!confirmation) return;

    event.target.disabled = true;
    event.target.textContent = '...';
    
    try {
        await updateDoc(rifaDocRef, { [number]: { ...currentUser, userId } })
            .catch(e => e.code === 'not-found' ? setDoc(rifaDocRef, { [number]: { ...currentUser, userId } }) : Promise.reject(e));
        
        chosenNumberForModal = number;
        shareModalText.textContent = `Parabéns, ${currentUser.name}! Você escolheu o número ${number}. Boa sorte!`;
        shareMessageTextarea.value = '';
        copyShareMessageBtn.classList.add('hidden');
        shareModal.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao escolher número:", error);
        alert("Ocorreu um erro. Tente novamente.");
    }
}

function saveUserData() {
    if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
        currentUser = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            whatsapp: whatsappInput.value.trim(),
            pix: pixInput.value.trim(),
        };
        localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
        loadingSection.classList.remove('hidden');
        userSection.classList.add('hidden');
        setupFirestoreListener();
    } else {
        alert("Por favor, preencha todos os campos.");
    }
}

async function declareWinner() {
    const winningNumber = winningNumberInput.value.padStart(2, '0');
    if (parseInt(winningNumber, 10) < 0 || parseInt(winningNumber, 10) > 99 || winningNumber.length !== 2) {
        return alert("Por favor, insira um número válido entre 00 e 99.");
    }
    const winnerData = numbersData[winningNumber];
    displayWinner(winningNumber, winnerData);
    try {
        await updateDoc(rifaDocRef, { winner: { number: winningNumber, player: winnerData || null } });
    } catch (error) {
         console.error("Erro ao salvar o ganhador:", error);
    }
}

function displayWinner(number, player) {
    if (player) {
        document.getElementById('winner-number').textContent = number;
        document.getElementById('winner-name').textContent = player.name;
        document.getElementById('winner-email').textContent = player.email;
        document.getElementById('winner-whatsapp').textContent = player.whatsapp;
        document.getElementById('winner-pix').textContent = player.pix;
        winnerInfoDiv.classList.remove('hidden');
        noWinnerInfoDiv.classList.add('hidden');
    } else {
        winnerInfoDiv.classList.add('hidden');
        noWinnerInfoDiv.classList.remove('hidden');
    }
    declareWinnerBtn.disabled = true;
    winningNumberInput.disabled = true;
}

// --- EVENT LISTENERS ---
saveUserBtn.addEventListener('click', saveUserData);
declareWinnerBtn.addEventListener('click', declareWinner);
getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
generateShareMessageBtn.addEventListener('click', generateShareMessage);
copyShareMessageBtn.addEventListener('click', copyShareMessage);
closeModalBtn.addEventListener('click', () => {
    shareModal.classList.add('hidden');
});

// --- INÍCIO DA APLICAÇÃO ---
setupAuthListener();
