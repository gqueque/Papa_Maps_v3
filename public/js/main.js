import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- VARIÁVEIS GLOBAIS E ELEMENTOS DO DOM ---
    const map = L.map('map').setView([-14.235, -51.925], 4); // Centraliza no Brasil
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

    // --- LÓGICA DE AUTENTICAÇÃO ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            currentUser = user;
            userDocRef = doc(db, "users", currentUser.uid); // Referência para o documento do usuário no Firestore
            btnMinhaConta.classList.remove('hidden');
        } else {
            // Usuário não está logado, redireciona para a página de login
            window.location.href = '/pages/login.html';
        }
    });

    // --- MODAL 'MINHA CONTA' ---
    btnMinhaConta.addEventListener('click', async () => {
        if (!userDocRef) return;
        
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                formConta.contaNome.value = data.nome || '';
                formConta.contaEndereco.value = data.enderecoCompleto || '';
                formConta.contaTelefone.value = data.whatsapp || '';
                document.getElementById('contaEmail').textContent = `Email: ${currentUser.email}`;
            }
            modalConta.classList.remove('hidden');
        } catch (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            Swal.fire('Erro!', 'Não foi possível carregar seus dados.', 'error');
        }
    });

    formConta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = formConta.contaNome.value;
        const enderecoCompleto = formConta.contaEndereco.value;
        const whatsapp = formConta.contaTelefone.value;

        try {
            // Usamos setDoc com { merge: true } para atualizar ou criar campos sem apagar outros
            await setDoc(userDocRef, { nome, enderecoCompleto, whatsapp }, { merge: true });
            Swal.fire('Sucesso!', 'Seus dados foram atualizados.', 'success');
            modalConta.classList.add('hidden');
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            Swal.fire('Erro!', 'Não foi possível salvar suas alterações.', 'error');
        }
    });

    btnLogout.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error("Erro ao fazer logout:", error));
    });

    // --- MODAL DE SUGESTÃO ---
    btnRecomendar.addEventListener('click', () => {
        modalSugestao.classList.remove('hidden');
    });

    formSugestao.addEventListener('submit', async (e) => {
        e.preventDefault();
        const local = formSugestao.localInput.value;
        if (!local) return;

        try {
            // Salva a sugestão na coleção 'suggestions' do Firestore
            await addDoc(collection(db, "suggestions"), {
                localSugerido: local,
                sugeridoPor: currentUser.uid,
                data: new Date()
            });
            Swal.fire('Obrigado!', 'Sua sugestão foi enviada com sucesso!', 'success');
            modalSugestao.classList.add('hidden');
            formSugestao.reset();
        } catch (error) {
            console.error("Erro ao enviar sugestão:", error);
            Swal.fire('Erro!', 'Não foi possível enviar sua sugestão.', 'error');
        }
    });

    // --- LÓGICA PARA FECHAR TODOS OS MODAIS ---
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modalConta.classList.add('hidden');
            modalSugestao.classList.add('hidden');
        });
    });

    // Inicializa o Google Places Autocomplete nos campos de endereço
    if (window.google) {
        new google.maps.places.Autocomplete(document.getElementById('contaEndereco'));
        new google.maps.places.Autocomplete(document.getElementById('localInput'));
    }
});