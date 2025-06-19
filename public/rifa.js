import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// --- ELEMENTOS DO DOM ---
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
let rifaDocRef;
let PRICE_PER_NUMBER = 10;

// --- FUNÇÕES DE LÓGICA ---

function setupAuthListener() {
    onAuthStateChanged(auth, user => {
        if (user) {
            userId = user.uid;
            loadUserDataOrShowLogin();
        } else {
            signInAnonymously(auth).catch(err => {
                console.error("Auth Error", err);
                if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Erro de autenticação. Verifique as configurações do Firebase.</p>`;
            });
        }
    });
}

function loadUserDataOrShowLogin() {
    const savedUser = localStorage.getItem(`rifaUser`);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupFirestoreListener();
    } else {
        if(loadingSection) loadingSection.classList.add('hidden');
        if(userSection) userSection.classList.remove('hidden');
    }
}

function setupFirestoreListener() {
    onSnapshot(rifaDocRef, (doc) => {
        if (!doc.exists()) {
            if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400 text-center">Rifa não encontrada ou foi removida.</p>';
            return;
        }
        numbersData = doc.data();
        PRICE_PER_NUMBER = numbersData.pricePerNumber || 10;
        
        if (welcomeUserSpan) welcomeUserSpan.textContent = currentUser.name;
        if (raffleTitle) raffleTitle.textContent = numbersData.name;
        
        if (numbersData.winner) {
            displayPublicWinner(numbersData.winner);
        }
        renderNumberGrid();
        
        if(loadingSection) loadingSection.classList.add('hidden');
        if(appSection) appSection.classList.remove('hidden');
        checkPaymentStatus();

    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
        if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa. Verifique as regras de segurança.</p>`;
    });
}

function renderNumberGrid() {
    const isRaffleOver = !!numbersData.winner;
    if (!numberGrid) return;
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
        if (shoppingCartSection) shoppingCartSection.classList.add('hidden');
        return;
    }
    if (shoppingCartSection) shoppingCartSection.classList.remove('hidden');
    if (selectedNumbersList) selectedNumbersList.innerHTML = '';
    selectedNumbers.sort().forEach(num => {
        const numberEl = document.createElement('span');
        numberEl.className = 'bg-amber-500 text-gray-900 font-bold px-3 py-1 rounded-full text-lg';
        numberEl.textContent = num;
        if (selectedNumbersList) selectedNumbersList.appendChild(numberEl);
    });
    const totalPrice = selectedNumbers.length * PRICE_PER_NUMBER;
    if (totalPriceEl) totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (checkoutBtn) checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
}

function saveUserData() {
    if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
        currentUser = { name: nameInput.value.trim(), email: emailInput.value.trim(), whatsapp: whatsappInput.value.trim(), pix: pixInput.value.trim() };
        localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
        if (userSection) userSection.classList.add('hidden');
        if (loadingSection) loadingSection.classList.remove('hidden');
        setupFirestoreListener();
    } else {
        alert("Por favor, preencha todos os campos.");
    }
}

function displayPublicWinner(winnerData) {
    if (!winnerData || !winnerData.player) {
        if(winnerDisplaySection) winnerDisplaySection.classList.add('hidden');
        return;
    }
    const { number, player } = winnerData;
    const winnerId = player.userId;
    const winnerNumbers = [];
    for (const numKey in numbersData) {
        if (numbersData[numKey] && numbersData[numKey].userId === winnerId) {
            winnerNumbers.push(numKey);
        }
    }
    if(publicWinnerNumber) publicWinnerNumber.textContent = number;
    if(publicWinnerName) publicWinnerName.textContent = player.name;
    if(publicWinnerBoughtNumbers) publicWinnerBoughtNumbers.innerHTML = '';
    winnerNumbers.sort().forEach(num => {
        const span = document.createElement('span');
        span.className = num === number 
            ? 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white' 
            : 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
        span.textContent = num;
        if(publicWinnerBoughtNumbers) publicWinnerBoughtNumbers.appendChild(span);
    });
    if(winnerDisplaySection) winnerDisplaySection.classList.remove('hidden');
    if(shoppingCartSection) shoppingCartSection.classList.add('hidden');
}

async function handleCheckout() {
    const raffleId = rifaDocRef.id;
    if (selectedNumbers.length === 0) return;
    checkoutBtn.classList.add('pointer-events-none', 'opacity-50');
    checkoutBtn.textContent = 'A gerar link...';
    paymentStatusEl.textContent = 'Aguarde, estamos a preparar o seu pagamento...';
    paymentStatusEl.classList.remove('hidden');
    const items = selectedNumbers.map(number => ({
        id: number, title: `Rifa - ${numbersData.name} - Nº ${number}`, quantity: 1, unit_price: PRICE_PER_NUMBER, currency_id: 'BRL'
    }));
    const payerData = { ...currentUser, userId, raffleId: raffleId };
    try {
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST', body: JSON.stringify({ items, payerData }),
        });
        if (!response.ok) throw new Error('Falha ao gerar o link de pagamento.');
        const data = await response.json();
        if (data.checkoutUrl) {
            localStorage.setItem('pendingRaffleId', raffleId);
            localStorage.setItem('pendingNumbers', JSON.stringify(selectedNumbers));
            window.location.href = data.checkoutUrl;
        }
    } catch (error) {
        console.error("Erro no checkout:", error);
        paymentStatusEl.textContent = 'Erro ao gerar o link de pagamento. Tente novamente.';
        checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
        checkoutBtn.textContent = 'Pagar com Mercado Pago';
    }
}

