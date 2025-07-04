import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("rifa.js: DOM Content Loaded. Script iniciado.");

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
    const luckThemeInput = document.getElementById('luck-theme-input');
    const getLuckyNumbersBtn = document.getElementById('get-lucky-numbers-btn');
    const luckyNumbersResult = document.getElementById('lucky-numbers-result');

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
        console.log("Auth: Iniciando listener de autenticação.");
        onAuthStateChanged(auth, user => {
            if (user) {
                userId = user.uid;
                console.log(`Auth: Usuário autenticado. UID: ${userId}`);
                loadUserDataOrShowLogin();
            } else {
                console.log("Auth: Usuário não autenticado. Tentando autenticação anônima.");
                signInAnonymously(auth).catch(err => {
                    console.error("Auth: Erro na autenticação anônima.", err);
                    if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Erro de autenticação.</p>`;
                });
            }
        });
    }

    function loadUserDataOrShowLogin() {
        console.log("User Data: Verificando dados do usuário no localStorage.");
        const savedUser = localStorage.getItem(`rifaUser`);
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log("User Data: Usuário encontrado no localStorage.", currentUser.name);
            setupFirestoreListener();
        } else {
            console.log("User Data: Usuário NÃO encontrado. Exibindo tela de cadastro.");
            if(loadingSection) loadingSection.classList.add('hidden');
            if(userSection) userSection.classList.remove('hidden');
        }
    }

    function setupFirestoreListener() {
        console.log("Firestore: Iniciando listener para o documento da rifa:", rifaDocRef.id);
        onSnapshot(rifaDocRef, (doc) => {
            if (!doc.exists()) {
                console.error("Firestore: Rifa não encontrada ou foi removida:", rifaDocRef.id);
                if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400 text-center">Rifa não encontrada ou foi removida.</p>';
                return;
            }
            console.log("Firestore: Dados da rifa recebidos e atualizados.");
            numbersData = doc.data();
            PRICE_PER_NUMBER = numbersData.pricePerNumber || 10;
            const raffleType = numbersData.type || 'dezena'; // Lê o tipo do Firestore
            const totalNumbersInRaffle = (raffleType === 'centena' ? 1000 : raffleType === 'milhar' ? 10000 : 100); // Define o total com base no tipo

            if (welcomeUserSpan) welcomeUserSpan.textContent = currentUser.name;
            if (raffleTitle) raffleTitle.textContent = numbersData.name;
            setupWhatsAppButton();
            
            const expectedLength = (raffleType === 'centena' ? 3 : raffleType === 'milhar' ? 4 : 2);
            const soldCount = Object.keys(numbersData).filter(key => !isNaN(key) && key.length === expectedLength).length;
            updateRaffleProgress(soldCount, totalNumbersInRaffle); 
            updateRecentBuyers(numbersData, raffleType);

            if (numbersData.winner) {
                console.log("Firestore: Rifa tem ganhador. Exibindo informações do ganhador.");
                displayPublicWinner(numbersData.winner, raffleType); 
                if (progressSection) progressSection.classList.add('hidden');
            } else {
                console.log("Firestore: Rifa sem ganhador. Exibindo progresso e grid de números.");
                if (progressSection) progressSection.classList.remove('hidden');
            }
            renderNumberGrid(totalNumbersInRaffle, raffleType); 
            if (loadingSection) loadingSection.classList.add('hidden');
            if (appSection) appSection.classList.remove('hidden');
            
            console.log("Firestore: Chamando checkPaymentStatus() após carregar dados da rifa.");
            checkPaymentStatus();
        }, (error) => {
            console.error("Firestore: Erro ao carregar dados do Firestore:", error);
            if(mainContainer) mainContainer.innerHTML = `<p class="text-red-400 text-center">Não foi possível carregar a rifa.</p>`;
        });
    }

    function renderNumberGrid(maxNumbers, raffleType) { 
        console.log(`Grid: Renderizando para tipo ${raffleType} com ${maxNumbers} números.`);
        const isRaffleOver = !!numbersData.winner;
        if (!numberGrid) return;
        numberGrid.innerHTML = '';
        
        // Ajusta o grid para exibir os números em colunas maiores para milhares
        if (maxNumbers === 10000) {
            numberGrid.className = "grid grid-cols-10 sm:grid-cols-20 gap-1 md:gap-2 mb-8"; 
        } else if (maxNumbers === 1000) {
             numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8"; 
        } else {
             numberGrid.className = "grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3 mb-8"; 
        }
        
        for (let i = 0; i < maxNumbers; i++) { 
            const numberStr = formatNumberForRaffleType(i, raffleType); 
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

    // Função auxiliar para formatar números com zeros à esquerda
    function formatNumberForRaffleType(num, type) {
        if (type === 'centena') {
            return num.toString().padStart(3, '0');
        } else if (type === 'milhar') {
            return num.toString().padStart(4, '0');
        } else { // Dezena
            return num.toString().padStart(2, '0');
        }
    }

    // Função auxiliar para obter o comprimento esperado do número
    function getExpectedLengthForRaffleType(type) {
        if (type === 'centena') return 3;
        if (type === 'milhar') return 4;
        return 2; // Dezena
    }

    function handleNumberClick(event) {
        console.log("Clicou no número:", event.target.dataset.number);
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
        console.log("Carrinho: Atualizando. Números selecionados:", selectedNumbers);
        if (!shoppingCartSection || !selectedNumbersList || !totalPriceEl || !checkoutBtn) return;
        if (selectedNumbers.length === 0) {
            shoppingCartSection.classList.add('hidden');
            console.log("Carrinho: Vazio, seção escondida.");
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
        console.log(`Carrinho: Total a pagar: R$${totalPrice.toFixed(2)}`);
    }

    function saveUserData() {
        console.log("Cadastro: Tentando salvar dados do usuário.");
        if (nameInput.value && emailInput.value && whatsappInput.value && pixInput.value) {
            currentUser = { name: nameInput.value.trim(), email: emailInput.value.trim(), whatsapp: whatsappInput.value.trim(), pix: pixInput.value.trim() };
            localStorage.setItem(`rifaUser`, JSON.stringify(currentUser));
            console.log("Cadastro: Dados do usuário salvos no localStorage. Prosseguindo.");
            if (userSection) userSection.classList.add('hidden');
            if (loadingSection) loadingSection.classList.remove('hidden');
            setupFirestoreListener();
        } else {
            alert("Por favor, preencha todos os campos.");
            console.warn("Cadastro: Campos obrigatórios não preenchidos.");
        }
    }

    function displayPublicWinner(winnerData, type) { 
        console.log("Ganhador: Exibindo informações do ganhador público.");
        if (!winnerDisplaySection || !publicWinnerNumber || !publicWinnerName || !publicWinnerBoughtNumbers) return;
        if (!winnerData || !winnerData.player) {
            winnerDisplaySection.classList.add('hidden');
            console.log("Ganhador: Sem dados de ganhador válido. Escondendo seção.");
            return;
        }
        const { number, player } = winnerData;
        publicWinnerNumber.textContent = formatNumberForRaffleType(parseInt(number), type); 
        publicWinnerName.textContent = player.name;
        publicWinnerBoughtNumbers.innerHTML = '';
        const winnerId = player.userId;
        const winnerNumbers = [];
        const expectedLength = getExpectedLengthForRaffleType(type); 
        for (const numKey in numbersData) {
            if (numbersData[numKey] && numbersData[numKey].userId === winnerId && !isNaN(numKey) && numKey.length === expectedLength) {
                winnerNumbers.push(formatNumberForRaffleType(parseInt(numKey), type));
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
        console.log("Checkout: Iniciando processo de pagamento.");
        if (isTestMode) return handleTestCheckout();
        const raffleId = rifaDocRef.id;
        const raffleType = numbersData.type || 'dezena'; 
        if (selectedNumbers.length === 0) {
            alert("Nenhum número selecionado.");
            console.warn("Checkout: Nenhum número selecionado.");
            return;
        }
        
        const formattedSelectedNumbers = selectedNumbers.map(n => formatNumberForRaffleType(parseInt(n), raffleType));

        checkoutBtn.classList.add('pointer-events-none', 'opacity-50');
        checkoutBtn.textContent = 'A gerar link...';
        paymentStatusEl.textContent = 'Aguarde...';
        paymentStatusEl.classList.remove('hidden');
        const items = formattedSelectedNumbers.map(n => ({ id: n, title: `Rifa - ${numbersData.name} - Nº ${n}`, quantity: 1, unit_price: PRICE_PER_NUMBER, currency_id: 'BRL' }));
        const payerData = { ...currentUser, userId, raffleId };
        try {
            console.log("Checkout: Chamando função Netlify para criar pagamento.");
            const res = await fetch('/.netlify/functions/create-payment', { method: 'POST', body: JSON.stringify({ items, payerData }) });
            if (!res.ok) {
                const errorResponse = await res.json();
                throw new Error(errorResponse.message || 'Falha ao gerar link de pagamento.');
            }
            const data = await res.json();
            if (data.checkoutUrl) {
                localStorage.setItem('pendingRaffleId', raffleId);
                localStorage.setItem('pendingNumbers', JSON.stringify(formattedSelectedNumbers)); 
                console.log("Checkout: Redirecionando para URL de checkout:", data.checkoutUrl);
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error("URL de checkout não recebida.");
            }
        } catch (e) {
            console.error("Checkout: Erro no processo de checkout:", e);
            paymentStatusEl.textContent = 'Erro ao gerar link. Tente novamente.';
            checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
            checkoutBtn.textContent = 'Pagar com Mercado Pago';
        }
    }

    async function handleTestCheckout() {
        console.log("Checkout Teste: Iniciando checkout de TESTE.");
        const raffleId = rifaDocRef.id;
        const raffleType = numbersData.type || 'dezena'; 
        const formattedSelectedNumbers = selectedNumbers.map(n => formatNumberForRaffleType(parseInt(n), raffleType));
        if (formattedSelectedNumbers.length === 0) {
            alert("Nenhum número selecionado.");
            console.warn("Checkout Teste: Nenhum número selecionado.");
            return;
        }
        if (!window.confirm(`-- MODO DE TESTE --\nConfirma a reserva dos números: ${formattedSelectedNumbers.join(', ')}?`)) {
            console.log("Checkout Teste: Checkout de teste cancelado pelo usuário.");
            return;
        }
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'A processar...';
        try {
            console.log("Checkout Teste: Buscando dados da rifa para teste.");
            const docSnap = await getDoc(rifaDocRef);
            const data = docSnap.data() || {};
            const updates = {};
            const taken = formattedSelectedNumbers.filter(n => data[n]);
            if (taken.length > 0) {
                console.warn("Checkout Teste: Números já indisponíveis detectados.", taken);
                throw new Error(`Os números ${taken.join(', ')} já não estão disponíveis.`);
            }
            formattedSelectedNumbers.forEach(n => { updates[n] = { ...currentUser, userId, raffleId, createdAt: new Date() }; });
            console.log("Checkout Teste: Atualizando documentos no Firestore (teste).", updates);
            await updateDoc(rifaDocRef, updates);
            paymentStatusEl.textContent = `SUCESSO NO TESTE! Os seus números ${formattedSelectedNumbers.join(', ')} foram reservados.`;
            paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
            paymentStatusEl.classList.remove('hidden');
            triggerConfetti();
            if (shareModal) shareModal.style.display = 'flex';
            selectedNumbers = [];
            updateShoppingCart();
            console.log("Checkout Teste: Teste concluído com sucesso.");
        } catch (e) {
            console.error("Checkout Teste: Erro no checkout de teste:", e);
            alert(`Ocorreu um erro: ${e.message}`);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        }
    }

    function checkPaymentStatus() {
        console.log("checkPaymentStatus: Iniciando verificação de status de pagamento.");
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const pendingId = localStorage.getItem('pendingRaffleId');

        // Adição de verificação de IDs de transação do Mercado Pago
        const collectionId = params.get('collection_id');
        const preferenceId = params.get('preference_id');
        const hasPaymentRelatedParams = status && (collectionId || preferenceId);

        console.log(`checkPaymentStatus: URL params - status: ${status}, collection_id: ${collectionId}, preference_id: ${preferenceId}`);
        console.log(`checkPaymentStatus: Local Storage - pendingRaffleId: ${pendingId}`);
        console.log(`checkPaymentStatus: Rifa Atual - rifaDocRef.id: ${rifaDocRef ? rifaDocRef.id : 'não definida'}`);


        // Lógica MAIS SEGURA: Só ativa o modal de compartilhamento se houver:
        // 1. Parâmetros de status E um ID de transação na URL
        // 2. E um ID de rifa pendente no localStorage
        // 3. E esse ID de rifa pendente corresponder à rifa que está sendo carregada
        if (hasPaymentRelatedParams && pendingId && rifaDocRef && rifaDocRef.id === pendingId) {
            console.log("checkPaymentStatus: Condições para processar retorno de pagamento ATENDIDAS.");
            const numbers = localStorage.getItem('pendingNumbers');
            if (status === 'approved' && numbers) {
                console.log("checkPaymentStatus: Pagamento APROVADO detectado.");
                paymentStatusEl.textContent = `Pagamento aprovado! Os seus números ${JSON.parse(numbers).join(', ')} foram reservados.`;
                paymentStatusEl.className = 'text-center text-green-400 mt-4 text-lg font-semibold';
                paymentStatusEl.classList.remove('hidden');
                triggerConfetti();
                if (shareModal) shareModal.style.display = 'flex';
            } else if (status === 'failure') {
                console.log("checkPaymentStatus: Pagamento FALHOU detectado.");
                paymentStatusEl.textContent = 'O pagamento falhou. Tente novamente.';
                paymentStatusEl.className = 'text-center text-red-400 mt-4';
                paymentStatusEl.classList.remove('hidden');
            }
            // Sempre limpa o localStorage e a URL após processar, para evitar ativações futuras acidentais
            console.log("checkPaymentStatus: Limpando localStorage e URL.");
            localStorage.removeItem('pendingNumbers');
            localStorage.removeItem('pendingRaffleId');
            if (window.history.replaceState) {
                const url = new URL(window.location);
                url.search = ''; // Remove todos os parâmetros de busca
                window.history.replaceState({path:url.href}, '', url.href);
            }
        } else {
            console.log("checkPaymentStatus: Condições NÃO atendidas. Garantindo que modais estejam escondidos.");
            // Se as condições não forem atendidas, garanta que o modal de compartilhamento e a mensagem de status estejam escondidos
            if (shareModal) shareModal.style.display = 'none';
            if (paymentStatusEl) paymentStatusEl.classList.add('hidden');
        }
    }
    
    function updateRaffleProgress(count, maxTotal) {
        if (!progressSection || !progressBar || !progressPercentage) return;
        const percentage = Math.round((count / maxTotal) * 100);
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
    }

    function updateRecentBuyers(data, type) { 
        if (!recentBuyersList) return;
        const purchases = {};
        const expectedLength = getExpectedLengthForRaffleType(type); 
        for (const key in data) {
            if (!isNaN(key) && key.length === expectedLength) { 
                const pData = data[key];
                if (pData?.userId && pData.createdAt) {
                    if (!purchases[pData.userId]) {
                        purchases[pData.userId] = { name: pData.name, numbers: [], lastPurchase: pData.createdAt.toDate() };
                    }
                    purchases[pData.userId].numbers.push(formatNumberForRaffleType(parseInt(key), type)); 
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
        console.log("Compartilhamento: Configurando botões.");
        if (!shareWhatsappBtn) {
            console.warn("Compartilhamento: Botão de WhatsApp não encontrado.");
            return;
        }
        const url = window.location.href; // A URL atual da rifa (rifa.html?id=...)
        const text = `Estou a participar na rifa para ganhar um "${numbersData.name || 'prémio incrível'}"! Garanta os seus números também! ${url}`;
        shareWhatsappBtn.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        
        // Verifica se os botões existem antes de atribuir o onclick
        if (shareFacebookBtn) {
            shareFacebookBtn.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            console.log("Compartilhamento: Botão Facebook configurado.");
        } else {
            console.warn("Compartilhamento: Botão Facebook não encontrado.");
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
            console.log("Compartilhamento: Botão Twitter configurado.");
        } else {
            console.warn("Compartilhamento: Botão Twitter não encontrado.");
        }

        if (closeShareModalBtn) {
            closeShareModalBtn.onclick = () => { if (shareModal) shareModal.style.display = 'none'; };
            console.log("Compartilhamento: Botão de fechar modal configurado.");
        } else {
            console.warn("Compartilhamento: Botão de fechar modal não encontrado.");
        }
    }

    function setupWhatsAppButton() {
        if (!whatsappFloatBtn) {
            console.warn("WhatsApp Flutuante: Botão não encontrado.");
            return;
        }
        whatsappFloatBtn.href = "https://chat.whatsapp.com/CgRiKh5ANnLADEDMz0dQUe"; // Certifique-se de que este é o link do seu grupo VIP
        console.log("WhatsApp Flutuante: Link configurado.");
    }
    
    async function showRules() {
        console.log("Regras: Exibindo modal de regras.");
        if (!rulesModal || !rulesContent) return;
        try {
            rulesContent.innerHTML = '<p>A carregar...</p>';
            rulesModal.style.display = 'flex';
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists() && docSnap.data().text) {
                rulesContent.innerText = docSnap.data().text;
                console.log("Regras: Regras carregadas do Firestore.");
            } else {
                rulesContent.innerText = 'Nenhuma regra geral foi definida pelo administrador.';
                console.log("Regras: Nenhuma regra encontrada no Firestore.");
            }
        } catch (error) {
            console.error("Regras: Erro ao buscar regras:", error);
            rulesContent.innerText = 'Não foi possível carregar as regras.';
        }
    }

    function closeRules() {
        console.log("Regras: Fechando modal de regras.");
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
        console.log("Oráculo: Solicitando números da sorte.");
        if (!luckThemeInput || !luckyNumbersResult || !getLuckyNumbersBtn) return;
        const theme = luckThemeInput.value.trim();
        if (!theme) {
            luckyNumbersResult.innerHTML = `<p class="text-yellow-400">Por favor, digite um tema para o Oráculo.</p>`;
            console.warn("Oráculo: Tema não fornecido.");
            return;
        }
        setButtonLoading(getLuckyNumbersBtn, true);
        luckyNumbersResult.innerHTML = `<p class="text-purple-300">A consultar o cosmos...</p>`;
        
        try {
            const raffleTypeForLuckyNumbers = numbersData.type || 'dezena'; // Obtém o tipo da rifa para a função Netlify
            console.log(`Oráculo: Chamando Netlify function com tema "${theme}" e tipo "${raffleTypeForLuckyNumbers}".`);
            const functionUrl = `/.netlify/functions/getLuckyNumbers`;
            const response = await fetch(functionUrl, { 
                method: "POST", 
                body: JSON.stringify({ theme: theme, raffleType: raffleTypeForLuckyNumbers }) 
            });
            
            if (!response.ok) {
                const errorResponse = await response.text(); 
                throw new Error(`A resposta da função não foi OK: ${response.status} - ${errorResponse}`);
            }
            const data = await response.json();
            console.log("Oráculo: Resposta da Netlify Function recebida:", data);
            
            let html = '<div class="grid md:grid-cols-3 gap-4">'; 
            if (data.sugestoes && Array.isArray(data.sugestoes) && data.sugestoes.length > 0) {
                data.sugestoes.forEach(s => {
                    const formattedSuggestedNumber = formatNumberForRaffleType(parseInt(s.numero), raffleTypeForLuckyNumbers);
                    
                    const isSold = numbersData[formattedSuggestedNumber];
                    const buttonClass = isSold ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-blue-500 hover:bg-blue-400 number-available cursor-pointer';
                    const buttonText = isSold ? `${formattedSuggestedNumber} (Vendido)` : formattedSuggestedNumber;

                    html += `
                        <div class="bg-gray-700 p-4 rounded-lg border border-purple-500 flex flex-col items-center">
                            <p class="text-2xl font-bold text-purple-300 mb-2">${s.explicacao}</p>
                            <button class="${buttonClass} p-2 rounded-lg text-lg font-bold w-full mt-2" data-number="${formattedSuggestedNumber}" ${isSold ? 'disabled' : ''}>
                                ${buttonText}
                            </button>
                        </div>`;
                });
            } else {
                html += `<p class="text-gray-400 col-span-full">O Oráculo não conseguiu gerar sugestões para este tema.</p>`;
            }
            html += '</div>';
            luckyNumbersResult.innerHTML = html;

            luckyNumbersResult.querySelectorAll('button[data-number]').forEach(button => {
                if (!button.disabled) {
                    button.addEventListener('click', (e) => {
                        const num = e.target.dataset.number;
                        const gridButton = numberGrid.querySelector(`button[data-number="${num}"]`);
                        if (gridButton && !gridButton.disabled) {
                            handleNumberClick({ target: gridButton });
                        }
                    });
                }
            });

        } catch (error) {
            console.error("Oráculo: Erro ao chamar a função da Netlify (getLuckyNumbers):", error);
            luckyNumbersResult.innerHTML = `<p class="text-red-400">O Oráculo está com dor de cabeça. Tente outro tema.</p>`;
        } finally {
            setButtonLoading(getLuckyNumbersBtn, false);
        }
    }
    
    // --- INICIALIZAÇÃO E EVENTOS ---
    console.log("Inicialização: Obtendo parâmetros da URL.");
    const urlParams = new URLSearchParams(window.location.search);
    const raffleId = urlParams.get('id');
    isTestMode = urlParams.get('test') === 'true'; 

    console.log(`Inicialização: ID da rifa: ${raffleId || 'Não encontrado'}. Modo de teste: ${isTestMode}.`);

    if (!raffleId) {
        console.error("Inicialização: ID da rifa não encontrado na URL. Redirecionando para a página principal.");
        if(loadingSection) loadingSection.innerHTML = '<p class="text-red-400">ID da rifa não encontrado. A redirecionar...</p>';
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return;
    }
    
    rifaDocRef = doc(db, "rifas", raffleId);

    if (isTestMode && checkoutBtn) {
        checkoutBtn.textContent = 'Finalizar Teste (Sem Custo)';
        checkoutBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        checkoutBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
        console.log("Inicialização: Modo de teste ativado.");
    }

    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserData);
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleCheckout(); });
    if (showRulesBtn) showRulesBtn.addEventListener('click', showRules);
    if (closeRulesModalBtn) closeRulesModalBtn.addEventListener('click', closeRules);
    if (getLuckyNumbersBtn) getLuckyNumbersBtn.addEventListener('click', getLuckyNumbers);
    
    console.log("Inicialização: Configurando listeners de autenticação e botões de compartilhamento.");
    setupAuthListener();
    setupShareButtons();
});
