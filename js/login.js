// Dentro do seu event listener do formulário de cadastro em auth.js

import { getFunctions, httpsCallable } from "firebase/functions";

// ... (depois de inicializar o firebase em firebase-config.js)
const functions = getFunctions();
const cadastrarUsuario = httpsCallable(functions, 'cadastrarUsuarioComGeolocalizacao');

const formCadastro = document.getElementById('form-cadastro');
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Pegar os dados do formulário
  const nome = formCadastro.nome.value;
  const email = formCadastro.email.value;
  const senha = formCadastro.senha.value;
  const whatsapp = formCadastro.whatsapp.value;
  const endereco = formCadastro.endereco.value; // Endereço preenchido com autocomplete

  // 2. Mostrar um loader/spinner para o usuário (boa prática de UI)
  // ui.js -> showLoader();

  try {
    // 3. Chamar a Cloud Function com os dados
    const result = await cadastrarUsuario({ nome, email, senha, whatsapp, endereco });

    console.log(result.data.message); // Ex: { message: "Usuário criado com sucesso!" }
    // 4. Redirecionar para a página principal ou de login
    window.location.href = '/index.html';

  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    // 5. Mostrar erro para o usuário (usando seu ui.js ou SweetAlert)
    // ui.js -> showError(error.message);
  } finally {
    // ui.js -> hideLoader();
  }
});