import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: "AIzaSyCNFkoa4Ark8R2uzhX95NlV8Buwg2GHhvo",
        authDomain: "cemvezesmais-1ab48.firebaseapp.com",
        projectId: "cemvezesmais-1ab48",
        storageBucket: "cemvezesmais-1ab48.firebasestorage.app",
        messagingSenderId: "206492928997",
        appId: "1:206492928997:web:763cd52f3e9e91a582fd0c",
        measurementId: "G-G3BX961SHY"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const rafflesCollectionRef = collection(db, "rifas");
    const settingsDocRef = doc(db, "settings", "generalRules");

    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    let allRafflesUnsubscribe = null;
    let currentRaffleUnsubscribe = null;
    
    const handleLogin = async () => {
        loginError.classList.add('hidden');
        try {
            console.log("Tentando fazer login com:", adminEmailInput.value);
            await signInWithEmailAndPassword(auth, adminEmailInput.value, adminPasswordInput.value);
            console.log("Sucesso na chamada de signInWithEmailAndPassword. A aguardar onAuthStateChanged...");
        } catch (error) {
            console.error("ERRO na tentativa de login:", error);
            loginError.textContent = "E-mail ou senha incorretos. Tente novamente.";
            loginError.classList.remove('hidden');
        }
    };

    const cleanupListeners = () => {
        if (allRafflesUnsubscribe) allRafflesUnsubscribe();
        if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
    };

    function initializeAdminPanel(user) {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        // O resto desta função não precisa mudar, mas está aqui para completude
        const logoutBtn = document.getElementById('logout-btn');
        const adminEmailDisplay = document.getElementById('admin-email-display');
        const createRaffleBtn = document.getElementById('create-raffle-btn');
        const raffleNameInput = document.getElementById('raffle-name');
        const rafflePriceInput = document.getElementById('raffle-price');
        const raffleSizeInput = document.getElementById('raffle-size');
        const rafflesListEl = document.getElementById('raffles-list');
        const raffleDetailsSection = document.getElementById('raffle-details-section');
        const detailsRaffleName = document.getElementById('details-raffle-name');
        const soldNumbersEl = document.getElementById('sold-numbers');
        const totalParticipantsEl = document.getElementById('total-participants');
        const totalRevenueEl = document.getElementById('total-revenue');
        const participantsTableBody = document.getElementById('participants-table-body');
        const searchInput = document.getElementById('search-input');
        const declareWinnerArea = document.getElementById('declare-winner-area');
        const winningNumberInput = document.getElementById('winning-number-input');
        const winnerInstructionText = document.getElementById('winner-instruction-text');
        const declareWinnerBtn = document.getElementById('declare-winner-btn');
        const winnerInfoAdmin = document.getElementById('winner-info-admin');
        const adminWinnerNumber = document.getElementById('admin-winner-number');
        const adminWinnerName = document.getElementById('admin-winner-name');
        const adminWinnerContact = document.getElementById('admin-winner-contact');
        const adminWinnerPix = document.getElementById('admin-winner-pix');
        const noWinnerInfoAdmin = document.getElementById('no-winner-info-admin');
        const raffleNameDisplay = document.getElementById('raffle-name-display');
        const editRaffleNameBtn = document.getElementById('edit-raffle-name-btn');
        const editRaffleNameSection = document.getElementById('edit-raffle-name-section');
        const editRaffleNameInput = document.getElementById('edit-raffle-name-input');
        const saveRaffleNameBtn = document.getElementById('save-raffle-name-btn');
        const cancelEditRaffleNameBtn = document.getElementById('cancel-edit-raffle-name-btn');
        const rulesTextarea = document.getElementById('rules-textarea');
        const saveRulesBtn = document.getElementById('save-rules-btn');

        adminEmailDisplay.textContent = `Logado como: ${user.email}`;

        let currentRaffleId = null;
        let allParticipantsData = [];
        let rawRifaData = {};
        
        const handleLogout = () => signOut(auth);

        const createRaffle = async () => {
            const name = raffleNameInput.value.trim();
            const price = parseFloat(rafflePriceInput.value);
            const size = parseInt(raffleSizeInput.value, 10);

            if (!name || isNaN(price) || price <= 0) return alert("Preencha nome e preço válidos.");
            
            try {
                await addDoc(rafflesCollectionRef, { 
                    name, 
                    pricePerNumber: price, 
                    size: size, 
                    createdAt: new Date(), 
                    status: 'active' 
                });
                alert(`Rifa "${name}" com ${size} números foi criada!`);
                raffleNameInput.value = '';
                rafflePriceInput.value = '';
            } catch (e) { console.error("Erro ao criar rifa:", e); }
        };
        
        const deleteRaffle = async (raffleId, raffleName) => {
            if (window.confirm(`Tem a certeza que quer excluir a rifa "${raffleName}"?`)) {
                try {
                    await deleteDoc(doc(db, "rifas", raffleId));
                    if (currentRaffleId === raffleId) {
                        raffleDetailsSection.classList.add('hidden');
                        currentRaffleId = null;
                    }
                    alert(`Rifa "${raffleName}" excluída.`);
                } catch (e) { console.error("Erro ao excluir rifa:", e); }
            }
        };

        const saveRaffleName = async () => {
            const newName = editRaffleNameInput.value.trim();
            if (!newName || !currentRaffleId) return;
            try {
                await updateDoc(doc(db, "rifas", currentRaffleId), { name: newName });
                alert("Nome atualizado!");
                hideEditRaffleNameUI();
            } catch (e) { console.error("Erro ao atualizar nome:", e); }
        };

        const declareWinner = async () => {
            if (!currentRaffleId) return alert("Nenhuma rifa selecionada.");
            
            const raffleSize = rawRifaData.size || 100;
            const numDigits = (raffleSize - 1).toString().length;
            const num = winningNumberInput.value.trim().padStart(numDigits, '0');

            if (parseInt(num, 10) < 0 || parseInt(num, 10) >= raffleSize) {
                return alert(`Número inválido. Deve ser entre 0 e ${raffleSize - 1}.`);
            }
            
            const winnerData = rawRifaData[num] || null;
            try {
                await updateDoc(doc(db, "rifas", currentRaffleId), { winner: { number: num, player: winnerData }, status: 'finished' });
                alert(`Sorteio finalizado!`);
            } catch (e) { console.error("Erro ao declarar ganhador:", e); }
        };
        
        const loadRules = async () => {
            try {
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists()) rulesTextarea.value = docSnap.data().text || '';
            } catch (e) { console.error("Erro ao carregar regras:", e); }
        };

        const saveRules = async () => {
            try {
                await setDoc(settingsDocRef, { text: rulesTextarea.value.trim() });
                alert("Regras guardadas com sucesso!");
            } catch (e) { console.error("Erro ao guardar as regras:", e); }
        };

        const showEditRaffleNameUI = () => {
            if (!rawRifaData.name) return;
            raffleNameDisplay.classList.add('hidden');
            editRaffleNameSection.classList.remove('hidden');
            editRaffleNameInput.value = rawRifaData.name;
            editRaffleNameInput.focus();
        };

        const hideEditRaffleNameUI = () => {
            raffleNameDisplay.classList.remove('hidden');
            editRaffleNameSection.classList.add('hidden');
        };

        const handleSearch = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = term ? allParticipantsData.filter(p => p.name.toLowerCase().includes(term) || p.numbers.some(n => n.includes(term))) : allParticipantsData;
            renderTable(filtered);
        };
        
        function listenToAllRaffles() {
            if (allRafflesUnsubscribe) allRafflesUnsubscribe();
            allRafflesUnsubscribe = onSnapshot(rafflesCollectionRef, (snapshot) => {
                if(!rafflesListEl) return;
                rafflesListEl.innerHTML = '';
                if (snapshot.empty) return rafflesListEl.innerHTML = '<p class="text-gray-500">Nenhuma rifa criada.</p>';
                const sortedRaffles = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis()||0) - (a.data().createdAt?.toMillis()||0));
                sortedRaffles.forEach(doc => {
                    const r = doc.data();
                    const el = document.createElement('div');
                    el.className = `p-3 bg-gray-700 rounded-lg flex justify-between items-center ${doc.id === currentRaffleId ? 'ring-2 ring-blue-400' : ''} ${r.status === 'finished' ? 'opacity-60' : ''}`;
                    el.innerHTML = `<div class="flex-grow cursor-pointer" data-id="${doc.id}" data-name="${r.name}"><p class="font-semibold">${r.name}</p><p class="text-xs text-gray-400">Status: ${r.status} (${r.size || 100} números)</p></div><div class="flex items-center space-x-2"><span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span><button title="Excluir Rifa" data-id="${doc.id}" data-name="${r.name}" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`;
                    rafflesListEl.appendChild(el);
                });
            });
        }

        const selectRaffle = (raffleId, raffleName) => {
            currentRaffleId = raffleId;
            detailsRaffleName.textContent = raffleName;
            raffleDetailsSection.classList.remove('hidden');
            hideEditRaffleNameUI();
            listenToAllRaffles();
            if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
            const ref = doc(db, "rifas", raffleId);
            currentRaffleUnsubscribe = onSnapshot(ref, (doc) => {
                rawRifaData = doc.data() || {};
                
                const raffleSize = rawRifaData.size || 100;
                const numDigits = (raffleSize - 1).toString().length;
                const maxNumber = raffleSize - 1;
                winningNumberInput.placeholder = `Nº Sorteado (0...${maxNumber})`;
                if (winnerInstructionText) {
                    winnerInstructionText.textContent = `Insira o número sorteado (${numDigits} dígitos) para finalizar a rifa.`;
                }

                processRifaData(rawRifaData);
                if (rawRifaData.winner) showWinnerInAdminPanel(rawRifaData.winner);
                else {
                    declareWinnerArea.classList.remove('hidden');
                    winnerInfoAdmin.classList.add('hidden');
                    noWinnerInfoAdmin.classList.add('hidden');
                }
            });
        };
        
        const processRifaData = (data) => {
            const participants = {};
            let soldCount = 0;
            for (const key in data) {
                if (!isNaN(parseInt(key, 10)) && typeof data[key] === 'object' && data[key] !== null && data[key].userId) {
                    soldCount++;
                    const pData = data[key];
                    if (pData?.userId) {
                        if (!participants[pData.userId]) participants[pData.userId] = { ...pData, numbers: [] };
                        participants[pData.userId].numbers.push(key);
                    }
                }
            }
            allParticipantsData = Object.values(participants);
            renderTable(allParticipantsData);
            updateSummary(soldCount, allParticipantsData.length, data.pricePerNumber);
        };
        
        const renderTable = (data) => {
            participantsTableBody.innerHTML = '';
            if (data.length === 0) return participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8">Nenhum participante.</td></tr>`;
            data.forEach(p => {
                p.numbers.sort((a, b) => a - b);
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-3">${p.name}</td><td class="p-3"><div class="flex flex-col"><span>${p.email}</span><span>${p.whatsapp}</span></div></td><td class="p-3">${p.pix}</td><td class="p-3"><div class="flex flex-wrap gap-2">${p.numbers.map(n => `<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">${n}</span>`).join('')}</div></td>`;
                participantsTableBody.appendChild(row);
            });
        };
        
        const updateSummary = (sold, parts, price = 0) => {
            soldNumbersEl.textContent = sold;
            totalParticipantsEl.textContent = parts;
            totalRevenueEl.textContent = (sold * price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        const showWinnerInAdminPanel = (info) => {
            declareWinnerArea.classList.add('hidden');
            const { number, player } = info;
            if (player) {
                adminWinnerNumber.textContent = number;
                adminWinnerName.textContent = player.name;
                adminWinnerContact.textContent = `${player.email} / ${player.whatsapp}`;
                adminWinnerPix.textContent = player.pix;
                winnerInfoAdmin.classList.remove('hidden');
                noWinnerInfoAdmin.classList.add('hidden');
            } else {
                adminWinnerNumber.textContent = number;
                noWinnerInfoAdmin.classList.remove('hidden');
                winnerInfoAdmin.classList.add('hidden');
            }
        };

        logoutBtn.addEventListener('click', handleLogout);
        createRaffleBtn.addEventListener('click', createRaffle);
        declareWinnerBtn.addEventListener('click', declareWinner);
        searchInput.addEventListener('input', handleSearch);
        editRaffleNameBtn.addEventListener('click', showEditRaffleNameUI);
        saveRaffleNameBtn.addEventListener('click', saveRaffleName);
        cancelEditRaffleNameBtn.addEventListener('click', hideEditRaffleNameUI);
        saveRulesBtn.addEventListener('click', saveRules);
        
        rafflesListEl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-raffle-btn');
            if (deleteBtn) {
                e.stopPropagation();
                deleteRaffle(deleteBtn.dataset.id, deleteBtn.dataset.name);
            } else {
                const infoEl = e.target.closest('.flex-grow[data-id]');
                if (infoEl) selectRaffle(infoEl.dataset.id, infoEl.dataset.name);
            }
        });
        
        listenToAllRaffles();
        loadRules();
    }
    
    // =========== INÍCIO DO DIAGNÓSTICO AVANÇADO ===========
    onAuthStateChanged(auth, (user) => {
        console.log("onAuthStateChanged disparado. A verificar o utilizador...");

        if (user) {
            // Se o utilizador existe, vamos ver o que tem dentro dele
            console.log("Utilizador DETETADO. Conteúdo do objeto 'user':", user);
            console.log("Email do utilizador:", user.email);
            console.log("ID do utilizador:", user.uid);

            if (user.email) {
                console.log("CONDIÇÃO APROVADA: Utilizador tem um email. A inicializar o painel...");
                initializeAdminPanel(user);
            } else {
                console.error("CONDIÇÃO FALHOU: O utilizador existe, MAS NÃO TEM a propriedade 'email'. A deslogar para segurança.");
                signOut(auth);
            }

        } else {
            // Se não há utilizador
            console.log("Nenhum utilizador logado. A mostrar a tela de login.");
            cleanupListeners();
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    });
    // =========== FIM DO DIAGNÓSTICO AVANÇADO ===========

    loginBtn.addEventListener('click', handleLogin);
    adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });

});
