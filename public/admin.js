import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// **NOVO**: Importa as funções de autenticação necessárias
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rafflesCollectionRef = collection(db, "rifas");

// --- ELEMENTOS DO DOM ---
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminEmailDisplay = document.getElementById('admin-email-display');
// ... (resto dos elementos do DOM do admin.html)

// --- LÓGICA DE AUTENTICAÇÃO SEGURA ---

function handleAuthState(user) {
    if (user) {
        // Se o utilizador estiver logado, mostra o painel
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        adminEmailDisplay.textContent = `Logado como: ${user.email}`;
        listenToAllRaffles();
    } else {
        // Se não estiver logado, mostra a tela de login
        loginScreen.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
}

async function handleLogin() {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // O `onAuthStateChanged` irá tratar de mostrar o painel
    } catch (error) {
        console.error("Erro no login:", error.code);
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    signOut(auth);
}

// --- LÓGICA DE GESTÃO DE RIFAS (sem alterações) ---
// ... (copie aqui todas as suas funções de gestão: createRaffle, deleteRaffle, listenToAllRaffles, etc.)


// --- EVENT LISTENERS ---
loginBtn.addEventListener('click', handleLogin);
adminPasswordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
logoutBtn.addEventListener('click', handleLogout);
// ... (resto dos event listeners do painel)

// --- INICIALIZAÇÃO ---
// A aplicação agora começa ouvindo o estado da autenticação
onAuthStateChanged(auth, handleAuthState);
