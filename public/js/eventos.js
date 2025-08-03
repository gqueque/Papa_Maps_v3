import { db } from './firebase-config.js';
// ADICIONADO: Importações do Firebase Storage
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { collection, addDoc, getDocs, GeoPoint } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZAÇÃO ---
    const storage = getStorage(); // ADICIONADO: Inicializa o serviço de Storage
    const map = L.map('events-map-container').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const formNovoEvento = document.getElementById('form-novo-evento');
    const addressInput = document.getElementById('event-address');
    const imageInput = document.getElementById('event-image'); // ADICIONADO
    const imagePreview = document.getElementById('image-preview'); // ADICIONADO
    let selectedPlace = null;

    // ADICIONADO: Lógica para mostrar a prévia da imagem selecionada
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

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

    // --- LÓGICA DO FORMULÁRIO DE CRIAÇÃO (ATUALIZADA) ---
    formNovoEvento.addEventListener('submit', async (e) => {
        e.preventDefault();

        const eventName = document.getElementById('event-name').value;
        const address = addressInput.value;
        const eventDate = document.getElementById('event-date').value;
        const imageFile = imageInput.files[0]; // Pega o arquivo de imagem

        if (!selectedPlace) {
            return Swal.fire('Erro!', 'Por favor, selecione um endereço da lista de sugestões do Google.', 'error');
        }

        Swal.fire({ title: 'Salvando evento...', text: 'Isso pode levar um momento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        let imageUrl = null;

        try {
            // Se uma imagem foi selecionada, faz o upload primeiro
            if (imageFile) {
                const storageRef = ref(storage, `event_images/${Date.now()}_${imageFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, imageFile);
                
                await uploadTask; // Espera o upload terminar
                imageUrl = await getDownloadURL(uploadTask.snapshot.ref); // Pega a URL pública
                console.log("Upload da imagem concluído:", imageUrl);
            }

            // Salva os dados no Firestore, incluindo a URL da imagem
            const lat = selectedPlace.geometry.location.lat();
            const lng = selectedPlace.geometry.location.lng();
            
            await addDoc(collection(db, "events"), {
                eventName: eventName,
                address: address,
                date: new Date(eventDate),
                imageUrl: imageUrl, // Adiciona a URL da imagem ao documento
                geoloc: {
                    coordinates: new GeoPoint(lat, lng)
                }
            });

            // Adiciona o pin no mapa (agora com um popup mais rico)
            const popupContent = `<b>${eventName}</b><br>${address}${imageUrl ? `<br><img src="${imageUrl}" width="150" style="margin-top:5px;">` : ''}`;
            L.marker([lat, lng]).addTo(map)
                .bindPopup(popupContent)
                .openPopup();
            
            Swal.fire('Sucesso!', `Evento "${eventName}" criado com sucesso!`, 'success');
            formNovoEvento.reset();
            imagePreview.style.display = 'none';
            selectedPlace = null;

        } catch (error) {
            console.error("Erro ao salvar evento: ", error);
            Swal.fire('Erro!', 'Não foi possível salvar o evento. Verifique o console.', 'error');
        }
    });

    // Carrega os eventos iniciais quando a página abre
    loadEvents();
});