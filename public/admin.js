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
            await signInWithEmailAndPassword(auth, adminEmailInput.value, adminPasswordInput.value);
        } catch (error) {
            console.error("Erro no login:", error.code);
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
        
        const logoutBtn = document.getElementById('logout-btn');
        const adminEmailDisplay = document.getElementById('admin-email-display');
        const createRaffleBtn = document.getElementById('create-raffle-btn');
        const raffleNameInput = document.getElementById('raffle-name');
        const rafflePriceInput = document.getElementById('raffle-price');
        const raffleSizeInput = document.getElementById('raffle-size'); // ALTERAÇÃO: Referência para o novo select
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
        const winnerInstructionText = document.getElementById('winner-instruction-text'); // ALTERAÇÃO: Referência para o texto de instrução
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
        
        const handleLogout = ()
