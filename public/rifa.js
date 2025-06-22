import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
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
    const ADMIN_WHATSAPP_NUMBER = "5579996337995"; // Coloque o seu número de WhatsApp aqui

    // --- INICIALIZAÇÃO DOS SERVIÇOS ---
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
        if(publicWinnerNumber) publicWinnerNumber.textContent = number;
        if(publicWinnerName) publicWinnerName.textContent = player.name;
        if(publicWinnerBoughtNumbers) {
            publicWinnerBoughtNumbers.innerHTML = '';
            const winnerId = player.userId;
            const winnerNumbers = [];
            for (const numKey in numbersData) {
                if (numbersData[numKey] && numbersData[numKey].userId === winnerId) {
                    winnerNumbers.push(numKey);
                }
            }
            winnerNumbers.sort().forEach(num => {
                const span = document.createElement('span');
                span.className = num === number 
                    ? 'bg-green-400 text-gray-900 font-bold px-3 py-1 rounded-full ring-2 ring-white' 
                    : 'bg-gray-800 text-white font-bold px-3 py-1 rounded-full';
                span.textContent = num;
                publicWinnerBoughtNumbers.appendChild(span);
            });
        }
        if(winnerDisplaySection) winnerDisplaySection.classList.remove('hidden');
        if(shoppingCartSection) shoppingCartSection.classList.add('hidden');
    }

    async function handleCheckout() {
        if (isTestMode) {
            await handleTestCheckout();
            return;
        }
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

    async function handleTestCheckout() {
        const raffleId = rifaDocRef.id;
        if (selectedNumbers.length === 0) return alert("Você não selecionou nenhum número!");
        if (!window.confirm(`-- MODO DE TESTE --\n\nConfirma a reserva (sem custo) dos números: ${selectedNumbers.join(', ')}?`)) return;

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A processar teste...';
        try {
            const rifaDocSnapshot = await getDoc(rifaDocRef);
            const currentRifaData = rifaDocSnapshot.data() || {};
            const alreadyTaken = selectedNumbers.filter(num => currentRifaData[num]);
            if (alreadyTaken.length > 0) throw new Error(`Os números ${alreadyTaken.join(', ')} já não estão disponíveis.`);
            const updates = {};
            selectedNumbers.forEach(number => {
                updates[number] = { ...currentUser, userId, raffleId, createdAt: new Date() };
            });
            await updateDoc(rifaDocRef, updates);
            
            paymentStatusEl.textContent = `SUCESSO NO TESTE! Os seus números ${selectedNumbers.join(', ')} foram reservados.`;
            paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
            paymentStatusEl.classList.remove('hidden');
            triggerConfetti();
            if (shareModal) shareModal.style.display = 'flex';

            selectedNumbers = [];
            updateShoppingCart();
        } catch (error) {
            console.error("Erro ao finalizar aposta de teste:", error);
            alert(`Ocorreu um erro: ${error.message}`);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
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
                paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
                paymentStatusEl.classList.remove('hidden');
                triggerConfetti();
                if (shareModal) shareModal.style.display = 'flex';
            } else if (status === 'failure') {
                paymentStatusEl.textContent = 'O pagamento falhou. Por favor, tente novamente.';
                paymentStatusEl.className = 'text-center text-red-400 mt-4';
                paymentStatusEl.classList.remove('hidden');
            }
            localStorage.removeItem('pendingNumbers');
            localStorage.removeItem('pendingRaffleId');
            if (window.history.replaceState) {
                const newUrl = new URL(window.location);
                newUrl.search = '';
                window.history.replaceState({ path: newUrl.href }, '', newUrl.href);
            }
        }
    }
    
    function updateRaffleProgress(soldCount) {
        if (!progressSection || !progressBar || !progressPercentage) return;
        const percentage = Math.round((soldCount / 100) * 100);
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
    }

    function updateRecentBuyers(raffleData) {
        if (!recentBuyersList) return;
        const purchases = {};
        for (const key in raffleData) {
            if (!isNaN(key) && key.length === 2) {
                const purchaseData = raffleData[key];
                if (purchaseData && purchaseData.userId && purchaseData.createdAt) {
                    const userId = purchaseData.userId;
                    if (!purchases[userId]) {
                        purchases[userId] = { name: purchaseData.name, numbers: [], lastPurchase: purchaseData.createdAt.toDate() };
                    }
                    purchases[userId].numbers.push(key);
                    if (purchaseData.createdAt.toDate() > purchases[userId].lastPurchase) {
                        purchases[userId].lastPurchase = purchaseData.createdAt.toDate();
                    }
                }
            }
        }
        const sortedParticipants = Object.values(purchases).sort((a, b) => b.lastPurchase - a.lastPurchase).slice(0, 5);
        recentBuyersList.innerHTML = '';
        if (sortedParticipants.length === 0) {
            recentBuyersList.innerHTML = '<p class="text-center text-gray-500">Ainda ninguém participou. Seja o primeiro!</p>';
            return;
        }
        sortedParticipants.forEach(p => {
            const item = document.createElement('div');
            item.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between text-sm';
            p.numbers.sort();
            item.innerHTML = `<p><strong class="text-teal-400">${p.name}</strong> comprou o(s) número(s) ${p.numbers.map(n => `<span class="font-bold bg-blue-500 text-white px-2 py-1 rounded-full text-xs">${n}</span>`).join(' ')}</p><p class="text-gray-500 text-xs">${p.lastPurchase.toLocaleTimeString('pt-BR')}</p>`;
            recentBuyersList.appendChild(item);
        });
    }
    
    function triggerConfetti() {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
    }

    function setupShareButtons() {
        if (!shareWhatsappBtn) return;
        const shareText = `Estou a participar na rifa para ganhar um "${numbersData.name}"! Garanta os seus números também!`;
        const shareUrl = window.location.href.split('?')[0] + `?id=${rifaDocRef.id}`;
        
        shareWhatsappBtn.onclick = () => {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
            window.open(whatsappUrl, '_blank');
        };
        shareFacebookBtn.onclick = () => {
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            window.open(facebookUrl, '_blank');
        };
        shareTwitterBtn.onclick = () => {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, '_blank');
        };
        if(closeShareModalBtn) {
            closeShareModalBtn.onclick = () => {
                if(shareModal) shareModal.style.display = 'none';
            };
        }
    }

    function setupWhatsAppButton() {
        if (!whatsappFloatBtn) return;
        const message = encodeURIComponent(`Olá! Tenho uma dúvida sobre a rifa "${numbersData.name || ''}"`);
        whatsappFloatBtn.href = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${message}`;
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
    
    setupAuthListener();
    setupShareButtons();
});
