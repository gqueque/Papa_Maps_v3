import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection, getDocs, GeoPoint } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
    const map = L.map('map').setView([-14.235, -51.925], 4);
    let currentUser = null;
    let userDocRef = null;
    let localSelecionado = null;

    // VARIÁVEIS PARA A BUSCA
    let allEventsData = [];
    const markersLayer = L.layerGroup().addTo(map);

    // Elementos do DOM
    const btnMinhaConta = document.getElementById('btnMinhaConta');
    const modalConta = document.getElementById('modalConta');
    const formConta = document.getElementById('formConta');
    const btnLogout = document.getElementById('btnLogout');
    const btnRecomendar = document.getElementById('btnRecomendar');
    const modalSugestao = document.getElementById('modalSugestao');
    const formSugestao = document.getElementById('formSugestao');
    const closeButtons = document.querySelectorAll('.btn-close-modal');
    // ELEMENTOS PARA A BUSCA
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // --- LÓGICA DO MAPA ---
    const papaIcon = L.icon({
        iconUrl: '/assets/papa_pino.png',
        iconSize: [60, 60],
        iconAnchor: [30, 60],
        popupAnchor: [0, -60]
    });

    async function loadAndDisplayEvents() {
        try {
            const querySnapshot = await getDocs(collection(db, "events"));
            allEventsData = [];
            querySnapshot.forEach((doc) => {
                allEventsData.push(doc.data());
            });
            displayEvents(allEventsData);
        } catch (error) {
            console.error("Erro ao carregar eventos:", error);
        }
    }

    // NOVA FUNÇÃO para desenhar/redesenhar os pins
    function displayEvents(eventsToDisplay) {
        markersLayer.clearLayers();
        const markersBounds = [];

        if (eventsToDisplay.length === 0) {
            Swal.fire('Nenhum resultado', 'Nenhum show encontrado com esse termo.', 'info');
            return;
        }

        eventsToDisplay.forEach((event) => {
            if (event.geoloc && event.geoloc.coordinates) {
                const { latitude, longitude } = event.geoloc.coordinates;
                const marker = L.marker([latitude, longitude], { icon: papaIcon })
                    .bindPopup(`<strong>${event.eventName}</strong><br>${event.address}`);
                
                markersLayer.addLayer(marker);
                markersBounds.push([latitude, longitude]);
            }
        });

        if (markersBounds.length > 0) {
            map.fitBounds(markersBounds);
        }
    }

    // NOVA FUNÇÃO para a lógica da busca
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (!searchTerm) {
            displayEvents(allEventsData);
            map.setView([-14.235, -51.925], 4);
            return;
        }

        const filteredEvents = allEventsData.filter(event => {
            const eventName = event.eventName ? event.eventName.toLowerCase() : '';
            const address = event.address ? event.address.toLowerCase() : '';
            return eventName.includes(searchTerm) || address.includes(searchTerm);
        });

        displayEvents(filteredEvents);
    }
    
    // --- LÓGICA DE AUTENTICAÇÃO ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userDocRef = doc(db, "users", currentUser.uid);
            if(btnMinhaConta) btnMinhaConta.classList.remove('hidden');
        } else {
            window.location.href = '/pages/login.html';
        }
    });

    // --- LÓGICA DOS MODAIS E BOTÕES ---
    if (btnMinhaConta) {
        btnMinhaConta.addEventListener('click', async () => {
            if (!userDocRef) return;
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    formConta.contaNome.value = data.nome || '';
                    formConta.contaEndereco.value = data.enderecoCompleto || '';
                    formConta.contaTelefone.value = data.whatsapp || '';
                    document.getElementById('contaEmail').textContent = `Email: ${currentUser.email}`;
                }
                modalConta.classList.remove('hidden');
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                Swal.fire('Erro!', 'Não foi possível carregar seus dados.', 'error');
            }
        });

        formConta.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = formConta.contaNome.value;
            const enderecoCompleto = formConta.contaEndereco.value;
            const whatsapp = formConta.contaTelefone.value;
            try {
                await setDoc(userDocRef, { nome, enderecoCompleto, whatsapp }, { merge: true });
                Swal.fire('Sucesso!', 'Seus dados foram atualizados.', 'success');
                modalConta.classList.add('hidden');
            } catch (error) {
                console.error("Erro ao salvar dados:", error);
                Swal.fire('Erro!', 'Não foi possível salvar suas alterações.', 'error');
            }
        });

        btnLogout.addEventListener('click', () => {
            signOut(auth).catch((error) => console.error("Erro ao fazer logout:", error));
        });
    }
    
    if(btnRecomendar) {
        btnRecomendar.addEventListener('click', () => {
            modalSugestao.classList.remove('hidden');
        });

        formSugestao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const localTexto = document.getElementById("localInput").value;
            if (!localTexto) return Swal.fire('Atenção', 'Por favor, digite um local.', 'warning');

            try {
                await addDoc(collection(db, "suggestions"), {
                    localSugerido: localSelecionado ? localSelecionado.nome : localTexto,
                    geoloc: localSelecionado ? localSelecionado.geoloc : null,
                    sugeridoPor: currentUser.uid,
                    data: new Date()
                });
                Swal.fire('Sugestão enviada!', 'O Papaizinho agradece!', 'success');
                modalSugestao.classList.add('hidden');
                formSugestao.reset();
                localSelecionado = null;
            } catch (error) {
                console.error("Erro ao enviar sugestão:", error);
                Swal.fire('Erro!', 'Não foi possível enviar sua sugestão.', 'error');
            }
        });
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if(modalConta) modalConta.classList.add('hidden');
            if(modalSugestao) modalSugestao.classList.add('hidden');
        });
    });
    
    function initializeAutocompletes() {
        if (!window.google) return; 
        
        const contaEnderecoInput = document.getElementById("contaEndereco");
        if (contaEnderecoInput) {
            new google.maps.places.Autocomplete(contaEnderecoInput);
        }

        const localInput = document.getElementById("localInput");
        if (localInput) {
            const autocomplete = new google.maps.places.Autocomplete(localInput);
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (place.geometry) {
                    localSelecionado = {
                        nome: place.formatted_address,
                        geoloc: {
                            coordinates: new GeoPoint(place.geometry.location.lat(), place.geometry.location.lng())
                        }
                    };
                }
            });
        }
    }

    // --- OUVINTES DE EVENTOS PARA A BUSCA ---
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // --- CHAMADAS INICIAIS ---
    loadAndDisplayEvents();
    initializeAutocompletes();
});