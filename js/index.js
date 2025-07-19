const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Geofire } = require("geofire-js");
const { Client } = require("@googlemaps/google-maps-services-js");

// Inicializa o Firebase Admin e outros clientes
admin.initializeApp();
const db = admin.firestore();
const googleMapsClient = new Client({});

/**
 * Cloud Function CHAMÁVEL (Callable) para cadastrar um novo usuário.
 * Ela geocodifica o endereço, cria o usuário no Auth e salva no Firestore.
 */
exports.cadastrarUsuarioComGeolocalizacao = functions.region('southamerica-east1').https.onCall(async (data, context) => {
    const { nome, email, senha, whatsapp, endereco } = data;

    if (!nome || !email || !senha || !whatsapp || !endereco) {
        throw new functions.https.HttpsError('invalid-argument', 'Todos os campos são obrigatórios.');
    }

    try {
        // 1. Geocodificar o endereço usando a API do Google Maps de forma segura
        const geocodeResponse = await googleMapsClient.geocode({
            params: {
                address: endereco,
                key: functions.config().google.maps_api_key // Chave segura!
            }
        });

        if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
            throw new functions.https.HttpsError('not-found', 'Endereço não pôde ser encontrado.');
        }

        const location = geocodeResponse.data.results[0].geometry.location;
        const lat = location.lat;
        const lng = location.lng;

        // 2. Criar o usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: senha,
            displayName: nome,
            phoneNumber: whatsapp // Salva o whatsapp no formato internacional ex: +5581999998888
        });

        // 3. Gerar o Geohash para buscas de proximidade
        const geohash = Geofire.geohashForLocation([lat, lng]);

        // 4. Preparar os dados para salvar no Firestore
        const userData = {
            nome: nome,
            whatsapp: whatsapp,
            enderecoCompleto: endereco,
            geoloc: {
                geohash: geohash,
                coordinates: new admin.firestore.GeoPoint(lat, lng)
            }
        };

        // 5. Salvar os dados no Firestore na coleção 'users'
        await db.collection('users').doc(userRecord.uid).set(userData);

        return { success: true, message: "Usuário criado com sucesso!", uid: userRecord.uid };

    } catch (error) {
        // Log do erro para depuração
        console.error("Erro na criação do usuário:", error);
        // Lançar um erro para o cliente
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'O e-mail fornecido já está em uso.');
        }
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro inesperado. Tente novamente.');
    }
});


/**
 * Cloud Function com GATILHO (Trigger) do Firestore.
 * Dispara quando um novo evento é criado e notifica usuários próximos.
 */
exports.notificarUsuariosProximos = functions.region('southamerica-east1').firestore
    .document('events/{eventId}')
    .onCreate(async (snap, context) => {
        const eventData = snap.data();
        const eventLocation = eventData.geoloc.coordinates; // Pega o GeoPoint do evento

        console.log(`Novo evento criado: ${eventData.eventName}. Buscando usuários próximos.`);

        // 1. Definir o centro da busca e o raio (ex: 200km)
        const center = [eventLocation.latitude, eventLocation.longitude];
        const radiusInM = 200 * 1000;

        // 2. Usar Geofire para fazer uma busca eficiente
        const bounds = Geofire.geohashQueryBounds(center, radiusInM);
        const promises = bounds.map(b => {
            const q = db.collection('users')
                        .orderBy('geoloc.geohash')
                        .startAt(b[0])
                        .endAt(b[1]);
            return q.get();
        });

        const snapshots = await Promise.all(promises);
        const matchingUsers = [];

        // 3. Filtrar os resultados para garantir que estão dentro do raio
        snapshots.forEach(snap => {
            snap.forEach(doc => {
                const user = doc.data();
                const userCoords = user.geoloc.coordinates;
                const distanceInKm = Geofire.distanceBetween([userCoords.latitude, userCoords.longitude], center);

                if (distanceInKm <= 200 && !matchingUsers.some(u => u.whatsapp === user.whatsapp)) {
                    matchingUsers.push(user);
                }
            });
        });

        if (matchingUsers.length === 0) {
            console.log("Nenhum usuário encontrado no raio de 200km.");
            return null;
        }

        console.log(`Encontrados ${matchingUsers.length} usuários. Enviando notificações...`);

        // 4. Montar e enviar as notificações via Z-API
        const zapiInstance = functions.config().zapi.instance;
        const zapiToken = functions.config().zapi.token;
        const apiUrl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;

        const notificationPromises = matchingUsers.map(user => {
            const message = `E aí, Papa-Fã! 🤘\n\nO Papaizinho marcou um novo show perto de você!\n\nEvento: *${eventData.eventName}*\nLocal: ${eventData.address}\n\nConfira todos os detalhes no PapaMaps!`;

            return fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({
                    phone: user.whatsapp.replace(/[^0-9]/g, ''), // Garante que o número tenha apenas dígitos
                    message: message
                }),
                headers: { 'Content-Type': 'application/json' }
            });
        });

        await Promise.all(notificationPromises);
        console.log("Notificações enviadas com sucesso!");
        return null;
    });