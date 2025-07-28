import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { auth, functions } from './firebase-config.js'; 

// PASSO 1: Tornamos a função global novamente para que o "callback" do Google a encontre.
window.initAutocomplete = function() {
    const input = document.getElementById('endereco');
    if (!input) return; 

    // Esta verificação agora é quase desnecessária, pois o Google garante que a API está pronta.
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
    // PASSO 2: REMOVEMOS a chamada manual daqui, pois o Google agora faz isso por nós.
    // initAutocomplete(); 

    // O resto do seu código para os formulários continua exatamente igual...
    const formLogin = document.getElementById('login-form');
    const formCadastro = document.getElementById('form-cadastro');
    const formRecuperar = document.getElementById('form-recuperar');

    // --- LÓGICA DE LOGIN (BLOCO QUE FALTAVA) ---
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
                        window.location.href = '/public/pages/criar_conta.html'; // Redireciona para a página principal
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

    // --- LÓGICA DE CADASTRO (SEU CÓDIGO ATUAL, SEM MUDANÇAS) ---
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
                    window.location.href = 'login.html';
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

    // --- PASSO 2: ADICIONAR O BLOCO PARA 'ESQUECI A SENHA' ---
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