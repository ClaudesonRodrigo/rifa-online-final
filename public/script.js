// Importações dos serviços do Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const PRICE_PER_NUMBER = 10; // **NOVO**: Preço por número

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
// ... outros elementos
const shoppingCartSection = document.getElementById('shopping-cart-section');
const selectedNumbersList = document.getElementById('selected-numbers-list');
const totalPriceEl = document.getElementById('total-price');
const finalizeBetBtn = document.getElementById('finalize-bet-btn');


// --- ESTADO DO APLICATIVO ---
let currentUser = null;
let userId = null;
let numbersData = {}; // Dados que vêm do Firebase
let selectedNumbers = []; // **NOVO**: Carrinho de números selecionados localmente

// --- LÓGICA DO CARRINHO DE APOSTAS ---

function handleNumberClick(event) {
    const numberStr = event.target.dataset.number;
    const button = event.target;

    // Verifica se o número já está selecionado
    const index = selectedNumbers.indexOf(numberStr);

    if (index > -1) {
        // Se já está selecionado, remove
        selectedNumbers.splice(index, 1);
        button.classList.remove('number-selected');
        button.classList.add('number-available');
    } else {
        // Se não está selecionado, adiciona
        selectedNumbers.push(numberStr);
        button.classList.add('number-selected');
        button.classList.remove('number-available');
    }

    updateShoppingCart();
}

function updateShoppingCart() {
    if (selectedNumbers.length === 0) {
        shoppingCartSection.classList.add('hidden');
        return;
    }

    shoppingCartSection.classList.remove('hidden');

    // Atualiza a lista de números no carrinho
    selectedNumbersList.innerHTML = '';
    selectedNumbers.sort().forEach(num => {
        const numberEl = document.createElement('span');
        numberEl.className = 'bg-amber-500 text-gray-900 font-bold px-3 py-1 rounded-full text-lg';
        numberEl.textContent = num;
        selectedNumbersList.appendChild(numberEl);
    });

    // Atualiza o preço total
    const totalPrice = selectedNumbers.length * PRICE_PER_NUMBER;
    totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function handleFinalizeBet() {
    if (selectedNumbers.length === 0) {
        alert("Você não selecionou nenhum número!");
        return;
    }

    const confirmationMessage = `Você está prestes a finalizar a aposta com os números: ${selectedNumbers.join(', ')}.\nTotal a pagar: ${totalPriceEl.textContent}\n\nDeseja confirmar?`;
    if (!window.confirm(confirmationMessage)) {
        return;
    }

    finalizeBetBtn.disabled = true;
    finalizeBetBtn.textContent = 'Processando...';

    try {
        // Usamos um "batch write" para garantir que todos os números sejam salvos juntos
        // ou nenhum deles, evitando erros parciais.
        const batch = writeBatch(db);
        
        selectedNumbers.forEach(number => {
            // Criamos um objeto de atualização para cada número.
            // A sintaxe [number] usa o valor da variável (ex: "05") como a chave do campo.
            const fieldUpdate = { [number]: { ...currentUser, userId } };
            batch.update(rifaDocRef, fieldUpdate);
        });

        // Envia todas as atualizações para o Firebase de uma vez.
        await batch.commit();

        alert("Aposta finalizada com sucesso! Boa sorte!");
        
        // Limpa o carrinho e reseta a UI
        selectedNumbers = [];
        updateShoppingCart();
        // A atualização da grade (números ficando roxos) acontecerá automaticamente
        // pelo `onSnapshot` que já está ouvindo as mudanças no Firebase.

    } catch (error) {
        console.error("Erro ao finalizar aposta:", error);
        alert("Ocorreu um erro ao salvar seus números. Por favor, tente novamente.");
    } finally {
        finalizeBetBtn.disabled = false;
        finalizeBetBtn.textContent = 'Finalizar Aposta';
    }
}

// --- FUNÇÕES EXISTENTES (Com pequenas adaptações) ---

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
                // Adicionar tooltip aqui se desejar
            }
        } else {
            // **ADAPTAÇÃO**: Se o número está no carrinho local, ele já deve aparecer como selecionado
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


// --- INICIALIZAÇÃO E OUTRAS FUNÇÕES (sem grandes mudanças) ---
// (O resto do seu script.js: setupAuthListener, loadUserDataOrShowLogin, etc. pode continuar aqui)

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
        renderNumberGrid();
        // Esconde o loading e mostra o app só depois de carregar os dados
        loadingSection.classList.add('hidden');
        appSection.classList.remove('hidden');
    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
        mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa. Verifique sua conexão e as regras de segurança do Firebase.</p>`;
    });
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
        userSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        setupFirestoreListener();
    } else {
        alert("Por favor, preencha todos os campos.");
    }
}

// ... (Restante das funções como getLuckyNumbers, declareWinner, etc.)

// --- EVENT LISTENERS ---
saveUserBtn.addEventListener('click', saveUserData);
finalizeBetBtn.addEventListener('click', handleFinalizeBet);
// ... outros event listeners ...

// --- INÍCIO DA APLICAÇÃO ---
setupAuthListener();

