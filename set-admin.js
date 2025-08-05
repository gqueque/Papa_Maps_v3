// Este script deve ser rodado localmente UMA VEZ para definir o primeiro admin.
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Aponta para a sua chave

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// <<< COLOQUE AQUI O E-MAIL DO USUÁRIO QUE SERÁ O PRIMEIRO ADMIN >>>
const emailAdmin = 'gusrqueque@gmail.com.br'; 

admin.auth().getUserByEmail(emailAdmin).then(user => {
  return admin.auth().setCustomUserClaims(user.uid, { admin: true });
}).then(() => {
  console.log(`✅ Sucesso! O usuário ${emailAdmin} agora é um administrador.`);
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro ao definir admin:', error);
  process.exit(1);
});