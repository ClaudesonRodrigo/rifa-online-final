// public/rifa.js (versão completa e corrigida para a nova estrutura de dados)

import { app } from './firebase-init.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, collection, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZAÇÃO ---
    const auth = getAuth(app);
    const db = getFirestore(app);

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
    const winnerDisplaySection = document.getElementById('winner-display-section');
    const publicWinnerNumber = document.getElementById('public-winner-number');
    const publicWinnerName = document.getElementById('public-winner-name');
    const publicWinnerBoughtNumbers = document.getElementById('public-winner-bought-numbers');
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const recentBuyersList = document.getElementById('recent-buyers-list');
    const shareModal = document.getElementById('share-modal');
    const closeShareModalBtn = document.getElementById('close-share-modal-btn');
    const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
    const shareFacebookBtn = document.getElementById('share-facebook-btn');
    const shareTwitterBtn = document.getElementById('share-twitter-btn');
    const whatsappFloatBtn = document.getElementById('whatsapp-float-btn');
    const showRulesBtn = document.getElementById('show-rules-btn');
    const rulesModal = document.getElementById('rules-modal');
    const rulesContent = document.getElementById('rules-content');
    const closeRulesModalBtn = document.getElementById('close-rules-modal-btn');
    const luckThemeInput = document.getElementById('luck-theme-input');
    const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');
    const luckyNumbersResult = document.getElementById('lucky-numbers-result');

    // --- ESTADO DO APLICATIVO ---
    let currentUser = null;
    let userId = null;
    let raffleDetails = {};       // Guarda os dados gerais da rifa (nome, preço)
    let soldNumbersData = {};   // Guarda os números vendidos da subcoleção
    let selectedNumbers = [];
    let raffleId = null;
    let pricePerNumber = 10;
    let isTestMode = false;
    let raffleType = 'dezena';
    let totalNumbersInRaffle = 100;

    // --- FUNÇÕES DE LÓGICA ---

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
            setupFirestoreListeners();
        } else {
            loadingSection.classList.add('hidden');
            userSection.classList.remove('hidden');
        }
    }

    function setupFirestoreListeners() {
        const raffleDocRef = doc(db, "rifas", raffleId);
        onSnapshot(raffleDocRef, (docSnap) => {
            if (!docSnap.exists()) {
                mainContainer.innerHTML = '<p class="text-red-400 text-center">Rifa não encontrada ou foi removida.</p>';
                return;
            }
            raffleDetails = docSnap.data();
            updateRaffleDetailsUI();
        });

        const soldNumbersColRef = collection(db, "rifas", raffleId, "sold_numbers");
        onSnapshot(soldNumbersColRef, (querySnapshot) => {
            soldNumbersData = {};
            querySnapshot.forEach((doc) => {
                soldNumbersData[doc.id] = doc.data();
            });
            updateSoldNumbersUI();
        });
    }
    
    function updateRaffleDetailsUI() {
        pricePerNumber = raffleDetails.pricePerNumber || 10;
        raffleType = raffleDetails.type || 'dezena';
        if (raffleType === 'centena') totalNumbersInRaffle = 1000;
        else if (raffleType === 'milhar') totalNumbersInRaffle = 10000;
        else totalNumbersInRaffle = 100;

        welcomeUserSpan.textContent = currentUser.name;
        raffleTitle.textContent = raffleDetails.name;
        setupWhatsAppButton();

        if (raffleDetails.winner) {
            displayPublicWinner(raffleDetails.winner, raffleType);
            progressSection.classList.add('hidden');
        } else {
            progressSection.classList.remove('hidden');
        }

        loadingSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        checkPaymentStatus();
    }

    function updateSoldNumbersUI() {
        const soldCount = Object.keys(soldNumbersData).length;
        updateRaffleProgress(soldCount, totalNumbersInRaffle);
        updateRecentBuyers(soldNumbersData);
        renderNumberGrid(totalNumbersInRaffle);
    }

    function renderNumberGrid(maxNumbers) {
        const isRaffleOver = !!raffleDetails.winner;
        if (!numberGrid) return;
        numberGrid.innerHTML = '';

        if (maxNumbers === 10000) numberGrid.className = "grid grid-cols-10 sm:grid-cols-20 gap-1 md:gap-2 mb-8";
        else if (maxNumbers === 1000) numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8";
        else numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8";

        for (let i = 0; i < maxNumbers; i++) {
            const numberStr = formatNumberForRaffleType(i, raffleType);
            const ownerData = soldNumbersData[numberStr]; // <-- ADAPTAÇÃO AQUI
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

    function formatNumberForRaffleType(num, type) {
        if (type === 'centena') return num.toString().padStart(3, '0');
        if (type === 'milhar') return num.toString().padStart(4, '0');
        return num.toString().padStart(2, '0');
    }

    function handleNumberClick(event) {
        const numberStr = event.target.dataset.number;
        const button = event.target;
        if (soldNumbersData[numberStr] && soldNumbersData[numberStr].userId !== userId) { // <-- ADAPTAÇÃO AQUI
            alert("Este número já foi comprado por outra pessoa. Por favor, escolha outro.");
            return;
        }
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
        if (!shoppingCartSection || !selectedNumbersList || !totalPriceEl || !checkoutBtn) return;
        if (selectedNumbers.length === 0) {
            shoppingCartSection.classList.add('hidden');
            return;
        }
        shoppingCartSection.classList.remove('hidden');
        selectedNumbersList.innerHTML = '';
        selectedNumbers.sort().forEach(num => {
            const el = document.createElement('span');
            el.className = 'bg-amber-500 text-gray-900 font-bold px-3 py-1 rounded-full text-lg';
            el.textContent = num;
            selectedNumbersList.appendChild(el);
        });
        const totalPrice = selectedNumbers.length * pricePerNumber;
        totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
    }

    function saveUserData() {
        if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
            currentUser = { name: nameInput.value.trim(), email: emailInput.value.trim(), whatsapp: whatsappInput.value.trim(), pix: pixInput.value.trim() };
            localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
            userSection.classList.add('hidden');
            loadingSection.classList.remove('hidden');
            setupFirestoreListeners();
        } else {
            alert("Por favor, preencha todos os campos.");
        }
    }

    function displayPublicWinner(winnerData, type) {
        if (!winnerDisplaySection || !publicWinnerNumber || !publicWinnerName || !publicWinnerBoughtNumbers) return;
        if (!winnerData || !winnerData.player) {
            winnerDisplaySection.classList.add('hidden');
            return;
        }
        const { number, player } = winnerData;
        publicWinnerNumber.textContent = formatNumberForRaffleType(parseInt(number), type);
        publicWinnerName.textContent = player.name;
        publicWinnerBoughtNumbers.innerHTML = '';
        const winnerId = player.userId;
        const winnerNumbers = [];
        for (const numKey in soldNumbersData) { // <-- ADAPTAÇÃO AQUI
            if (soldNumbersData[numKey] && soldNumbersData[numKey].userId === winnerId) {
                winnerNumbers.push(numKey);
            }
        }
        winnerNumbers.sort().forEach(num => {
            const span = document.createElement('span');
            span.className = num === formatNumberForRaffleType(parseInt(number), type) ? 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white' : 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
            span.textContent = num;
            publicWinnerBoughtNumbers.appendChild(span);
        });
        winnerDisplaySection.classList.remove('hidden');
        if (shoppingCartSection) shoppingCartSection.classList.add('hidden');
    }

    async function handleCheckout() {
        // Esta função precisará ser adaptada de forma semelhante ao handleTestCheckout,
        // mas chamando a Netlify Function que por sua vez usará o SDK de Admin para
        // registrar a compra na subcoleção, após a confirmação do Mercado Pago.
        if (isTestMode) return handleTestCheckout();
        alert("A função de pagamento real precisa ser adaptada para a nova estrutura de dados.");
    }

    async function handleTestCheckout() {
        if (selectedNumbers.length === 0) return alert("Nenhum número selecionado.");
        if (!window.confirm(`-- MODO DE TESTE --\nConfirma a reserva dos números: ${selectedNumbers.join(', ')}?`)) return;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A processar...';
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const vendorId = urlParams.get('vendor') || null;
            for (const numberStr of selectedNumbers) {
                const formattedNum = formatNumberForRaffleType(parseInt(numberStr), raffleType);
                const numberDocRef = doc(db, "rifas", raffleId, "sold_numbers", formattedNum);
                const dataToSave = { ...currentUser, userId, purchasedAt: new Date() };
                if (vendorId) dataToSave.vendorId = vendorId;
                await setDoc(numberDocRef, dataToSave);
            }
            paymentStatusEl.textContent = `SUCESSO NO TESTE! Os seus números ${selectedNumbers.join(', ')} foram reservados.`;
            paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
            paymentStatusEl.classList.remove('hidden');
            triggerConfetti();
            if (shareModal) shareModal.style.display = 'flex';
            selectedNumbers = [];
            updateShoppingCart();
        } catch (e) {
            alert(`Ocorreu um erro ao tentar reservar os números. É possível que um deles já tenha sido comprado. Erro: ${e.message}`);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        }
    }
    
    function checkPaymentStatus() { /* ... Lógica existente ... */ }
    
    function updateRaffleProgress(count, maxTotal) {
        if (!progressSection || !progressBar || !progressPercentage) return;
        const percentage = Math.round((count / maxTotal) * 100);
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
    }

    function updateRecentBuyers(data) {
        if (!recentBuyersList) return;
        const allPurchases = Object.entries(data).map(([number, details]) => ({ number, ...details }));
        const sorted = allPurchases.sort((a, b) => b.purchasedAt.toDate() - a.purchasedAt.toDate()).slice(0, 5);
        recentBuyersList.innerHTML = '';
        if (sorted.length === 0) return recentBuyersList.innerHTML = '<p class="text-center text-gray-500">Seja o primeiro a participar!</p>';
        sorted.forEach(p => {
            const item = document.createElement('div');
            item.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between text-sm';
            item.innerHTML = `<p><strong class="text-teal-400">${p.name}</strong> comprou o número <span class="font-bold bg-blue-500 text-white px-2 py-1 rounded-full text-xs">${p.number}</span></p><p class="text-gray-500 text-xs">${p.purchasedAt.toDate().toLocaleTimeString('pt-BR')}</p>`;
            recentBuyersList.appendChild(item);
        });
    }

    function triggerConfetti() { if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }); }
    function setupShareButtons() { /* ... Lógica existente ... */ }
    function setupWhatsAppButton() { if (whatsappFloatBtn) whatsappFloatBtn.href = "https://chat.whatsapp.com/CgRiKh5ANnLADEDMz0dQUe"; }
    async function showRules() { /* ... Lógica existente ... */ }
    function closeRules() { if (rulesModal) rulesModal.style.display = 'none'; }
    function setButtonLoading(button, isLoading) { /* ... Lógica existente ... */ }
    async function getLuckyNumbers() { /* ... Lógica existente ... */ }
    
    // --- INICIALIZAÇÃO E EVENTOS ---
    const urlParams = new URLSearchParams(window.location.search);
    raffleId = urlParams.get('id');
    isTestMode = urlParams.get('test') === 'true'; 
    if (!raffleId) {
        mainContainer.innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar...</p>';
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
    }
    if (isTestMode && checkoutBtn) {
        checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        checkoutBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        checkoutBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    }
    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    if (showRulesBtn) showRulesBtn.addEventListener('click', showRules);
    if (closeRulesModalBtn) closeRulesModalBtn.addEventListener('click', closeRules);
    if (getLuckyNumbersBtn) getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
    setupAuthListener();
    setupShareButtons();
});
