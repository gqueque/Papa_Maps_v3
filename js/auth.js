import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { functions } from './firebase-config.js';

// Agora esta é apenas uma função normal, não precisa ser global (window.)
function initAutocomplete() {
    const input = document.getElementById('endereco');
    
    // Verificação de segurança: só continua se o elemento 'endereco' existir na página
    if (!input) return; 

    // Verificação de segurança: só continua se o script do Google já criou o objeto 'google'
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
    
    // A MÁGICA ACONTECE AQUI:
    // Nós mesmos chamamos a função para iniciar o autocomplete.
    // Isso garante que tanto o HTML quanto o script do Google já estejam prontos.
    initAutocomplete();

    // O resto do seu código continua normalmente...
    const formCadastro = document.getElementById('form-cadastro');
    if (!formCadastro) return;

    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Usando o SweetAlert que você queria
        Swal.fire({
            title: 'Realizando cadastro...',
            text: 'Aguarde um momento.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
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
});