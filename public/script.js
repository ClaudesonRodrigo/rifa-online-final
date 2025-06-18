import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const PRICE_PER_NUMBER = 10;

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
const numberGrid = document.getElementById('number-grid');
const welcomeUserSpan = document.getElementById('welcome-user');
const shoppingCartSection = document.getElementById('shopping-cart-section');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const whatsappInput = document.getElementById('whatsapp');
const pixInput = document.getElementById('pix');
const saveUserBtn = document.getElementById('save-user-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');

// **NOVOS ELEMENTOS DO DOM PARA O RESULTADO**
const winnerDisplaySection = document.getElementById('winner-display-section');
const publicWinnerNumber = document.getElementById('public-winner-number');
const publicWinnerName = document.getElementById('public-winner-name');
const publicWinnerBoughtNumbers = document.getElementById('public-winner-bought-numbers');


// --- ESTADO DO APLICATIVO ---
let currentUser = null;
let userId = null;
let numbersData = {};
let selectedNumbers = [];


// --- LÓGICA DE EXIBIÇÃO DO GANHADOR ---

function displayPublicWinner(winnerData) {
    // Se não houver um jogador para o número sorteado, não mostra a secção
    if (!winnerData || !winnerData.player) {
        winnerDisplaySection.classList.add('hidden');
        return;
    }
    
    const { number, player } = winnerData;
    const winnerId = player.userId;
    const winnerNumbers = [];

    // Encontra todos os números comprados pelo ganhador
    for (const numKey in numbersData) {
        if (numbersData[numKey] && numbersData[numKey].userId === winnerId) {
            winnerNumbers.push(numKey);
        }
    }
    
    // Preenche a secção do ganhador
    publicWinnerNumber.textContent = number;
    publicWinnerName.textContent = player.name;
    
    publicWinnerBoughtNumbers.innerHTML = '';
    winnerNumbers.sort().forEach(num => {
        const span = document.createElement('span');
        // Destaca o número sorteado
        if (num === number) {
            span.className = 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white';
        } else {
            span.className = 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
        }
        span.textContent = num;
        publicWinnerBoughtNumbers.appendChild(span);
    });
    
    // Mostra a secção e esconde o carrinho
    winnerDisplaySection.classList.remove('hidden');
    shoppingCartSection.classList.add('hidden');
}


// --- LÓGICA ATUALIZADA DO APLICATIVO ---

function renderNumberGrid() {
    const isRaffleOver = !!numbersData.winner; // Verifica se já há um ganhador

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
            // Estilo para números já comprados
            if (ownerData.userId === userId) {
                button.classList.add('bg-purple-600', 'cursor-not-allowed');
            } else {
                button.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-70');
            }
        } else {
            // **NOVO**: Se a rifa já acabou, desativa todos os números restantes
            if (isRaffleOver) {
                button.disabled = true;
                button.classList.add('bg-gray-700', 'cursor-not-allowed', 'opacity-50');
            } else {
                // Lógica normal para números disponíveis
                if (selectedNumbers.includes(numberStr)) {
                    button.classList.add('number-selected');
                } else {
                    button.classList.add('bg-blue-500', 'hover:bg-blue-400', 'number-available');
                }
                button.addEventListener('click', handleNumberClick);
            }
        }
        numberGrid.appendChild(button);
    }
}

function setupFirestoreListener() {
    onSnapshot(rifaDocRef, (doc) => {
        numbersData = doc.exists() ? doc.data() : {};
        welcomeUserSpan.textContent = currentUser.name;
        
        // 1. Verifica primeiro se há um ganhador
        if (numbersData.winner) {
            displayPublicWinner(numbersData.winner);
        }

        // 2. Renderiza a grade (que saberá se deve ser desativada)
        renderNumberGrid();
        
        // 3. Mostra o aplicativo e verifica o estado do pagamento
        loadingSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        checkPaymentStatus();

    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
        mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa.</p>`;
    });
}

// O resto do seu script.js (handleCheckout, handleNumberClick, etc.) continua igual.

function handleNumberClick(event) {
    const numberStr = event.target.dataset.number;
    const button = event.target;
    const index = selectedNumbers.indexOf(numberStr);
    if (index > -1) {
        selectedNumbers.splice(index, 1);
        button.classList.remove('number-selected');
        button.classList.add('number-available');
    } else {
        selectedNumbers.push(numberStr);
        button.classList.add('number-selected');
        button.classList.remove('number-available');
    }
    updateShoppingCart();
}

function updateShoppingCart() {
    const shoppingCartSection = document.getElementById('shopping-cart-section');
    const selectedNumbersList = document.getElementById('selected-numbers-list');
    const totalPriceEl = document.getElementById('total-price');

    if (selectedNumbers.length === 0) {
        shoppingCartSection.classList.add('hidden');
        return;
    }

    shoppingCartSection.classList.remove('hidden');
    selectedNumbersList.innerHTML = '';
    selectedNumbers.sort().forEach(num => {
        const numberEl = document.createElement('span');
        numberEl.className = 'bg-amber-500 text-gray-900 font-bold px-3 py-1 rounded-full text-lg';
        numberEl.textContent = num;
        selectedNumbersList.appendChild(numberEl);
    });
    const totalPrice = selectedNumbers.length * PRICE_PER_NUMBER;
    totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
}

async function handleCheckout() {
    // ... código existente para o checkout ...
}

function checkPaymentStatus() {
    // ... código existente para verificar o estado do pagamento ...
}

function setupAuthListener() {
    onAuthStateChanged(auth, user => {
        if (user) {
            userId = user.uid;
            loadUserDataOrShowLogin();
        } else {
            signInAnonymously(auth).catch(err => console.error("Auth Error", err));
        }
    });
}

function loadUserDataOrShowLogin() {
    const savedUser = localStorage.getItem(`rifaUser`);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupFirestoreListener();
    } else {
        loadingSection.classList.add('hidden');
        const userForm = document.getElementById('user-section');
        if (userForm) userForm.classList.remove('hidden');
    }
}

function saveUserData() {
    if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
        currentUser = { name: nameInput.value.trim(), email: emailInput.value.trim(), whatsapp: whatsappInput.value.trim(), pix: pixInput.value.trim() };
        localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
        userSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        setupFirestoreListener();
    } else {
        alert("Por favor, preencha todos os campos.");
    }
}

// Event Listeners
if(checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
if(saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
if(getLuckyNumbersBtn) getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);

setupAuthListener();
