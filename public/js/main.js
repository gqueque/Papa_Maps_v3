import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- VARIÁVEIS GLOBAIS E ELEMENTOS DO DOM ---
    const map = L.map('map').setView([-14.235, -51.925], 4);
    let currentUser = null;
    let userDocRef = null;

    const btnMinhaConta = document.getElementById('btnMinhaConta');
    const modalConta = document.getElementById('modalConta');
    const formConta = document.getElementById('formConta');
    const btnLogout = document.getElementById('btnLogout');
    const btnRecomendar = document.getElementById('btnRecomendar');
    const modalSugestao = document.getElementById('modalSugestao');
    const formSugestao = document.getElementById('formSugestao');
    const closeButtons = document.querySelectorAll('.btn-close-modal');

    // --- INICIALIZAÇÃO DO MAPA ---
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // --- NOVO: LÓGICA DO MAPA PARA CARREGAR E EXIBIR PINS DE EVENTOS ---

    // 1. Criar um ícone personalizado para o pin
    const papaIcon = L.icon({
        iconUrl: '/assets/papa_pino.png', // Caminho para a imagem do pin
        iconSize: [50, 50], // Tamanho do ícone
        iconAnchor: [25, 50], // Ponto do ícone que corresponde à localização do marcador
        popupAnchor: [0, -50] // Ponto a partir do qual o popup deve abrir
    });

    // 2. Função para buscar os eventos no Firestore e adicionar ao mapa
    


    // --- LÓGICA DE AUTENTICAÇÃO ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userDocRef = doc(db, "users", currentUser.uid);
            btnMinhaConta.classList.remove('hidden');
        } else {
            window.location.href = '/pages/login.html';
        }
    });

    // --- MODAL 'MINHA CONTA' ---
    btnMinhaConta.addEventListener('click', async () => {
        // ... (código do modal minha conta continua igual)
    });

    formConta.addEventListener('submit', async (e) => {
        // ... (código do formulário minha conta continua igual)
    });

    btnLogout.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error("Erro ao fazer logout:", error));
    });

    // --- MODAL DE SUGESTÃO ---
    btnRecomendar.addEventListener('click', () => {
        // ... (código do modal de sugestão continua igual)
    });

    formSugestao.addEventListener('submit', async (e) => {
        // ... (código do formulário de sugestão continua igual)
    });

    // --- LÓGICA PARA FECHAR TODOS OS MODAIS ---
    closeButtons.forEach(button => {
        // ... (código para fechar modais continua igual)
    });

    // --- CHAMADAS INICIAIS ---
    if (window.google) {
        // ... (código do autocomplete continua igual)
    }

    // 3. Chama a nova função para carregar os pins assim que a página estiver pronta
    AndDisplayEventloads();
});