function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const pendingRaffleId = localStorage.getItem('pendingRaffleId');
    if (status && rifaDocRef.id === pendingRaffleId) {
        const pendingNumbers = localStorage.getItem('pendingNumbers');
        if (status === 'approved' && pendingNumbers) {
            paymentStatusEl.textContent = `Pagamento aprovado! Os seus números ${JSON.parse(pendingNumbers).join(', ')} foram reservados. Boa sorte!`;
            paymentStatusEl.className = 'text-center text-green-400 mt-4';
            paymentStatusEl.classList.remove('hidden');
        } else if (status === 'failure') {
            paymentStatusEl.textContent = 'O pagamento falhou. Por favor, tente novamente.';
            paymentStatusEl.className = 'text-center text-red-400 mt-4';
            paymentStatusEl.classList.remove('hidden');
        }
        localStorage.removeItem('pendingNumbers');
        localStorage.removeItem('pendingRaffleId');
        if(window.history.replaceState){
            const newUrl = new URL(window.location);
            newUrl.search = '';
            window.history.replaceState({path:newUrl.href}, '', newUrl.href);
        }
    }
}

function setButtonLoading(button, isLoading) {
    if(!button) return;
    const text = button.querySelector('.gemini-button-text');
    const spinner = button.querySelector('i.fa-spinner');
    if (text && spinner) {
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
}

async function getLuckyNumbers() {
    const theme = luckThemeInput.value.trim();
    if (!theme) {
        luckyNumbersResult.innerHTML = `<p class="text-yellow-400">Por favor, digite um tema para o Oráculo.</p>`;
        return;
    }
    setButtonLoading(getLuckyNumbersBtn, true);
    luckyNumbersResult.innerHTML = `<p class="text-purple-300">A consultar o cosmos...</p>`;
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
            html += `<div class="bg-gray-700 p-4 rounded-lg border border-purple-500"><p class="text-2xl font-bold text-purple-300 mb-2">${s.numero}</p><p class="text-sm text-gray-300">${s.explicacao}</p></div>`;
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

// --- INICIALIZAÇÃO E EVENTOS ---
function main() {
    const urlParams = new URLSearchParams(window.location.search);
    const raffleId = urlParams.get('id');

    if (!raffleId) {
        if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar...</p>';
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
    }
    
    rifaDocRef = doc(db, "rifas", raffleId);

    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    if (getLuckyNumbersBtn) getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
    
    setupAuthListener();
}

main();
