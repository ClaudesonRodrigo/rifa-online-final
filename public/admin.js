// public/rifa.js - Versão com Cotas e Otimização de Grade

import { app } from './firebase-init.js';
import { getFirestore, doc, onSnapshot, getDoc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
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
    const myNumbersSection = document.getElementById('my-numbers-section');
    const myNumbersList = document.getElementById('my-numbers-list');
    const cotasSection = document.getElementById('cotas-section'); // Seletor para a nova seção

    // --- ESTADO DO APLICATIVO ---
    let currentUser = null;
    let userId = null;
    let raffleDetails = {};
    let soldNumbersData = {};
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

    function displayMyNumbers(myNumbers) {
        if (!myNumbersSection || !myNumbersList) return;
        if (myNumbers.length === 0) {
            myNumbersSection.classList.add('hidden');
            return;
        }
        myNumbersSection.classList.remove('hidden');
        myNumbersList.innerHTML = '';
        myNumbers.sort().forEach(num => {
            const el = document.createElement('span');
            el.className = 'bg-purple-600 text-white font-bold px-4 py-2 rounded-full text-lg shadow-lg';
            el.textContent = num;
            myNumbersList.appendChild(el);
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

    // ✅ NOVA FUNÇÃO: Lida com o clique nos botões de cota
    const handleCotaClick = (event) => {
        if (!event.target.classList.contains('cota-btn')) return;

        const quantity = parseInt(event.target.dataset.quantity, 10);
        
        const allPossibleNumbers = Array.from({ length: totalNumbersInRaffle }, (_, i) => formatNumberForRaffleType(i, raffleType));
        const availableNumbers = allPossibleNumbers.filter(num => !soldNumbersData[num]);

        if (availableNumbers.length < quantity) {
            return alert(`Não há ${quantity} números disponíveis para esta cota. Por favor, escolha uma cota menor ou selecione manually.`);
        }

        for (let i = availableNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
        }

        const randomSelection = availableNumbers.slice(0, quantity);

        selectedNumbers = []; 
        randomSelection.forEach(num => {
            if (!selectedNumbers.includes(num)) {
                selectedNumbers.push(num);
            }
        });
        
        alert(`${quantity} números aleatórios foram adicionados ao seu carrinho!`);
        updateShoppingCart();
        renderNumberGrid(totalNumbersInRaffle);
        shoppingCartSection.scrollIntoView({ behavior: 'smooth' });
    };

    function setupFirestoreListeners() {
        const raffleDocRef = doc(db, "rifas", raffleId);
        onSnapshot(raffleDocRef, (docSnap) => {
            if (!docSnap.exists()) {
                mainContainer.innerHTML = `<p class="text-red-400 text-center">Sorteio não encontrado ou foi removido.</p>`;
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
        if (welcomeUserSpan && currentUser) welcomeUserSpan.textContent = currentUser.name;
        if (raffleTitle) raffleTitle.textContent = raffleDetails.name;
        if (raffleDetails.winner) {
            displayPublicWinner(raffleDetails.winner);
            if (progressSection) progressSection.classList.add('hidden');
        } else {
            if (progressSection) progressSection.classList.remove('hidden');
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
        const myNumbers = Object.keys(soldNumbersData).filter(number => soldNumbersData[number]?.userId === userId);
        displayMyNumbers(myNumbers);
    }

    // ✅ FUNÇÃO ATUALIZADA: Renderiza a grade de números de forma otimizada
    function renderNumberGrid(maxNumbers) {
        const isRaffleOver = !!raffleDetails.winner;
        if (!numberGrid) return;
        
        numberGrid.innerHTML = '';

        if (maxNumbers >= 1000) { // Lógica simplificada para centena e milhar
            numberGrid.className = "grid-milhar mb-8";
        } else {
            numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8";
        }

        const allPossibleNumbers = Array.from({ length: maxNumbers }, (_, i) => formatNumberForRaffleType(i, raffleType));
        let numbersToDisplay = [];

        if (maxNumbers > 200) {
            // Para sorteios grandes, mostra apenas os primeiros 200 disponíveis
            numbersToDisplay = allPossibleNumbers.filter(num => !soldNumbersData[num]).slice(0, 200);
        } else {
            // Para sorteios pequenos, mostra todos
            numbersToDisplay = allPossibleNumbers;
        }

        if (numbersToDisplay.length === 0 && Object.keys(soldNumbersData).length > 0) {
            numberGrid.innerHTML = '<p class="col-span-full text-center text-gray-400">Parece que todos os números visíveis foram comprados. Tente uma cota aleatória!</p>';
            return;
        }

        numbersToDisplay.forEach(numberStr => {
            const ownerData = soldNumbersData[numberStr];
            const button = document.createElement('button');
            button.textContent = numberStr;
            button.dataset.number = numberStr;
            let buttonClasses = "p-2 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-all duration-200 ease-in-out";
            if (ownerData) {
                button.disabled = true;
                buttonClasses += (ownerData.userId === userId ? ' bg-purple-600' : ' bg-gray-600') + ' cursor-not-allowed opacity-70';
            } else {
                if (isRaffleOver) {
                    button.disabled = true;
                    buttonClasses += ' bg-gray-700 cursor-not-allowed opacity-50';
                } else {
                    buttonClasses += selectedNumbers.includes(numberStr) ? ' number-selected' : ' bg-blue-500 hover:bg-blue-400 number-available';
                    button.addEventListener('click', handleNumberClick);
                }
            }
            button.className = buttonClasses;
            numberGrid.appendChild(button);
        });
    }

    function formatNumberForRaffleType(num, type) {
        if (type === 'centena') return num.toString().padStart(3, '0');
        if (type === 'milhar') return num.toString().padStart(4, '0');
        return num.toString().padStart(2, '0');
    }

    function handleNumberClick(event) {
        const numberStr = event.target.dataset.number;
        const button = event.target;
        if (soldNumbersData[numberStr] && soldNumbersData[numberStr].userId !== userId) {
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

    function displayPublicWinner(winnerData) {
        if (!winnerData || !winnerData.player) {
            if(winnerDisplaySection) winnerDisplaySection.classList.add('hidden');
            return;
        }
        const { number, player } = winnerData;
        publicWinnerNumber.textContent = formatNumberForRaffleType(parseInt(number), raffleType);
        publicWinnerName.textContent = player.name;
        publicWinnerBoughtNumbers.innerHTML = '';
        const winnerId = player.userId;
        const winnerNumbers = [];
        for (const numKey in soldNumbersData) {
            if (soldNumbersData[numKey] && soldNumbersData[numKey].userId === winnerId) {
                winnerNumbers.push(numKey);
            }
        }
        winnerNumbers.sort().forEach(num => {
            const span = document.createElement('span');
            span.className = num === formatNumberForRaffleType(parseInt(number), raffleType) ? 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white' : 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
            span.textContent = num;
            publicWinnerBoughtNumbers.appendChild(span);
        });
        winnerDisplaySection.classList.remove('hidden');
        if (shoppingCartSection) shoppingCartSection.classList.add('hidden');
    }

    async function handleCheckout() {
        if (isTestMode) return handleTestCheckout();
        if (selectedNumbers.length === 0) return;

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A gerar link...';
        paymentStatusEl.textContent = 'Aguarde...';
        paymentStatusEl.classList.remove('hidden');
        
        const items = selectedNumbers.map(n => ({
            id: formatNumberForRaffleType(parseInt(n), raffleType),
            title: `Rifa - ${raffleDetails.name} - Nº ${n}`,
            quantity: 1,
            unit_price: pricePerNumber,
            currency_id: 'BRL'
        }));
        
        const urlParams = new URLSearchParams(window.location.search);
        const vendorId = urlParams.get('vendor') || null;
        const payerData = { ...currentUser, userId, raffleId: raffleId, vendorId: vendorId };

        try {
            const res = await fetch('/.netlify/functions/create-payment', { 
                method: 'POST', 
                body: JSON.stringify({ items, payerData }) 
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Falha ao gerar link de pagamento.');
            }
            const data = await res.json();
            if (data.checkoutUrl) {
                localStorage.setItem('pendingRaffleId', raffleId);
                localStorage.setItem('pendingNumbers', JSON.stringify(selectedNumbers));
                window.location.href = data.checkoutUrl;
            }
        } catch (e) {
            paymentStatusEl.textContent = `Erro: ${e.message}`;
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Pagar com Mercado Pago';
        }
    }

    function checkPaymentStatus() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const pendingId = localStorage.getItem('pendingRaffleId');
        if (status && raffleId && raffleId === pendingId) {
            const numbers = localStorage.getItem('pendingNumbers');
            if (status === 'approved' && numbers) {
                paymentStatusEl.textContent = `Pagamento aprovado! Os seus números ${JSON.parse(numbers).join(', ')} foram reservados.`;
                paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
                paymentStatusEl.classList.remove('hidden');
                triggerConfetti();
                if (shareModal) shareModal.style.display = 'flex';
            } else if (status === 'failure') {
                paymentStatusEl.textContent = 'O pagamento falhou. Tente novamente.';
                paymentStatusEl.className = 'text-center text-red-400 mt-4';
                paymentStatusEl.classList.remove('hidden');
            }
            localStorage.removeItem('pendingNumbers');
            localStorage.removeItem('pendingRaffleId');
            if (window.history.replaceState) {
                const url = new URL(window.location);
                url.search = '';
                window.history.replaceState({path:url.href}, '', url.href);
            }
        }
    }

    // --- Outras Funções (sem alterações) ---
    function updateRaffleProgress(count, maxTotal) { /* ... */ }
    function updateRecentBuyers(data) { /* ... */ }
    function triggerConfetti() { /* ... */ }
    function setupShareButtons() { /* ... */ }
    async function showRules() { /* ... */ }
    function closeRules() { /* ... */ }
    async function getLuckyNumbers() { /* ... */ }
    
    // --- INICIALIZAÇÃO E EVENTOS ---
    const urlParams = new URLSearchParams(window.location.search);
    raffleId = urlParams.get('id');
    if (!raffleId) { /* ... */ return; }
    
    saveUserBtn.addEventListener('click', saveUserData);
    checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    showRulesBtn.addEventListener('click', showRules);
    closeRulesModalBtn.addEventListener('click', closeRules);
    getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
    cotasSection.addEventListener('click', handleCotaClick);
    setupAuthListener();
});
