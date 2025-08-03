import { db } from './firebase-config.js';
import { collection, getCountFromServer, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Painel de Admin carregado! Buscando dados...");

    // Função para buscar e preencher os números dos cartões (KPIs)
    async function fetchKPIs() {
        try {
            const usersCollection = collection(db, "users");
            const suggestionsCollection = collection(db, "suggestions");
            const eventsCollection = collection(db, "events");

            const usersSnapshot = await getCountFromServer(usersCollection);
            const suggestionsSnapshot = await getCountFromServer(suggestionsCollection);
            const eventsSnapshot = await getCountFromServer(eventsCollection);

            document.getElementById('kpi-usuarios').textContent = usersSnapshot.data().count;
            document.getElementById('kpi-sugestoes').textContent = suggestionsSnapshot.data().count;
            document.getElementById('kpi-shows').textContent = eventsSnapshot.data().count;

        } catch (error) {
            console.error("Erro ao buscar KPIs:", error);
        }
    }

    // Função para buscar as sugestões e popular o mapa e a lista
    async function fetchSuggestionsData() {
        try {
            const suggestionsCollection = collection(db, "suggestions");
            const querySnapshot = await getDocs(suggestionsCollection);
            
            const heatmapPoints = [];
            const cityCounts = {};

            querySnapshot.forEach(doc => {
                const suggestion = doc.data();
                
                if (suggestion.geoloc && suggestion.geoloc.coordinates) {
                    const { latitude, longitude } = suggestion.geoloc.coordinates;
                    heatmapPoints.push([latitude, longitude, 0.5]);
                }

                if (suggestion.localSugerido) {
                    const city = suggestion.localSugerido.split(',').slice(-2, -1)[0]?.trim() || suggestion.localSugerido;
                    cityCounts[city] = (cityCounts[city] || 0) + 1;
                }
            });

            initializeHeatmap(heatmapPoints);
            renderTopCities(cityCounts);

        } catch (error) {
            console.error("Erro ao buscar sugestões:", error);
        }
    }

    // Função para inicializar o mapa de calor (VERSÃO MODIFICADA)
    function initializeHeatmap(points) {
        const mapContainer = document.getElementById('heatmap-container');

        // Se não houver pontos, exibe uma mensagem e para.
        if (points.length === 0) {
            mapContainer.innerHTML = '<p style="text-align:center; margin-top: 50px;">Nenhuma sugestão com geolocalização para exibir o mapa de calor.</p>';
            return;
        }
        
        // Remove a classe de placeholder para que o mapa apareça corretamente.
        mapContainer.classList.remove('map-placeholder');

        const map = L.map('heatmap-container').setView([-14.235, -51.925], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 11
        }).addTo(map);
    }

    // Função para renderizar a lista de cidades mais pedidas
    function renderTopCities(cityCounts) {
        const sortedCities = Object.entries(cityCounts)
            .sort(([,a],[,b]) => b - a)
            .slice(0, 6);

        const maxSuggestions = sortedCities.length > 0 ? sortedCities[0][1] : 1;
        const container = document.getElementById('cities-list-container');
        container.innerHTML = '';

        for (const [city, count] of sortedCities) {
            const percentage = (count / maxSuggestions) * 100;
            const listItem = `
                <li>
                    <span>${city}</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage}%;"></div>
                    </div>
                    <span>${count} sugestões</span>
                </li>
            `;
            container.innerHTML += listItem;
        }
    }

    // Chama as funções para carregar os dados
    fetchKPIs();
    fetchSuggestionsData();
});