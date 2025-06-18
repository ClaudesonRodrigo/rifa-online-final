import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rifaDocRef = doc(db, "rifas", "rifa-100");

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
const shoppingCartSection = document.getElementById('shopping-cart-section');
const selectedNumbersList = document.getElementById('selected-numbers-list');
const totalPriceEl = document.getElementById('total-price');
const checkoutBtn = document.getElementById('checkout-btn');
const paymentStatusEl = document.getElementById('payment-status');

let currentUser = null;
let userId = null;
let numbersData = {};
let selectedNumbers = [];

async function handleCheckout() {
    if (selectedNumbers.length === 0) return;

    checkoutBtn.classList.add('pointer-events-none', 'opacity-50');
    checkoutBtn.textContent = 'A gerar link...';
    paymentStatusEl.textContent = 'Aguarde, estamos a preparar o seu pagamento...';
    paymentStatusEl.classList.remove('hidden');

    const items = selectedNumbers.map(number => ({
        id: number,
        title: `Rifa - Número ${number}`,
        quantity: 1,
        unit_price: PRICE_PER_NUMBER,
        currency_id: 'BRL'
    }));

    const payerData = { ...currentUser, userId };

    try {
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            body: JSON.stringify({ items, payerData }),
        });
        if (!response.ok) throw new Error('Falha ao gerar o link de pagamento.');
        const data = await response.json();
        if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        }
    } catch (error) {
        console.error("Erro no checkout:", error);
        paymentStatusEl.textContent = 'Erro ao gerar o link de pagamento. Tente novamente.';
        checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
        checkoutBtn.textContent = 'Pagar com Mercado Pago';
    }
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
            button.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-70');
        } else {
            if (selectedNumbers.includes(numberStr)) {
                button.classList.add('number-selected');
            } else {
                button.classList.add('bg-blue-500', 'hover:bg-blue-400', 'number-available');
            }
            button.addEventListener('click', handleNumberClick);
        }
        numberGrid.appendChild(button);
    }
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
        userSection.classList.remove('hidden');
    }
}

function setupFirestoreListener() {
    onSnapshot(rifaDocRef, (doc) => {
        numbersData = doc.exists() ? doc.data() : {};
        welcomeUserSpan.textContent = currentUser.name;
        renderNumberGrid();
        loadingSection.classList.add('hidden');
        appSection.classList.remove('hidden');
    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
        mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa.</p>`;
    });
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

checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleCheckout();
});
saveUserBtn.addEventListener('click', saveUserData);
getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);


setupAuthListener();
