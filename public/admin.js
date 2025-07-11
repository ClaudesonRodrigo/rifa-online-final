// public/admin.js (Versão Definitiva - Correção da função de Regras - COMPLETO)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { app } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {

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
    let currentSoldNumbersUnsubscribe = null;

    const handleLogin = async () => {
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, adminEmailInput.value, adminPasswordInput.value);
        } catch (error) {
            console.error("Erro no login:", error.code);
            loginError.classList.remove('hidden');
        }
    };

    const cleanupListeners = () => {
        if (allRafflesUnsubscribe) allRafflesUnsubscribe();
        if (currentRaffleUnsubscribe) currentRaffleUnsubscribe();
        if (currentSoldNumbersUnsubscribe) currentSoldNumbersUnsubscribe();
    };

    function initializeAdminPanel(user) {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        const logoutBtn = document.getElementById('logout-btn');
        const adminEmailDisplay = document.getElementById('admin-email-display');
        const createRaffleBtn = document.getElementById('create-raffle-btn');
        const raffleNameInput = document.getElementById('raffle-name');
        const rafflePriceInput = document.getElementById('raffle-price');
        const raffleTypeInput = document.getElementById('raffle-type');
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
        
        // ✅ CORREÇÃO APLICADA AQUI
        const rulesTextArea = document.getElementById('rules-text-area'); 
        const saveRulesBtn = document.getElementById('save-rules-btn');

        adminEmailDisplay.textContent = `Logado como: ${user.email}`;

        let currentRaffleId = null;
        let allParticipantsData = [];
        let raffleDetails = {};
        
        const handleLogout = () => signOut(auth);

        const createRaffle = async () => {
            const name = raffleNameInput.value.trim();
            const price = parseFloat(rafflePriceInput.value);
            const type = raffleTypeInput.value;
            if (!name || isNaN(price) || price <= 0) return alert("Preencha nome e preço válidos.");
            try {
                await addDoc(rafflesCollectionRef, { name, pricePerNumber: price, type, createdAt: new Date(), status: 'active' });
                alert(`Rifa "${name}" (${type}) criada!`);
                raffleNameInput.value = '';
                rafflePriceInput.value = '';
                raffleTypeInput.value = 'dezena';
            } catch (e) { console.error("Erro ao criar rifa:", e); }
        };
        
        const deleteRaffle = async (raffleId, raffleName) => {
            if (window.confirm(`Tem a certeza que quer excluir a rifa "${raffleName}"? Esta ação não pode ser desfeita.`)) {
                try {
                    const response = await fetch('/.netlify/functions/delete-raffle', {
                        method: 'POST',
                        body: JSON.stringify({ raffleId: raffleId }),
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Falha na resposta do servidor.');
                    }
                    if (currentRaffleId === raffleId) {
                        raffleDetailsSection.classList.add('hidden');
                        currentRaffleId = null;
                    }
                    alert(`Rifa "${raffleName}" excluída com sucesso.`);
                } catch (e) {
                    console.error("Erro ao tentar apagar rifa:", e);
                    alert(`Não foi possível apagar a rifa: ${e.message}`);
                }
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
            const winningNumberRaw = winningNumberInput.value.trim();
            const raffleType = raffleDetails.type || 'dezena';
            let paddedWinningNumber;
            if (raffleType === 'dezena') {
                paddedWinningNumber = winningNumberRaw.padStart(2, '0');
                if (parseInt(paddedWinningNumber, 10) < 0 || parseInt(paddedWinningNumber, 10) > 99 || winningNumberRaw.length > 2) return alert("Número inválido para Dezena (00-99).");
            } else if (raffleType === 'centena') {
                paddedWinningNumber = winningNumberRaw.padStart(3, '0');
                if (parseInt(paddedWinningNumber, 10) < 0 || parseInt(paddedWinningNumber, 10) > 999 || winningNumberRaw.length > 3) return alert("Número inválido para Centena (000-999).");
            } else if (raffleType === 'milhar') {
                paddedWinningNumber = winningNumberRaw.padStart(4, '0');
                if (parseInt(paddedWinningNumber, 10) < 0 || parseInt(paddedWinningNumber, 10) > 9999 || winningNumberRaw.length > 4) return alert("Número inválido para Milhar (0000-9999).");
            } else { return alert("Tipo de sorteio desconhecido."); }
            try {
                const winnerDocRef = doc(db, "rifas", currentRaffleId, "sold_numbers", paddedWinningNumber);
                const winnerDoc = await getDoc(winnerDocRef);
                const winnerData = winnerDoc.exists() ? winnerDoc.data() : null;
                await updateDoc(doc(db, "rifas", currentRaffleId), { 
                    winner: { number: paddedWinningNumber, player: winnerData }, 
                    status: 'finished' 
                });
                alert(`Sorteio finalizado!`);
            } catch (e) { console.error("Erro ao declarar ganhador:", e); }
        };
        
        // ✅ LÓGICA CORRIGIDA E COMPLETA PARA AS REGRAS
        const loadRules = async () => {
            try {
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists() && rulesTextArea) {
                    rulesTextArea.value = docSnap.data().text || '';
                }
            } catch (e) { 
                console.error("Erro ao carregar regras:", e); 
                alert("Não foi possível carregar as regras.");
            }
        };

        const saveRules = async () => {
            if (!rulesTextArea.value) {
                alert("O campo de regras não pode estar vazio.");
                return;
            }
            saveRulesBtn.disabled = true;
            saveRulesBtn.textContent = 'A salvar...';

            try {
                await setDoc(settingsDocRef, { text: rulesTextArea.value });
                alert("Regras salvas com sucesso!");
            } catch (error) {
                console.error("Erro ao salvar as regras: ", error);
                alert("Ocorreu um erro ao salvar as regras. Tente novamente.");
            } finally {
                saveRulesBtn.disabled = false;
                saveRulesBtn.textContent = 'Salvar Regras';
            }
        };

        const showEditRaffleNameUI = () => {
            if (!raffleDetails.name) return;
            raffleNameDisplay.classList.add('hidden');
            editRaffleNameSection.classList.remove('hidden');
            editRaffleNameInput.value = raffleDetails.name;
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
                    el.innerHTML = `<div class="flex-grow cursor-pointer" data-id="${doc.id}" data-name="${r.name}"><p class="font-semibold">${r.name} <span class="text-xs text-blue-400">(${r.type || 'dezena'})</span></p><p class="text-xs text-gray-400">Status: ${r.status}</p></div><div class="flex items-center space-x-2"><span class="text-xs font-mono text-blue-300">${doc.id.substring(0,6)}...</span><button title="Excluir Rifa" data-id="${doc.id}" data-name="${r.name}" class="delete-raffle-btn p-2 text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`;
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
            if (currentSoldNumbersUnsubscribe) currentSoldNumbersUnsubscribe();

            const raffleDocRef = doc(db, "rifas", raffleId);
            currentRaffleUnsubscribe = onSnapshot(raffleDocRef, (docSnap) => {
                if (!docSnap.exists()) {
                    raffleDetailsSection.classList.add('hidden');
                    return;
                }
                raffleDetails = docSnap.data();
                if (raffleDetails.winner) {
                    showWinnerInAdminPanel(raffleDetails.winner);
                } else {
                    declareWinnerArea.classList.remove('hidden');
                    winnerInfoAdmin.classList.add('hidden');
                    noWinnerInfoAdmin.classList.add('hidden');
                }
                const placeholderMap = { 'dezena': 'Nº (00-99)', 'centena': 'Nº (000-999)', 'milhar': 'Nº (0000-9999)' };
                winningNumberInput.placeholder = placeholderMap[raffleDetails.type || 'dezena'];
            });

            const soldNumbersColRef = collection(db, "rifas", raffleId, "sold_numbers");
            currentSoldNumbersUnsubscribe = onSnapshot(soldNumbersColRef, (snapshot) => {
                const soldNumbers = {};
                snapshot.forEach(doc => {
                    soldNumbers[doc.id] = doc.data();
                });
                processRifaData(soldNumbers);
            });
        };
        
        const processRifaData = (soldNumbers) => {
            const participants = {};
            const soldCount = Object.keys(soldNumbers).length;
            for (const number in soldNumbers) {
                const pData = soldNumbers[number];
                if (pData?.userId) {
                    if (!participants[pData.userId]) {
                        participants[pData.userId] = { ...pData, numbers: [] };
                    }
                    participants[pData.userId].numbers.push(number);
                }
            }
            allParticipantsData = Object.values(participants);
            renderTable(allParticipantsData);
            updateSummary(soldCount, allParticipantsData.length, raffleDetails.pricePerNumber);
        };
        
        const renderTable = (data) => {
            participantsTableBody.innerHTML = '';
            if (data.length === 0) return participantsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8">Nenhum participante.</td></tr>`;
            data.forEach(p => {
                p.numbers.sort();
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-3">${p.name}</td><td class="p-3"><div class="flex flex-col"><span>${p.email}</span><span>${p.whatsapp}</span></div></td><td class="p-3">${p.pix}</td><td class="p-3"><div class="flex flex-wrap gap-2">${p.numbers.map(n => `<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">${n}</span>`).join('')}</div></td>`;
                participantsTableBody.appendChild(row);
            });
        };
        
        const updateSummary = (sold, parts, price = 0) => {
            soldNumbersEl.textContent = sold;
            totalParticipantsEl.textContent = parts;
            totalRevenueEl.textContent = (sold * (price || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        
        // ✅ EVENT LISTENER CORRIGIDO E ATIVADO
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
        loadRules(); // Carrega as regras quando o painel é inicializado
    }
    
    onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
            initializeAdminPanel(user);
        } else {
            if(user) signOut(auth);
            cleanupListeners();
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    });

    loginBtn.addEventListener('click', handleLogin);
    adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });

    // Lógica do Gerador de Links
    const raffleIdForVendorInput = document.getElementById('raffle-id-for-vendor');
    const vendorNameInput = document.getElementById('vendor-name');
    const generateVendorLinkBtn = document.getElementById('generate-vendor-link-btn');
    const vendorLinkResultSection = document.getElementById('vendor-link-result');
    const generatedLinkOutput = document.getElementById('generated-link-output');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const copyFeedback = document.getElementById('copy-feedback');

    if(generateVendorLinkBtn) {
        generateVendorLinkBtn.addEventListener('click', () => {
            const raffleId = raffleIdForVendorInput.value.trim();
            if(!raffleId) {
                alert('Por favor, cole o ID da rifa para gerar o link.');
                return;
            }
            raffleIdForVendorInput.value = raffleId;
            const vendorId = vendorNameInput.value.trim();
            if (!vendorId) {
                alert('Por favor, preencha o Nome do Revendedor.');
                return;
            }
            const baseUrl = window.location.origin;
            const vendorLink = `${baseUrl}/rifa.html?id=${raffleId}&vendor=${vendorId}`;
            generatedLinkOutput.value = vendorLink;
            vendorLinkResultSection.classList.remove('hidden');
            copyFeedback.classList.add('hidden');
        });
    }

    if(copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            generatedLinkOutput.select();
            document.execCommand('copy');
            copyFeedback.classList.remove('hidden');
            setTimeout(() => {
                copyFeedback.classList.add('hidden');
            }, 2000);
        });
    }
    
    // Lógica do Relatório de Vendas
    const reportRaffleIdInput = document.getElementById('report-raffle-id');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const reportOutputSection = document.getElementById('report-output-section');

    if(generateReportBtn) {
        generateReportBtn.addEventListener('click', async () => {
            const raffleId = reportRaffleIdInput.value.trim();
            if(!raffleId) {
                alert('Por favor, cole o ID da rifa para gerar o relatório.');
                return;
            }
            reportRaffleIdInput.value = raffleId;
            generateReportBtn.disabled = true;
            generateReportBtn.textContent = 'A gerar...';
            reportOutputSection.innerHTML = '<p class="text-center text-sky-400">A consultar o banco de dados...</p>';
            reportOutputSection.classList.remove('hidden');
            try {
                const soldNumbersRef = collection(db, 'rifas', raffleId, 'sold_numbers');
                const querySnapshot = await getDocs(soldNumbersRef);

                if (querySnapshot.empty) {
                    reportOutputSection.innerHTML = '<p class="text-center text-yellow-400">Nenhum número vendido para esta rifa ainda.</p>';
                } else {
                    const salesByVendor = {};
                    let totalSoldByVendors = 0;

                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        const number = doc.id;
                        const vendorId = data.vendorId || 'Vendas Diretas (Sem Vendedor)';

                        if (!salesByVendor[vendorId]) {
                            salesByVendor[vendorId] = { count: 0, numbers: [] };
                        }
                        salesByVendor[vendorId].count++;
                        salesByVendor[vendorId].numbers.push(number);
                        
                        if(data.vendorId) {
                            totalSoldByVendors++;
                        }
                    });

                    let reportHTML = `<h3 class="text-lg font-semibold text-white">Total de Vendas por Revendedores: ${totalSoldByVendors}</h3>`;
                    
                    for (const vendorId in salesByVendor) {
                        const vendorData = salesByVendor[vendorId];
                        vendorData.numbers.sort();

                        const isDirectSale = vendorId === 'Vendas Diretas (Sem Vendedor)';
                        reportHTML += `
                            <div class="bg-gray-900 p-4 rounded-lg mt-2">
                                <div class="flex justify-between items-center mb-2">
                                    <p class="font-bold text-teal-400">${vendorId}</p>
                                    ${!isDirectSale ? `<button class="get-vendor-link-btn bg-sky-600 hover:bg-sky-700 text-xs px-3 py-1 rounded-md" data-vendor-id="${vendorId}">Recuperar Link</button>` : ''}
                                </div>
                                <p class="text-sm text-gray-300">Total de números vendidos: <span class="font-bold">${vendorData.count}</span></p>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    ${vendorData.numbers.map(num => `<span class="bg-blue-500 text-white font-bold px-2 py-1 text-xs rounded-full">${num}</span>`).join(' ')}
                                </div>
                            </div>
                        `;
                    }
                    reportOutputSection.innerHTML = reportHTML;
                }
            } catch (error) {
                console.error("Erro ao gerar relatório:", error);
                reportOutputSection.innerHTML = `<p class="text-center text-red-500">Ocorreu um erro ao gerar o relatório: ${error.message}</p>`;
            } finally {
                generateReportBtn.disabled = false;
                generateReportBtn.textContent = 'Gerar Relatório';
            }
        });
    }

    reportOutputSection.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('get-vendor-link-btn')) {
            const vendorId = e.target.dataset.vendorId;
            const raffleId = reportRaffleIdInput.value.trim();

            if (!vendorId || !raffleId) return;

            raffleIdForVendorInput.value = raffleId;
            vendorNameInput.value = vendorId;
            generateVendorLinkBtn.click();
            vendorLinkResultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
});
