import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
// Garante que todo o código só é executado depois de a página estar carregada.
document.addEventListener('DOMContentLoaded', () => {
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
    const ADMIN_WHATSAPP_NUMBER = "5579996337995";

    // --- INICIALIZAÇÃO DOS SERVIÇOS ---
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const settingsDocRef = doc(db, "settings", "generalRules");

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

    // --- ESTADO DO APLICATIVO ---
    let currentUser = null;
    let userId = null;
    let numbersData = {};
    let selectedNumbers = [];
    let rifaDocRef;
    let PRICE_PER_NUMBER = 10;
    let isTestMode = false;

    // --- FUNÇÕES DE LÓGICA ---

    function setupAuthListener() {
        onAuthStateChanged(auth, user => {
            if (user) {
                userId = user.uid;
                loadUserDataOrShowLogin();
            } else {
                signInAnonymously(auth).catch(err => {
                    console.error("Auth Error", err);
                    if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Erro de autenticação.</p>`;
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
            setupWhatsAppButton();
            const soldCount = Object.keys(numbersData).filter(key => !isNaN(key) && key.length === 2).length;
            updateRaffleProgress(soldCount);
            updateRecentBuyers(numbersData);
            if (numbersData.winner) {
                displayPublicWinner(numbersData.winner);
                if (progressSection) progressSection.classList.add('hidden');
            } else {
                if (progressSection) progressSection.classList.remove('hidden');
            }
            renderNumberGrid();
            if (loadingSection) loadingSection.classList.add('hidden');
            if (appSection) appSection.classList.remove('hidden');
            checkPaymentStatus();
        }, (error) => {
            console.error("Erro ao carregar dados do Firestore:", error);
            if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa.</p>`;
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
        const totalPrice = selectedNumbers.length * PRICE_PER_NUMBER;
        totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
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
        if (!winnerDisplaySection || !publicWinnerNumber || !publicWinnerName || !publicWinnerBoughtNumbers) return;
        if (!winnerData || !winnerData.player) {
            winnerDisplaySection.classList.add('hidden');
            return;
        }
        const { number, player } = winnerData;
        publicWinnerNumber.textContent = number;
        publicWinnerName.textContent = player.name;
        publicWinnerBoughtNumbers.innerHTML = '';
        const winnerId = player.userId;
        const winnerNumbers = [];
        for (const numKey in numbersData) {
            if (numbersData[numKey] && numbersData[numKey].userId === winnerId) winnerNumbers.push(numKey);
        }
        winnerNumbers.sort().forEach(num => {
            const span = document.createElement('span');
            span.className = num === number ? 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white' : 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
            span.textContent = num;
            publicWinnerBoughtNumbers.appendChild(span);
        });
        winnerDisplaySection.classList.remove('hidden');
        if (shoppingCartSection) shoppingCartSection.classList.add('hidden');
    }

    async function handleCheckout() {
        if (isTestMode) return handleTestCheckout();
        const raffleId = rifaDocRef.id;
        if (selectedNumbers.length === 0) return;
        checkoutBtn.classList.add('pointer-events-none', 'opacity-50');
        checkoutBtn.textContent = 'A gerar link...';
        paymentStatusEl.textContent = 'Aguarde...';
        paymentStatusEl.classList.remove('hidden');
        const items = selectedNumbers.map(n => ({ id: n, title: `Rifa - ${numbersData.name} - Nº ${n}`, quantity: 1, unit_price: PRICE_PER_NUMBER, currency_id: 'BRL' }));
        const payerData = { ...currentUser, userId, raffleId };
        try {
            const res = await fetch('/.netlify/functions/create-payment', { method: 'POST', body: JSON.stringify({ items, payerData }) });
            if (!res.ok) throw new Error('Falha ao gerar link de pagamento.');
            const data = await res.json();
            if (data.checkoutUrl) {
                localStorage.setItem('pendingRaffleId', raffleId);
                localStorage.setItem('pendingNumbers', JSON.stringify(selectedNumbers));
                window.location.href = data.checkoutUrl;
            }
        } catch (e) {
            paymentStatusEl.textContent = 'Erro ao gerar link. Tente novamente.';
            checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
            checkoutBtn.textContent = 'Pagar com Mercado Pago';
        }
    }

    async function handleTestCheckout() {
        const raffleId = rifaDocRef.id;
        if (selectedNumbers.length === 0) return alert("Nenhum número selecionado.");
        if (!window.confirm(`-- MODO DE TESTE --\nConfirma a reserva dos números: ${selectedNumbers.join(', ')}?`)) return;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A processar...';
        try {
            const docSnap = await getDoc(rifaDocRef);
            const data = docSnap.data() || {};
            const taken = selectedNumbers.filter(n => data[n]);
            if (taken.length > 0) throw new Error(`Os números ${taken.join(', ')} já não estão disponíveis.`);
            const updates = {};
            selectedNumbers.forEach(n => { updates[n] = { ...currentUser, userId, raffleId, createdAt: new Date() }; });
            await updateDoc(rifaDocRef, updates);
            paymentStatusEl.textContent = `SUCESSO NO TESTE! Os seus números ${selectedNumbers.join(', ')} foram reservados.`;
            paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
            paymentStatusEl.classList.remove('hidden');
            triggerConfetti();
            if (shareModal) shareModal.style.display = 'flex';
            selectedNumbers = [];
            updateShoppingCart();
        } catch (e) {
            alert(`Ocorreu um erro: ${e.message}`);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        }
    }

    function checkPaymentStatus() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const pendingId = localStorage.getItem('pendingRaffleId');
        if (status && rifaDocRef.id === pendingId) {
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
    
    function updateRaffleProgress(count) {
        if (!progressSection || !progressBar || !progressPercentage) return;
        const percentage = Math.round((count / 100) * 100);
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
    }

    function updateRecentBuyers(data) {
        if (!recentBuyersList) return;
        const purchases = {};
        for (const key in data) {
            if (!isNaN(key) && key.length === 2) {
                const pData = data[key];
                if (pData?.userId && pData.createdAt) {
                    if (!purchases[pData.userId]) {
                        purchases[pData.userId] = { name: pData.name, numbers: [], lastPurchase: pData.createdAt.toDate() };
                    }
                    purchases[pData.userId].numbers.push(key);
                    if (pData.createdAt.toDate() > purchases[pData.userId].lastPurchase) {
                        purchases[pData.userId].lastPurchase = pData.createdAt.toDate();
                    }
                }
            }
        }
        const sorted = Object.values(purchases).sort((a,b) => b.lastPurchase - a.lastPurchase).slice(0, 5);
        recentBuyersList.innerHTML = '';
        if (sorted.length === 0) return recentBuyersList.innerHTML = '<p class="text-center text-gray-500">Seja o primeiro a participar!</p>';
        sorted.forEach(p => {
            const item = document.createElement('div');
            item.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between text-sm';
            p.numbers.sort();
            item.innerHTML = `<p><strong class="text-teal-400">${p.name}</strong> comprou o(s) número(s) ${p.numbers.map(n => `<span class="font-bold bg-blue-500 text-white px-2 py-1 rounded-full text-xs">${n}</span>`).join(' ')}</p><p class="text-gray-500 text-xs">${p.lastPurchase.toLocaleTimeString('pt-BR')}</p>`;
            recentBuyersList.appendChild(item);
        });
    }
    
    function triggerConfetti() {
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }

    function setupShareButtons() {
        if (!shareWhatsappBtn) return;
        const url = window.location.href;
        const text = `Estou a participar na rifa para ganhar um "${numbersData.name || 'prémio incrível'}"! Garanta os seus números também! ${url}`;
        shareWhatsappBtn.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        shareFacebookBtn.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        shareTwitterBtn.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        if (closeShareModalBtn) closeShareModalBtn.onclick = () => { if (shareModal) shareModal.style.display = 'none'; };
    }

    function setupWhatsAppButton() {
        if (!whatsappFloatBtn) return;
        const msg = encodeURIComponent(`Olá! Tenho uma dúvida sobre a rifa "${numbersData.name || ''}"`);
        whatsappFloatBtn.href = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${msg}`;
    }
    
    async function showRules() {
        if (!rulesModal || !rulesContent) return;
        try {
            rulesContent.innerHTML = '<p>A carregar...</p>';
            rulesModal.style.display = 'flex';
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists() && docSnap.data().text) {
                rulesContent.innerText = docSnap.data().text;
            } else {
                rulesContent.innerText = 'Nenhuma regra geral foi definida pelo administrador.';
            }
        } catch (error) {
            console.error("Erro ao buscar regras:", error);
            rulesContent.innerText = 'Não foi possível carregar as regras.';
        }
    }

    function closeRules() {
        if (rulesModal) rulesModal.style.display = 'none';
    }

    // --- INICIALIZAÇÃO E EVENTOS ---
    const urlParams = new URLSearchParams(window.location.search);
    const raffleId = urlParams.get('id');
    isTestMode = urlParams.get('test') === 'true'; 

    if (!raffleId) {
        if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar...</p>';
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
    }
    
    rifaDocRef = doc(db, "rifas", raffleId);

    if (isTestMode && checkoutBtn) {
        checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        checkoutBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        checkoutBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    }

    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    if (showRulesBtn) showRulesBtn.addEventListener('click', showRules);
    if (closeRulesModalBtn) closeRulesModalBtn.addEventListener('click', closeRules);
    
    setupAuthListener();
    setupShareButtons();
});
