import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { auth, functions } from './firebase-config.js'; 

// Esta função precisa ser global para ser chamada pelo "callback" do Google
window.initAutocomplete = function() {
    const input = document.getElementById('endereco');
    if (!input) return; 

    if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("A API do Google Maps não foi carregada corretamente.");
        return;
    }

    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "br" },
        fields: ["formatted_address"],
    });
}

document.addEventListener('DOMContentLoaded', () => {

    const formLogin = document.getElementById('login-form');
    const formCadastro = document.getElementById('form-cadastro');
    const formRecuperar = document.getElementById('form-recuperar');

    // --- LÓGICA DE LOGIN ---
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = formLogin.email.value;
            const password = formLogin.password.value;
            
            Swal.showLoading();

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Login efetuado!',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        // CORREÇÃO 1: Redireciona para a página principal (o mapa)
                        window.location.href = '/'; 
                    });
                })
                .catch((error) => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'E-mail ou senha incorretos.'
                    });
                });
        });
    }

    // --- LÓGICA DE CADASTRO ---
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            Swal.fire({
                title: 'Realizando cadastro...',
                text: 'Aguarde um momento.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            const nome = formCadastro.nome.value;
            const email = formCadastro.email.value;
            const senha = formCadastro.senha.value;
            const whatsapp = `+55${formCadastro.whatsapp.value.replace(/[^0-9]/g, '')}`;
            const endereco = formCadastro.endereco.value;

            try {
                const cadastrarUsuario = httpsCallable(functions, 'cadastrarUsuarioComGeolocalizacao');
                const result = await cadastrarUsuario({ nome, email, senha, whatsapp, endereco });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Cadastro realizado!',
                    text: result.data.message,
                }).then(() => {
                    // CORREÇÃO 2: Redireciona para a página de login correta
                    window.location.href = '/pages/login.html';
                });

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro no cadastro',
                    text: error.message
                });
            }
        });
    }

    // --- LÓGICA DE RECUPERAR SENHA ---
    if (formRecuperar) {
        formRecuperar.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = formRecuperar.email.value;

            Swal.fire({
                title: 'Verificando e-mail...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Link enviado!',
                        text: 'Verifique sua caixa de entrada (e a pasta de spam) para criar uma nova senha.',
                    });
                })
                .catch((error) => {
                    let errorMessage = 'Ocorreu um erro. Tente novamente.';
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Nenhum usuário encontrado com este e-mail. Verifique o e-mail digitado.';
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Falha ao enviar',
                        text: errorMessage,
                    });
                });
        });
    }
});