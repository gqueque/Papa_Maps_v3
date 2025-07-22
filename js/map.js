import { db } from './firebase-config.js';
import { collection, getDocs, onSnapshot, query, where, orderBy, GeoPoint } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.infoWindows = [];
        this.userLocation = null;
        this.events = [];
        this.filteredEvents = [];
        this.currentFilters = {
            date: 'all',
            distance: 'all',
            location: null
        };
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        await this.getCurrentLocation();
        this.initMap();
        this.setupEventListeners();
        await this.loadEvents();
        this.showLoading(false);
    }

    showLoading(show) {
        const loadingElement = document.getElementById('mapLoading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        resolve();
                    },
                    (error) => {
                        console.log('Geolocation error:', error);
                        // Default para São Paulo se não conseguir obter localização
                        this.userLocation = { lat: -23.5505, lng: -46.6333 };
                        resolve();
                    },
                    { timeout: 10000, maximumAge: 600000 }
                );
            } else {
                this.userLocation = { lat: -23.5505, lng: -46.6333 };
                resolve();
            }
        });
    }

    initMap() {
        const mapOptions = {
            zoom: 10,
            center: this.userLocation,
            styles: this.getMapStyles(),
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM
            }
        };

        this.map = new google.maps.Map(document.getElementById('map'), mapOptions);

        // Adicionar marcador da localização do usuário
        if (this.userLocation) {
            new google.maps.Marker({
                position: this.userLocation,
                map: this.map,
                title: 'Sua localização',
                icon: {
                    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM0Mjg1RjQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                    scaledSize: new google.maps.Size(20, 20),
                    anchor: new google.maps.Point(10, 10)
                }
            });
        }
    }

    getMapStyles() {
        return [
            {
                "featureType": "all",
                "elementType": "geometry",
                "stylers": [{ "color": "#f5f5f5" }]
            },
            {
                "featureType": "all",
                "elementType": "labels.icon",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#616161" }]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.stroke",
                "stylers": [{ "color": "#f5f5f5" }]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#bdbdbd" }]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [{ "color": "#eeeeee" }]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#757575" }]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{ "color": "#e5e5e5" }]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#9e9e9e" }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{ "color": "#ffffff" }]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#757575" }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{ "color": "#dadada" }]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#616161" }]
            },
            {
                "featureType": "road.local",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#9e9e9e" }]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry",
                "stylers": [{ "color": "#e5e5e5" }]
            },
            {
                "featureType": "transit.station",
                "elementType": "geometry",
                "stylers": [{ "color": "#eeeeee" }]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{ "color": "#c9c9c9" }]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#9e9e9e" }]
            }
        ];
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.currentFilters.date = e.target.value;
            this.applyFilters();
        });

        document.getElementById('distanceFilter').addEventListener('change', (e) => {
            this.currentFilters.distance = e.target.value;
            this.applyFilters();
        });

        // Busca por localização
        document.getElementById('searchLocationBtn').addEventListener('click', () => {
            this.searchLocation();
        });

        document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // Controles do mapa
        document.getElementById('myLocationBtn').addEventListener('click', () => {
            this.goToUserLocation();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Setup do autocomplete para busca de localização
        const locationInput = document.getElementById('locationSearch');
        const autocomplete = new google.maps.places.Autocomplete(locationInput, {
            types: ['(cities)'],
            componentRestrictions: { country: 'BR' }
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                this.currentFilters.location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    name: place.name
                };
                this.map.setCenter(place.geometry.location);
                this.map.setZoom(12);
                this.applyFilters();
            }
        });
    }

    async loadEvents() {
        try {
            // Listener em tempo real para eventos
            const eventsQuery = query(
                collection(db, 'events'),
                orderBy('createdAt', 'desc')
            );

            onSnapshot(eventsQuery, (snapshot) => {
                this.events = [];
                snapshot.forEach((doc) => {
                    const eventData = { id: doc.id, ...doc.data() };
                    this.events.push(eventData);
                });
                
                this.applyFilters();
                this.updateEventsList();
            });

        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            this.showNotification('Erro ao carregar eventos', 'error');
        }
    }

    applyFilters() {
        this.filteredEvents = this.events.filter(event => {
            // Filtro de data
            if (this.currentFilters.date !== 'all') {
                const eventDate = event.eventDate ? event.eventDate.toDate() : new Date(event.createdAt.toDate());
                const now = new Date();
                
                switch (this.currentFilters.date) {
                    case 'today':
                        if (!this.isSameDay(eventDate, now)) return false;
                        break;
                    case 'week':
                        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        if (eventDate < now || eventDate > weekFromNow) return false;
                        break;
                    case 'month':
                        const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                        if (eventDate < now || eventDate > monthFromNow) return false;
                        break;
                    case 'upcoming':
                        if (eventDate < now) return false;
                        break;
                }
            }

            // Filtro de distância
            if (this.currentFilters.distance !== 'all' && this.userLocation) {
                const eventLocation = event.geoloc.coordinates;
                const distance = this.calculateDistance(
                    this.userLocation.lat, this.userLocation.lng,
                    eventLocation.latitude, eventLocation.longitude
                );
                
                const maxDistance = parseInt(this.currentFilters.distance);
                if (distance > maxDistance) return false;
            }

            // Filtro de localização específica
            if (this.currentFilters.location) {
                const eventLocation = event.geoloc.coordinates;
                const distance = this.calculateDistance(
                    this.currentFilters.location.lat, this.currentFilters.location.lng,
                    eventLocation.latitude, eventLocation.longitude
                );
                
                // Mostrar eventos num raio de 50km da localização pesquisada
                if (distance > 50) return false;
            }

            return true;
        });

        this.updateMapMarkers();
    }

    updateMapMarkers() {
        // Limpar marcadores existentes
        this.markers.forEach(marker => marker.setMap(null));
        this.infoWindows.forEach(infoWindow => infoWindow.close());
        this.markers = [];
        this.infoWindows = [];

        // Adicionar novos marcadores
        this.filteredEvents.forEach(event => {
            const marker = new google.maps.Marker({
                position: {
                    lat: event.geoloc.coordinates.latitude,
                    lng: event.geoloc.coordinates.longitude
                },
                map: this.map,
                title: event.eventName,
                icon: {
                    url: this.getEventMarkerIcon(event),
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 40)
                },
                animation: google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
                content: this.createInfoWindowContent(event)
            });

            marker.addListener('click', () => {
                // Fechar outras info windows
                this.infoWindows.forEach(iw => iw.close());
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
            this.infoWindows.push(infoWindow);
        });

        // Ajustar zoom para mostrar todos os marcadores
        if (this.markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => bounds.extend(marker.getPosition()));
            
            if (this.userLocation) {
                bounds.extend(new google.maps.LatLng(this.userLocation.lat, this.userLocation.lng));
            }
            
            this.map.fitBounds(bounds);
            
            // Garantir zoom mínimo
            google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
                if (this.map.getZoom() > 15) {
                    this.map.setZoom(15);
                }
            });
        }
    }

    getEventMarkerIcon(event) {
        // Ícone customizado baseado no tipo de evento ou status
        const isUpcoming = event.eventDate ? event.eventDate.toDate() > new Date() : true;
        const color = isUpcoming ? '#ff6b35' : '#999999';
        
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C12.268 0 6 6.268 6 14C6 22.5 20 40 20 40S34 22.5 34 14C34 6.268 27.732 0 20 0Z" fill="${color}"/>
                <circle cx="20" cy="14" r="8" fill="white"/>
                <text x="20" y="18" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">🎵</text>
            </svg>
        `)}`;
    }

    createInfoWindowContent(event) {
        const eventDate = event.eventDate ? event.eventDate.toDate() : new Date(event.createdAt.toDate());
        const distance = this.userLocation ? 
            this.calculateDistance(
                this.userLocation.lat, this.userLocation.lng,
                event.geoloc.coordinates.latitude, event.geoloc.coordinates.longitude
            ).toFixed(1) : null;

        return `
            <div class="custom-info-window">
                <h3>${event.eventName}</h3>
                <p><i class="fas fa-calendar"></i> ${eventDate.toLocaleDateString('pt-BR')}</p>
                <p><i class="fas fa-clock"></i> ${event.eventTime || 'Horário a confirmar'}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${event.address}</p>
                ${distance ? `<p><i class="fas fa-route"></i> ${distance} km de distância</p>` : ''}
                <button class="info-btn" onclick="window.mapManager.showEventDetails('${event.id}')">
                    Ver detalhes
                </button>
            </div>
        `;
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        // Preencher modal com detalhes do evento
        document.getElementById('modalEventName').textContent = event.eventName;
        document.getElementById('modalEventDate').textContent = 
            event.eventDate ? event.eventDate.toDate().toLocaleDateString('pt-BR') : 'Data a confirmar';
        document.getElementById('modalEventTime').textContent = event.eventTime || 'Horário a confirmar';
        document.getElementById('modalEventAddress').textContent = event.address;
        document.getElementById('modalEventDescription').textContent = 
            event.description || 'Show imperdível do Papaizinho! 🎵🔥';

        // Configurar botões de ação
        document.getElementById('directionsBtn').onclick = () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${event.geoloc.coordinates.latitude},${event.geoloc.coordinates.longitude}`;
            window.open(url, '_blank');
        };

        document.getElementById('shareEventBtn').onclick = () => {
            this.shareEvent(event);
        };

        document.getElementById('addToCalendarBtn').onclick = () => {
            this.addToCalendar(event);
        };

        // Mostrar modal
        document.getElementById('eventModal').style.display = 'block';
    }

    updateEventsList() {
        const eventsContainer = document.getElementById('eventsList');
        eventsContainer.innerHTML = '';

        if (this.filteredEvents.length === 0) {
            eventsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 1rem;">Nenhum evento encontrado</p>';
            return;
        }

        this.filteredEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item slide-up';
            
            const eventDate = event.eventDate ? event.eventDate.toDate() : new Date(event.createdAt.toDate());
            const distance = this.userLocation ? 
                this.calculateDistance(
                    this.userLocation.lat, this.userLocation.lng,
                    event.geoloc.coordinates.latitude, event.geoloc.coordinates.longitude
                ) : null;

            eventElement.innerHTML = `
                <div class="event-title">${event.eventName}</div>
                <div class="event-date">
                    <i class="fas fa-calendar"></i>
                    ${eventDate.toLocaleDateString('pt-BR')}
                </div>
                <div class="event-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${event.address}
                </div>
                ${distance ? `<div class="event-distance">${distance.toFixed(1)} km</div>` : ''}
            `;

            eventElement.addEventListener('click', () => {
                // Centralizar no mapa e mostrar detalhes
                this.map.setCenter({
                    lat: event.geoloc.coordinates.latitude,
                    lng: event.geoloc.coordinates.longitude
                });
                this.map.setZoom(15);
                
                // Encontrar e clicar no marcador correspondente
                const marker = this.markers.find(m => 
                    m.getPosition().lat() === event.geoloc.coordinates.latitude &&
                    m.getPosition().lng() === event.geoloc.coordinates.longitude
                );
                if (marker) {
                    google.maps.event.trigger(marker, 'click');
                }
            });

            eventsContainer.appendChild(eventElement);
        });
    }

    searchLocation() {
        const locationInput = document.getElementById('locationSearch');
        const query = locationInput.value.trim();
        
        if (!query) return;

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                this.currentFilters.location = {
                    lat: location.lat(),
                    lng: location.lng(),
                    name: results[0].formatted_address
                };
                
                this.map.setCenter(location);
                this.map.setZoom(12);
                this.applyFilters();
            } else {
                this.showNotification('Localização não encontrada', 'error');
            }
        });
    }

    goToUserLocation() {
        if (this.userLocation) {
            this.map.setCenter(this.userLocation);
            this.map.setZoom(12);
            
            // Limpar filtro de localização
            this.currentFilters.location = null;
            document.getElementById('locationSearch').value = '';
            this.applyFilters();
        } else {
            this.showNotification('Localização não disponível', 'error');
        }
    }

    toggleFullscreen() {
        const mapContainer = document.querySelector('.map-container');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().then(() => {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            });
        }
    }

    shareEvent(event) {
        if (navigator.share) {
            navigator.share({
                title: event.eventName,
                text: `Confira este show do Papaizinho: ${event.eventName}`,
                url: window.location.href
            });
        } else {
            // Fallback para clipboard
            const shareText = `Confira este show do Papaizinho: ${event.eventName} em ${event.address}. Veja mais em ${window.location.href}`;
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('Link copiado para a área de transferência!', 'success');
            });
        }
    }

    addToCalendar(event) {
        const eventDate = event.eventDate ? event.eventDate.toDate() : new Date(event.createdAt.toDate());
        const startDate = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.eventName)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(`Show do Papaizinho: ${event.eventName}`)}&location=${encodeURIComponent(event.address)}`;
        
        window.open(googleCalendarUrl, '_blank');
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raio da Terra em km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Adicionar estilos se não existirem
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    animation: slideInRight 0.3s ease-out;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .notification-success { background: #4CAF50; }
                .notification-error { background: #f44336; }
                .notification-info { background: #2196F3; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Função global para inicializar o mapa (callback do Google Maps)
window.initMap = function() {
    window.mapManager = new MapManager();
};

// Exportar para uso em outros módulos
export { MapManager };