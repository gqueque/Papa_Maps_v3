import { db } from './firebase-config.js';
import { collection, addDoc, GeoPoint } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Autocomplete para o formulário de admin
window.initAdminAutocomplete = function() {
    new google.maps.places.Autocomplete(document.getElementById('event-address'));
}

document.addEventListener('DOMContentLoaded', () => {
    const formNovoEvento = document.getElementById('form-novo-evento');
    if (!formNovoEvento) return;

    formNovoEvento.addEventListener('submit', async (e) => {
        e.preventDefault();

        const eventName = document.getElementById('event-name').value;
        const address = document.getElementById('event-address').value;

        if (!eventName || !address) {
            alert("Preencha todos os campos do evento!");
            return;
        }

        // Geocodificar o endereço no cliente (para simplicidade)
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'address': address }, async (results, status) => {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();

                try {
                    // Salvar o novo evento no Firestore
                    // Isso irá disparar a Cloud Function 'notificarUsuariosProximos' AUTOMATICAMENTE
                    const docRef = await addDoc(collection(db, "events"), {
                        eventName: eventName,
                        address: address,
                        createdAt: new Date(),
                        geoloc: {
                            geohash: "placeholder", // O geohash pode ser gerado aqui ou na function
                            coordinates: new GeoPoint(lat, lng)
                        }
                    });

                    alert(`Evento "${eventName}" criado com sucesso! As notificações serão enviadas.`);
                    formNovoEvento.reset();
                    
                } catch (error) {
                    console.error("Erro ao salvar evento: ", error);
                    alert("Falha ao salvar o evento.");
                }

            } else {
                alert('A geocodificação falhou pelo seguinte motivo: ' + status);
            }
        });
    });
});