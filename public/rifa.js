import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Adicionamos 'getDoc' e 'updateDoc' para a função de teste
import { getFirestore, doc, onSnapshot, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// --- ESTADO DO APLICATIVO ---
let currentUser = null;
let userId = null;
let numbersData = {};
let selectedNumbers = [];
let rifaDocRef;
let PRICE_PER_NUMBER = 10;
let isTestMode = false; // Variável para controlar o modo de teste

// --- LÓGICA DE TESTE ---
async function handleTestCheckout() {
    const raffleId = rifaDocRef.id;
    if (selectedNumbers.length === 0) {
        alert("Você não selecionou nenhum número!");
        return;
    }

    const confirmation = window.confirm(`-- MODO DE TESTE --\n\nVocê confirma a reserva (sem custo) dos números: ${selectedNumbers.join(', ')}?`);
    if (!confirmation) return;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'A processar teste...';

    try {
        // Lógica de transação segura, executada diretamente no frontend (apenas para teste)
        const rifaDocSnapshot = await getDoc(rifaDocRef);
        const currentRifaData = rifaDocSnapshot.data() || {};
        const alreadyTaken = selectedNumbers.filter(num => currentRifaData[num]);

        if (alreadyTaken.length > 0) {
            throw new Error(`Os números ${alreadyTaken.join(', ')} já não estão disponíveis.`);
        }

        const updates = {};
        selectedNumbers.forEach(number => {
            updates[number] = { ...currentUser, userId, raffleId };
        });

        await updateDoc(rifaDocRef, updates);
        
        alert("Aposta de teste finalizada com sucesso! Os seus números foram reservados e os dados devem aparecer no painel de admin.");
        selectedNumbers = [];
        updateShoppingCart();

    } catch (error) {
        console.error("Erro ao finalizar aposta de teste:", error);
        alert(`Ocorreu um erro ao guardar os seus números: ${error.message}`);
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
    }
}


// --- FUNÇÕES DE LÓGICA (Com adaptações) ---

async function handleCheckout() {
    // Se estiver em modo de teste, executa a função de teste
    if (isTestMode) {
        await handleTestCheckout();
        return;
    }
    
    // Senão, continua com o fluxo normal do Mercado Pago
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
            // ... lógica do ganhador
        }
        renderNumberGrid();
        
        if(loadingSection) loadingSection.classList.add('hidden');
        if(appSection) appSection.classList.remove('hidden');
        checkPaymentStatus();

    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
    });
}

function renderNumberGrid() {
    // ... código sem alterações ...
}
function handleNumberClick(event) {
    // ... código sem alterações ...
}
function updateShoppingCart() {
    // ... código sem alterações ...
}
function saveUserData() {
    // ... código sem alterações ...
}
// ... (resto das funções)

// --- INICIALIZAÇÃO E EVENTOS ---
function main() {
    const urlParams = new URLSearchParams(window.location.search);
    const raffleId = urlParams.get('id');
    isTestMode = urlParams.get('test') === 'true'; // Verifica se está em modo de teste

    if (!raffleId) {
        if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar...</p>';
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
    }
    
    rifaDocRef = doc(db, "rifas", raffleId);

    if (isTestMode) {
        if(checkoutBtn) {
            checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
            checkoutBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
            checkoutBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
        }
        console.warn("MODO DE TESTE ATIVADO. Nenhum pagamento real será processado.");
    }

    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    
    setupAuthListener();
}

main();

