// Importe as funções que você precisa dos SDKs que precisa
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// A configuração do seu projeto Firebase (encontrada no console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDhXLAHtaeY9_5AYsP5AWaHGLeDzuIEd4o",
  authDomain: "papa-maps.firebaseapp.com",
  databaseURL: "https://papa-maps-default-rtdb.firebaseio.com",
  projectId: "papa-maps",
  storageBucket: "papa-maps.firebasestorage.app",
  messagingSenderId: "166696313837",
  appId: "1:166696313837:web:c8b732a1182010f69bfde4",
  measurementId: "G-GLBNEFGF6K"
};

// Inicializa o Firebase e exporta os serviços para usar em outros arquivos
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1'); // Especifique a região

export { auth, db, functions };