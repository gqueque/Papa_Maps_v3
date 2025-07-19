import { inicializarFirebaseApp } from './firebase-config.js';
import { loginUsuario } from './auth.js';

// Inicia o Firebase
inicializarFirebaseApp();

// Listener de login
document.getElementById("formLogin").addEventListener("submit", loginUsuario);
