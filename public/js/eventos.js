import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, GeoPoint } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZAÇÃO ---
    const map = L.map('events-map-container').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const formNovoEvento = document.getElementById('form-novo-evento');
    const addressInput = document.getElementById('event-address');
    let selectedPlace = null;

    // Inicializa o Autocomplete do Google no campo de endereço
    const autocomplete = new google.maps.places.Autocomplete(addressInput);
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            selectedPlace = place;
        }
    });

    // --- CARREGAR EVENTOS EXISTENTES ---
    async function loadEvents() {
        const eventsCollection = collection(db, "events");
        const querySnapshot = await getDocs(eventsCollection);
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            if (event.geoloc && event.geoloc.coordinates) {
                const { latitude, longitude } = event.geoloc.coordinates;
                L.marker([latitude, longitude]).addTo(map)
                    .bindPopup(`<b>${event.eventName}</b><br>${event.address}`);
            }
        });
    }

    // --- LÓGICA DO FORMULÁRIO DE CRIAÇÃO ---
    formNovoEvento.addEventListener('submit', async (e) => {
        e.preventDefault();

        const eventName = document.getElementById('event-name').value;
        const address = addressInput.value;
        const eventDate = document.getElementById('event-date').value;

        if (!selectedPlace) {
            Swal.fire('Erro!', 'Por favor, selecione um endereço da lista de sugestões do Google.', 'error');
            return;
        }

        try {
            const lat = selectedPlace.geometry.location.lat();
            const lng = selectedPlace.geometry.location.lng();
            
            // Salva o novo evento no Firestore
            const docRef = await addDoc(collection(db, "events"), {
                eventName: eventName,
                address: address,
                date: new Date(eventDate),
                geoloc: {
                    // O Firestore precisa do objeto GeoPoint
                    coordinates: new GeoPoint(lat, lng)
                }
            });

            // Adiciona o pin no mapa instantaneamente
            L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>${eventName}</b><br>${address}`)
                .openPopup();
            
            Swal.fire('Sucesso!', `Evento "${eventName}" criado com sucesso!`, 'success');
            formNovoEvento.reset();
            selectedPlace = null;

        } catch (error) {
            console.error("Erro ao salvar evento: ", error);
            Swal.fire('Erro!', 'Não foi possível salvar o evento.', 'error');
        }
    });

    // Carrega os eventos iniciais quando a página abre
    loadEvents();
});