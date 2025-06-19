import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// **LINHA CORRIGIDA**: O correto é 'firebase-firestore.js'
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// --- LÓGICA PRINCIPAL ---

const urlParams = new URLSearchParams(window.location.search);
const raffleId = urlParams.get('id');

if (!raffleId) {
    document.getElementById('loading-section').innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar para a página inicial...</p>';
    setTimeout(() => { window.location.href = '/'; }, 3000);
} else {
    const rifaDocRef = doc(db, "rifas", raffleId);
    let PRICE_PER_NUMBER = 10; // Valor padrão

    // --- ELEMENTOS DO DOM (movidos para dentro do 'else') ---
    const mainContainer = document.getElementById('main-container');
    const loadingSection = document.getElementById('loading-section');
    const userSection = document.getElementById('user-section');
    const appSection = document.getElementById('app-section');
    const raffleTitle = document.getElementById('raffle-title');
    const numberGrid = document.getElementById('number-grid');
    const welcomeUserSpan = document.getElementById('welcome-user');
    const shoppingCartSection = document.getElementById('shopping-cart-section');
    const selectedNumbersList = document.getElementById('selected-numbers-list');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const paymentStatusEl = document.getElementById('payment-status');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const whatsappInput = document.getElementById('whatsapp');
    const pixInput = document.getElementById('pix');
    const saveUserBtn = document.getElementById('save-user-btn');
    const luckThemeInput = document.getElementById('luck-theme-input');
    const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');
    const winnerDisplaySection = document.getElementById('winner-display-section');
    const publicWinnerNumber = document.getElementById('public-winner-number');
    const publicWinnerName = document.getElementById('public-winner-name');
    const publicWinnerBoughtNumbers = document.getElementById('public-winner-bought-numbers');

    // --- ESTADO DO APLICATIVO ---
    let currentUser = null;
    let userId = null;
    let numbersData = {};
    let selectedNumbers = [];
    
    // --- FUNÇÕES DO APLICATIVO ---
    // Todas as funções do antigo script.js são movidas para aqui
    function renderNumberGrid() { /* ... */ }
    function handleNumberClick(event) { /* ... */ }
    function updateShoppingCart() { /* ... */ }
    async function handleCheckout() { /* ... */ }
    function setupFirestoreListener() { /* ... */ }
    // ... e assim por diante.

    // Colando toda a lógica aqui...
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
            userSection.classList.remove('hidden');
        }
    }

    function setupFirestoreListener() {
        onSnapshot(rifaDocRef, (doc) => {
            if(!doc.exists()) {
                loadingSection.innerHTML = '<p class="text-red-400 text-center">Rifa não encontrada ou foi removida.</p>';
                return;
            }
            numbersData = doc.data();
            PRICE_PER_NUMBER = numbersData.pricePerNumber || 10;
            
            welcomeUserSpan.textContent = currentUser.name;
            raffleTitle.textContent = numbersData.name;
            
            if (numbersData.winner) {
                displayPublicWinner(numbersData.winner);
            }
            renderNumberGrid();
            loadingSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            checkPaymentStatus();
        }, (error) => {
            console.error("Erro ao carregar dados do Firestore:", error);
            mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa.</p>`;
        });
    }
    
    function renderNumberGrid() {
        const isRaffleOver = !!numbersData.winner;
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
                button.classList.add(ownerData.userId === userId ? 'bg-purple-600' : 'bg-gray-600', 'cursor-not-allowed', 'opacity-70');
            } else {
                if (isRaffleOver) {
                    button.disabled = true;
                    button.classList.add('bg-gray-700', 'cursor-not-allowed', 'opacity-50');
                } else {
                    button.classList.add(selectedNumbers.includes(numberStr) ? 'number-selected' : 'bg-blue-500', 'hover:bg-blue-400', 'number-available');
                    button.addEventListener('click', handleNumberClick);
                }
            }
            numberGrid.appendChild(button);
        }
    }

    function handleNumberClick(event) {
        const numberStr = event.target.dataset.number;
        const button = event.target;
        const index = selectedNumbers.indexOf(numberStr);
        if (index > -1) {
            selectedNumbers.splice(index, 1);
            button.classList.remove('number-selected');
            button.classList.add('number-available', 'bg-blue-500');
        } else {
            selectedNumbers.push(numberStr);
            button.classList.add('number-selected');
            button.classList.remove('number-available', 'bg-blue-500');
        }
        updateShoppingCart();
    }
    
    function updateShoppingCart() {
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

    // Adiciona as funções restantes que estavam no script.js original
    function displayPublicWinner(winnerData) { /* ... */ }
    async function handleCheckout() { /* ... */ }
    function checkPaymentStatus() { /* ... */ }
    async function getLuckyNumbers() { /* ... */ }
    function setButtonLoading(button, isLoading) { /* ... */ }


    // EVENT LISTENERS
    saveUserBtn.addEventListener('click', saveUserData);
    checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
    
    // INÍCIO
    setupAuthListener();
}
