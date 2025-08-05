import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, user => {
    if (user) {
        // Usuário está logado, vamos checar o "crachá" (custom claim)
        user.getIdTokenResult().then(idTokenResult => {
            // A propriedade 'admin' existe e é true?
            if (!idTokenResult.claims.admin) {
                // Se não for admin, expulsa para a home
                console.warn("Acesso negado. Este usuário не é um admin.");
                window.location.href = '/'; 
            } else {
                console.log("Acesso de Admin concedido.");
            }
        });
    } else {
        // Se não estiver nem logado, expulsa para a página de login
        console.log("Nenhum usuário logado. Redirecionando para login.");
        window.location.href = '/pages/login.html';
    }
});