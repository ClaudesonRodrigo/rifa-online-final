// public/rifa.js (Versão final, corrigida em 11/07/2025)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, getDoc, setDoc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { app } from './firebase-init.js';


document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DOS SERVIÇOS ---
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
    const showRulesBtn = document.getElementById('show-rules-btn');
    const rulesModal = document.getElementById('rules-modal');
    const rulesContent = document.getElementById('rules-content');
    const closeRulesModalBtn = document.getElementById('close-rules-modal-btn');
    const luckThemeInput = document.getElementById('luck-theme-input');
    const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');
    const luckyNumbersResult = document.getElementById('lucky-numbers-result');
    const myNumbersSection = document.getElementById('my-numbers-section');
    const myNumbersList = document.getElementById('my-numbers-list');
    const cotasSection = document.getElementById('cotas-section');
    const cpfInput = document.getElementById('cpf'); // ✅ Novo seletor CPF
    const pixModal = document.getElementById('pix-modal'); // ✅ Novos seletores do Modal
    const pixQrCodeContainer = document.getElementById('pix-qrcode-container');
    const pixQrCodeImage = document.getElementById('pix-qrcode-image');
    const pixPayloadInput = document.getElementById('pix-payload-input');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const copyPixFeedback = document.getElementById('copy-pix-feedback');
    const closePixModalBtn = document.getElementById('close-pix-modal-btn');
    

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
    const copyPixPayload = () => {
        pixPayloadInput.select();
        document.execCommand('copy');
        copyPixFeedback.classList.remove('hidden');
        setTimeout(() => {
            copyPixFeedback.classList.add('hidden');
        }, 2000);
    };

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
    const handleCotaClick = (event) => {
    if (!event.target.classList.contains('cota-btn')) return;

    const quantity = parseInt(event.target.dataset.quantity, 10);
    
    const allPossibleNumbers = Array.from({ length: totalNumbersInRaffle }, (_, i) => formatNumberForRaffleType(i, raffleType));
    
    const availableNumbers = allPossibleNumbers.filter(num => !soldNumbersData[num]);

    if (availableNumbers.length < quantity) {
        return alert(`Não há ${quantity} números disponíveis para esta cota. Por favor, escolha uma cota menor ou selecione manualmente.`);
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
                mainContainer.innerHTML = `<p class="text-red-400 text-center">Rifa não encontrada ou foi removida.</p>`;
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
        if (welcomeUserSpan) welcomeUserSpan.textContent = currentUser.name;
        if (raffleTitle) raffleTitle.textContent = raffleDetails.name;
        setupWhatsAppButton();
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

    // ✅ FUNÇÃO CORRIGIDA E SEM CONFLITOS ✅
    function updateSoldNumbersUI() {
        const soldCount = Object.keys(soldNumbersData).length;
        updateRaffleProgress(soldCount, totalNumbersInRaffle);
        updateRecentBuyers(soldNumbersData);
        renderNumberGrid(totalNumbersInRaffle);
    
        // Filtra a lista de todos os números vendidos para encontrar apenas os do usuário atual
        const myNumbers = Object.keys(soldNumbersData).filter(
            number => soldNumbersData[number]?.userId === userId
        );
    
        // Chama a nova função para exibir os números encontrados
        displayMyNumbers(myNumbers);
    }

 function renderNumberGrid(maxNumbers) {
    const isRaffleOver = !!raffleDetails.winner;
    if (!numberGrid) return;
    
    numberGrid.innerHTML = '';

    // Aplica a classe responsiva para sorteios grandes
    if (maxNumbers >= 1000) {
        numberGrid.className = "grid-milhar mb-8";
    } else {
        numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8";
    }

    const allPossibleNumbers = Array.from({ length: maxNumbers }, (_, i) => formatNumberForRaffleType(i, raffleType));
    let numbersToDisplay = [];

    // Para sorteios grandes, mostra apenas os primeiros 200 disponíveis
    if (maxNumbers > 200) {
        numbersToDisplay = allPossibleNumbers.filter(num => !soldNumbersData[num]).slice(0, 200);
    } else {
        // Para sorteios pequenos, mostra todos os disponíveis
        numbersToDisplay = allPossibleNumbers.filter(num => !soldNumbersData[num]);
    }

    if (numbersToDisplay.length === 0 && Object.keys(soldNumbersData).length > 0) {
        numberGrid.innerHTML = '<p class="col-span-full text-center text-gray-400">Parece que todos os números visíveis foram comprados. Tente uma cota aleatória!</p>';
        return;
    }
    
    // O loop agora itera sobre a lista otimizada
    numbersToDisplay.forEach(numberStr => {
        const button = document.createElement('button');
        button.textContent = numberStr;
        button.dataset.number = numberStr;
        let buttonClasses = "p-2 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-all duration-200 ease-in-out";
        const isSelected = selectedNumbers.includes(numberStr);

        if (isRaffleOver) {
            button.disabled = true;
            buttonClasses += ' bg-gray-700 cursor-not-allowed opacity-50';
        } else {
            buttonClasses += isSelected ? ' number-selected' : ' bg-blue-500 hover:bg-blue-400 number-available';
            button.addEventListener('click', handleNumberClick);
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
        // Valida apenas os campos que existem neste projeto
        if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
            currentUser = { 
                name: nameInput.value.trim(), 
                email: emailInput.value.trim(), 
                whatsapp: whatsappInput.value.trim(), 
                pix: pixInput.value.trim() 
            };
            localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
            
            userSection.classList.add('hidden');
            // A linha abaixo foi corrigida para appSection, que é o que mostra a grade
            appSection.classList.remove('hidden'); 
            
            // Removemos o loadingSection, pois a próxima função já lida com isso
            setupFirestoreListeners();
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

   // ✅ 'handleCheckout'
    async function handleCheckout() {
        if (isTestMode) return handleTestCheckout();
        if (selectedNumbers.length === 0) return;
    
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Gerando link seguro...';
        paymentStatusEl.textContent = 'Aguarde, conectando com nosso sistema de pagamento...';
        paymentStatusEl.classList.remove('hidden');
        
        const items = selectedNumbers.map(n => ({ 
            id: n, 
            title: `Sorteio - ${raffleDetails.name} - Nº ${n}`, 
            quantity: 1, 
            unit_price: pricePerNumber
        }));
        
        const urlParams = new URLSearchParams(window.location.search);
        const vendorId = urlParams.get('vendor') || null;
        const payerData = { ...currentUser, userId, vendorId: vendorId };
    
        try {
            // Aponta para a nova função da Stripe
            const res = await fetch('/.netlify/functions/create-stripe-payment-session', { 
                method: 'POST',
                body: JSON.stringify({ items, raffleId, payerData }) 
            });
    
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Falha ao gerar link de pagamento.');
            }
    
            const data = await res.json();
            
            if (data.checkoutUrl) {
                localStorage.setItem('pendingRaffleId', raffleId);
                localStorage.setItem('pendingNumbers', JSON.stringify(selectedNumbers));
                // Redireciona para a página da Stripe
                window.location.href = data.checkoutUrl;
            }
        } catch (e) {
            paymentStatusEl.textContent = `Erro: ${e.message}`;
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Tentar Novamente';
        }
    }

    async function handleTestCheckout() {
        if (selectedNumbers.length === 0) return alert("Nenhum número selecionado.");
        if (!window.confirm(`-- MODO DE TESTE --\nConfirma a reserva dos números: ${selectedNumbers.join(', ')}?`)) return;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A processar...';
        try {
            const soldNumbersColRef = collection(db, "rifas", raffleId, "sold_numbers");
            const checkPromises = selectedNumbers.map(num => getDoc(doc(soldNumbersColRef, num)));
            const results = await Promise.all(checkPromises);
            const alreadyTaken = results.find(docSnap => docSnap.exists());
            if (alreadyTaken) {
                throw new Error(`O número ${alreadyTaken.id} já não está disponível.`);
            }
            const urlParams = new URLSearchParams(window.location.search);
            const vendorId = urlParams.get('vendor') || null;
            const dataToSave = { ...currentUser, userId, createdAt: new Date() };
            if (vendorId) {
                dataToSave.vendorId = vendorId;
            }
            const batch = writeBatch(db);
            selectedNumbers.forEach(numberStr => {
                const newDocRef = doc(soldNumbersColRef, numberStr);
                batch.set(newDocRef, dataToSave);
            });
            await batch.commit();
            paymentStatusEl.textContent = `SUCESSO NO TESTE! Os seus números foram reservados.`;
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
    
    // ✅ SUBSTITUA SUA FUNÇÃO 'checkPaymentStatus' POR ESTA
    function checkPaymentStatus() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('pagamento'); // Procura por 'pagamento=sucesso' ou 'pagamento=cancelado'
        const sessionId = params.get('session_id');
        const pendingId = localStorage.getItem('pendingRaffleId');
    
        if (status && raffleId && raffleId === pendingId) {
            const numbers = localStorage.getItem('pendingNumbers');
            if (status === 'sucesso' && numbers) {
                paymentStatusEl.textContent = `Pagamento aprovado! Os seus números ${JSON.parse(numbers).join(', ')} foram reservados.`;
                paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
                paymentStatusEl.classList.remove('hidden');
                triggerConfetti();
                if (shareModal) shareModal.style.display = 'flex';
            } else if (status === 'cancelado') {
                paymentStatusEl.textContent = 'O pagamento foi cancelado. Você pode tentar novamente.';
                paymentStatusEl.className = 'text-center text-yellow-400 mt-4';
                paymentStatusEl.classList.remove('hidden');
            }
            
            // Limpa o localStorage e a URL para não mostrar a mensagem novamente
            localStorage.removeItem('pendingNumbers');
            localStorage.removeItem('pendingRaffleId');
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('pagamento');
            cleanUrl.searchParams.delete('session_id');
            window.history.replaceState({}, document.title, cleanUrl.href);
        }
    }

    function updateRaffleProgress(count, maxTotal) {
        if (!progressSection || !progressBar || !progressPercentage) return;
        const percentage = Math.round((count / maxTotal) * 100);
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
    }

    function updateRecentBuyers(data) {
        if (!recentBuyersList) return;
    
        const purchasesByUser = {};
        for (const number in data) {
            const purchaseDetails = data[number];
            if (purchaseDetails && purchaseDetails.userId && purchaseDetails.createdAt?.toDate) {
                const userId = purchaseDetails.userId;
            
                if (!purchasesByUser[userId]) {
                    purchasesByUser[userId] = {
                        name: purchaseDetails.name,
                        numbers: [],
                        lastPurchase: purchaseDetails.createdAt.toDate()
                    };
                }
            
                purchasesByUser[userId].numbers.push(number);
            
                if (purchaseDetails.createdAt.toDate() > purchasesByUser[userId].lastPurchase) {
                    purchasesByUser[userId].lastPurchase = purchaseDetails.createdAt.toDate();
                }
            }
        }
    
        const sortedUsers = Object.values(purchasesByUser).sort((a, b) => {
            return b.lastPurchase - a.lastPurchase;
        }).slice(0, 5);
    
        recentBuyersList.innerHTML = '';
        if (sortedUsers.length === 0) {
            recentBuyersList.innerHTML = '<p class="text-center text-gray-500">Seja o primeiro a participar!</p>';
            return;
        }
    
        sortedUsers.forEach(p => {
            const item = document.createElement('div');
            item.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between text-sm';
            p.numbers.sort();
            const purchaseTime = p.lastPurchase.toLocaleTimeString('pt-BR');
            item.innerHTML = `<p><strong class="text-teal-400">${p.name}</strong> comprou o(s) número(s) ${p.numbers.map(n => `<span class="font-bold bg-blue-500 text-white px-2 py-1 rounded-full text-xs">${n}</span>`).join(' ')}</p><p class="text-gray-500 text-xs">${purchaseTime}</p>`;
            recentBuyersList.appendChild(item);
        });
    }

    function triggerConfetti() {
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }

    function setupShareButtons() {
        if (!shareWhatsappBtn) return;
        const url = window.location.href;
        const text = `Estou a participar na rifa para ganhar um "${raffleDetails.name || 'prémio incrível'}"! Garanta os seus números também! ${url}`;
        shareWhatsappBtn.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        shareFacebookBtn.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        shareTwitterBtn.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        if (closeShareModalBtn) closeShareModalBtn.onclick = () => { if (shareModal) shareModal.style.display = 'none'; };
    }

    function setupWhatsAppButton() {
        if (whatsappFloatBtn) whatsappFloatBtn.href = "https://chat.whatsapp.com/CgRiKh5ANnLADEDMz0dQUe";
    }
    
    async function showRules() {
        const settingsDocRef = doc(db, "settings", "generalRules");
        if (!rulesModal || !rulesContent) return;
        rulesContent.innerHTML = '<p>A carregar...</p>';
        rulesModal.style.display = 'flex';
        try {
            const docSnap = await getDoc(settingsDocRef);
            rulesContent.innerText = (docSnap.exists() && docSnap.data().text) ? docSnap.data().text : 'Nenhuma regra geral definida.';
        } catch (e) {
            rulesContent.innerText = 'Não foi possível carregar as regras.';
        }
    }

    function closeRules() {
        if (rulesModal) rulesModal.style.display = 'none';
    }

    function setButtonLoading(button, isLoading) {
        if(!button) return;
        const text = button.querySelector('.gemini-button-text');
        const spinner = button.querySelector('i.fa-spinner');
        if (text && spinner) {
            button.disabled = isLoading;
            text.classList.toggle('hidden', isLoading);
            spinner.classList.toggle('hidden', !isLoading);
        }
    }
    
    async function getLuckyNumbers() {
        if (!luckThemeInput || !luckyNumbersResult || !getLuckyNumbersBtn) return;
        const theme = luckThemeInput.value.trim();
        if (!theme) {
            luckyNumbersResult.innerHTML = `<p class="text-yellow-400">Por favor, digite um tema para o Oráculo.</p>`;
            return;
        }
        setButtonLoading(getLuckyNumbersBtn, true);
        luckyNumbersResult.innerHTML = `<p class="text-purple-300">A consultar o cosmos...</p>`;
        try {
            const response = await fetch(`/.netlify/functions/getLuckyNumbers`, { method: "POST", body: JSON.stringify({ theme: theme, raffleType: raffleType }) });
            if (!response.ok) throw new Error('Resposta da função Netlify não foi OK.');
            const data = await response.json();
            
            let html = '<div class="grid md:grid-cols-3 gap-4">';
            if (data.sugestoes && data.sugestoes.length > 0) {
                data.sugestoes.forEach(s => {
                    const formattedSuggestedNumber = formatNumberForRaffleType(parseInt(s.numero), raffleType);
                    const isSold = soldNumbersData[formattedSuggestedNumber];
                    const buttonClass = isSold ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-blue-500 hover:bg-blue-400 number-available cursor-pointer';
                    const buttonText = isSold ? `${formattedSuggestedNumber} (Vendido)` : formattedSuggestedNumber;
                    html += `<div class="bg-gray-700 p-4 rounded-lg border border-purple-500 flex flex-col items-center"><p class="text-2xl font-bold text-purple-300 mb-2">${s.explicacao}</p><button class="${buttonClass} p-2 rounded-lg text-lg font-bold w-full mt-2" data-number="${formattedSuggestedNumber}" ${isSold ? 'disabled' : ''}>${buttonText}</button></div>`;
                });
            } else {
                html += `<p class="text-gray-400 col-span-full">O Oráculo não conseguiu gerar sugestões.</p>`;
            }
            html += '</div>';
            luckyNumbersResult.innerHTML = html;
            luckyNumbersResult.querySelectorAll('button[data-number]:not([disabled])').forEach(button => {
                button.addEventListener('click', (e) => {
                    const gridButton = numberGrid.querySelector(`button[data-number="${e.target.dataset.number}"]`);
                    if (gridButton && !gridButton.disabled) handleNumberClick({ target: gridButton });
                });
            });
        } catch (error) {
            console.error("Erro ao chamar a função getLuckyNumbers:", error);
            luckyNumbersResult.innerHTML = `<p class="text-red-400">O Oráculo está com dor de cabeça. Tente de novo.</p>`;
        } finally {
            setButtonLoading(getLuckyNumbersBtn, false);
        }
    }
    
    // --- INICIALIZAÇÃO E EVENTOS ---
   const urlParams = new URLSearchParams(window.location.search);
raffleId = urlParams.get('id');
isTestMode = urlParams.get('test') === 'true'; 

if (!raffleId) {
    mainContainer.innerHTML = '<p class="text-red-400">ID do sorteio não encontrado. A redirecionar...</p>';
    setTimeout(() => { window.location.href = '/'; }, 3000);
    return;
}

// Anexa os listeners aos elementos que já existem na página
if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
if (showRulesBtn) showRulesBtn.addEventListener('click', showRules);
if (closeRulesModalBtn) closeRulesModalBtn.addEventListener('click', closeRules);
if (getLuckyNumbersBtn) getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
if (cotasSection) cotasSection.addEventListener('click', handleCotaClick);

// ✅ NOVOS LISTENERS PARA O MODAL DO PIX
if(copyPixBtn) copyPixBtn.addEventListener('click', copyPixPayload);
if(closePixModalBtn) closePixModalBtn.addEventListener('click', () => {
    pixModal.classList.add('hidden');
    pixModal.classList.remove('flex');
});
    
// Inicia o processo
    setupAuthListener();
    setupShareButtons();
});



