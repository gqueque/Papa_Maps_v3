const admin = require("firebase-admin");
const geofire = require("geofire-common");
const {Client} = require("@googlemaps/google-maps-services-js");

// Importações da v2
const {onCall, HttpsError} = require("firebase-functions/v2/https");
// NOVA IMPORTAÇÃO para ler variáveis de ambiente
const {defineString} = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const googleMapsClient = new Client({});

// Definindo o parâmetro da nossa chave de API
const googleMapsApiKey = defineString("MAPS_API_KEY");

// Função de Cadastro de Usuário com a sintaxe de 2ª Geração
exports.cadastrarUsuarioComGeolocalizacao = onCall({region: "southamerica-east1"}, async (request) => {
  const {nome, email, senha, whatsapp, endereco} = request.data;

  if (!nome || !email || !senha || !whatsapp || !endereco) {
    throw new HttpsError("invalid-argument", "Todos os campos são obrigatórios.");
  }

  try {
    const geocodeResponse = await googleMapsClient.geocode({
      params: {
        address: endereco,
        // CORREÇÃO FINAL: Usando o novo método .value() para pegar a chave
        key: googleMapsApiKey.value(),
      },
    });

    if (!geocodeResponse.data.results || !geocodeResponse.data.results.length) {
      throw new HttpsError("not-found", "Endereço não pôde ser encontrado.");
    }

    const location = geocodeResponse.data.results[0].geometry.location;
    const lat = location.lat;
    const lng = location.lng;

    const userRecord = await admin.auth().createUser({
      email: email,
      password: senha,
      displayName: nome,
      phoneNumber: whatsapp,
    });

    const geohash = geofire.geohashForLocation([lat, lng]);
    const userData = {
      nome: nome,
      whatsapp: whatsapp,
      enderecoCompleto: endereco,
      geoloc: {
        geohash: geohash,
        coordinates: new admin.firestore.GeoPoint(lat, lng),
      },
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    return {success: true, message: "Usuário criado com sucesso!", uid: userRecord.uid};
  } catch (error) {
    console.error("Erro na criação do usuário:", error);
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "O e-mail fornecido já está em uso.");
    }
    throw new HttpsError("internal", "Ocorreu um erro inesperado. Tente novamente.");
  }
});