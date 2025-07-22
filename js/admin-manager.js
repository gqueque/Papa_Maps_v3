import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    where,
    GeoPoint,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class AdminManager {
    constructor() {
        this.currentUser = null;
        this.events = [];
        this.users = [];
        this.currentEventId = null;
        this.autocomplete = null;
        
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
        this.setupGoogleMaps();
        await this.loadInitialData();
    }

    async checkAuthState() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, (user) => {
                if (user && this.isAdmin(user)) {
                    this.currentUser = user;
                    resolve();
                } else {
                    // Redirecionar para login se não for admin
                    window.location.href = 'index.html';
                }
            });
        });
    }

    isAdmin(user) {
        // Lista de emails de administradores
        const adminEmails = ['admin@papamaps.com', 'papaizinho@papamaps.com'];
        return adminEmails.includes(user.email);
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('backToMapBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                this.showNotification('Erro ao fazer logout', 'error');
            }
        });

        // Tab navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Events tab
        document.getElementById('newEventBtn').addEventListener('click', () => {
            this.showEventForm();
        });

        document.getElementById('cancelEventBtn').addEventListener('click', () => {
            this.hideEventForm();
        });

        document.getElementById('cancelEventBtn2').addEventListener('click', () => {
            this.hideEventForm();
        });

        document.getElementById('eventFormData').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventSubmit();
        });

        // Notifications tab
        document.getElementById('sendCustomNotificationBtn').addEventListener('click', () => {
            this.showNotificationForm();
        });

        document.getElementById('cancelNotificationBtn').addEventListener('click', () => {
            this.hideNotificationForm();
        });

        document.getElementById('cancelNotificationBtn2').addEventListener('click', () => {
            this.hideNotificationForm();
        });

        document.getElementById('notificationFormData').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNotificationSubmit();
        });

        // User search
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Analytics timeframe
        document.getElementById('analyticsTimeframe').addEventListener('change', (e) => {
            this.updateAnalytics(e.target.value);
        });
    }

    setupGoogleMaps() {
        // Setup autocomplete for event address
        window.initAdminMap = () => {
            const addressInput = document.getElementById('eventAddress');
            if (addressInput) {
                this.autocomplete = new google.maps.places.Autocomplete(addressInput, {
                    types: ['establishment', 'geocode'],
                    componentRestrictions: { country: 'BR' }
                });
            }

            // Setup autocomplete for notification location
            const notificationLocationInput = document.getElementById('notificationLocation');
            if (notificationLocationInput) {
                new google.maps.places.Autocomplete(notificationLocationInput, {
                    types: ['(cities)'],
                    componentRestrictions: { country: 'BR' }
                });
            }
        };
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.loadEvents(),
                this.loadUsers(),
                this.loadNotificationStats(),
                this.loadAnalytics()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showNotification('Erro ao carregar dados', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadEvents() {
        try {
            const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
            
            onSnapshot(eventsQuery, (snapshot) => {
                this.events = [];
                snapshot.forEach((doc) => {
                    this.events.push({ id: doc.id, ...doc.data() });
                });
                this.renderEvents();
            });
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            this.showNotification('Erro ao carregar eventos', 'error');
        }
    }

    async loadUsers() {
        try {
            const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            
            onSnapshot(usersQuery, (snapshot) => {
                this.users = [];
                snapshot.forEach((doc) => {
                    this.users.push({ id: doc.id, ...doc.data() });
                });
                this.renderUsers();
                this.updateUserStats();
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showNotification('Erro ao carregar usuários', 'error');
        }
    }

    switchTab(tabName) {
        // Update menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        switch (tabName) {
            case 'users':
                this.loadUsers();
                break;
            case 'notifications':
                this.loadNotificationStats();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    showEventForm(eventData = null) {
        const form = document.getElementById('eventForm');
        const title = document.getElementById('formTitle');
        
        if (eventData) {
            title.textContent = 'Editar Evento';
            this.fillEventForm(eventData);
            this.currentEventId = eventData.id;
        } else {
            title.textContent = 'Novo Evento';
            document.getElementById('eventFormData').reset();
            this.currentEventId = null;
        }
        
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }

    hideEventForm() {
        document.getElementById('eventForm').style.display = 'none';
        document.getElementById('eventFormData').reset();
        this.currentEventId = null;
    }

    fillEventForm(eventData) {
        document.getElementById('eventName').value = eventData.eventName || '';
        document.getElementById('eventAddress').value = eventData.address || '';
        document.getElementById('eventDescription').value = eventData.description || '';
        document.getElementById('eventPrice').value = eventData.price || '';
        document.getElementById('eventCapacity').value = eventData.capacity || '';
        document.getElementById('eventCategory').value = eventData.category || 'show';
        document.getElementById('eventImage').value = eventData.imageUrl || '';
        
        if (eventData.eventDate) {
            const date = eventData.eventDate.toDate();
            document.getElementById('eventDate').value = date.toISOString().split('T')[0];
        }
        
        if (eventData.eventTime) {
            document.getElementById('eventTime').value = eventData.eventTime;
        }
    }

    async handleEventSubmit() {
        const eventName = document.getElementById('eventName').value;
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const eventAddress = document.getElementById('eventAddress').value;
        const eventDescription = document.getElementById('eventDescription').value;
        const eventPrice = document.getElementById('eventPrice').value;
        const eventCapacity = document.getElementById('eventCapacity').value;
        const eventCategory = document.getElementById('eventCategory').value;
        const eventImage = document.getElementById('eventImage').value;

        if (!eventName || !eventDate || !eventAddress) {
            this.showNotification('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Geocodificar endereço
            const geocoder = new google.maps.Geocoder();
            const geocodeResult = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: eventAddress }, (results, status) => {
                    if (status === 'OK') {
                        resolve(results[0]);
                    } else {
                        reject(new Error('Geocodificação falhou'));
                    }
                });
            });

            const location = geocodeResult.geometry.location;
            const eventData = {
                eventName,
                address: eventAddress,
                eventDate: Timestamp.fromDate(new Date(eventDate)),
                eventTime,
                description: eventDescription,
                price: eventPrice,
                capacity: eventCapacity ? parseInt(eventCapacity) : null,
                category: eventCategory,
                imageUrl: eventImage,
                geoloc: {
                    coordinates: new GeoPoint(location.lat(), location.lng()),
                    geohash: this.generateGeohash(location.lat(), location.lng())
                },
                createdBy: this.currentUser.uid,
                updatedAt: Timestamp.now()
            };

            if (this.currentEventId) {
                // Atualizar evento existente
                await updateDoc(doc(db, 'events', this.currentEventId), eventData);
                this.showNotification('Evento atualizado com sucesso!', 'success');
            } else {
                // Criar novo evento
                eventData.createdAt = Timestamp.now();
                await addDoc(collection(db, 'events'), eventData);
                this.showNotification('Evento criado com sucesso! Notificações serão enviadas automaticamente.', 'success');
            }

            this.hideEventForm();

        } catch (error) {
            console.error('Erro ao salvar evento:', error);
            this.showNotification('Erro ao salvar evento', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('Tem certeza que deseja excluir este evento?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'events', eventId));
            this.showNotification('Evento excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
            this.showNotification('Erro ao excluir evento', 'error');
        }
    }

    renderEvents() {
        const container = document.getElementById('eventsList');
        container.innerHTML = '';

        if (this.events.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Nenhum evento cadastrado</p>';
            return;
        }

        this.events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card slide-up';
            
            const eventDate = event.eventDate ? event.eventDate.toDate() : new Date();
            const isUpcoming = eventDate > new Date();
            
            eventCard.innerHTML = `
                <div class="event-card-header">
                    <div class="event-card-title">${event.eventName}</div>
                    <div class="event-card-date">
                        <i class="fas fa-calendar"></i>
                        ${eventDate.toLocaleDateString('pt-BR')} ${event.eventTime || ''}
                    </div>
                </div>
                <div class="event-card-body">
                    <div class="event-card-info">
                        <p><i class="fas fa-map-marker-alt"></i> ${event.address}</p>
                        <p><i class="fas fa-tag"></i> ${event.category || 'Show'}</p>
                        ${event.price ? `<p><i class="fas fa-ticket-alt"></i> ${event.price}</p>` : ''}
                        ${event.capacity ? `<p><i class="fas fa-users"></i> Capacidade: ${event.capacity}</p>` : ''}
                    </div>
                    <div class="event-card-actions">
                        <button class="edit-btn" onclick="window.adminManager.showEventForm(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="delete-btn" onclick="window.adminManager.deleteEvent('${event.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        <button class="view-btn" onclick="window.open('index.html', '_blank')">
                            <i class="fas fa-eye"></i> Ver no Mapa
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(eventCard);
        });
    }

    renderUsers() {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = document.createElement('tr');
            const createdAt = user.createdAt ? user.createdAt.toDate() : new Date();
            
            row.innerHTML = `
                <td>${user.nome || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.whatsapp || 'N/A'}</td>
                <td>${user.enderecoCompleto || 'N/A'}</td>
                <td>${createdAt.toLocaleDateString('pt-BR')}</td>
                <td>
                    <div class="table-actions">
                        <button class="view-btn" onclick="window.adminManager.viewUserDetails('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="delete-btn" onclick="window.adminManager.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateUserStats() {
        const totalUsers = this.users.length;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const newUsersThisMonth = this.users.filter(user => {
            if (!user.createdAt) return false;
            const userDate = user.createdAt.toDate();
            return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
        }).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('newUsersThisMonth').textContent = newUsersThisMonth;
        document.getElementById('activeNotifications').textContent = totalUsers; // Todos os usuários recebem notificações
    }

    filterUsers(searchTerm) {
        const tbody = document.querySelector('#usersTable tbody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    async deleteUser(userId) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'users', userId));
            this.showNotification('Usuário excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showNotification('Erro ao excluir usuário', 'error');
        }
    }

    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        alert(`Detalhes do Usuário:
        
Nome: ${user.nome || 'N/A'}
Email: ${user.email || 'N/A'}
WhatsApp: ${user.whatsapp || 'N/A'}
Endereço: ${user.enderecoCompleto || 'N/A'}
Data de Cadastro: ${user.createdAt ? user.createdAt.toDate().toLocaleString('pt-BR') : 'N/A'}`);
    }

    showNotificationForm() {
        document.getElementById('customNotificationForm').style.display = 'block';
        document.getElementById('customNotificationForm').scrollIntoView({ behavior: 'smooth' });
    }

    hideNotificationForm() {
        document.getElementById('customNotificationForm').style.display = 'none';
        document.getElementById('notificationFormData').reset();
    }

    async handleNotificationSubmit() {
        const title = document.getElementById('notificationTitle').value;
        const message = document.getElementById('notificationMessage').value;
        const radius = document.getElementById('notificationRadius').value;
        const location = document.getElementById('notificationLocation').value;

        if (!title || !message) {
            this.showNotification('Preencha título e mensagem', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Aqui você implementaria a lógica para enviar notificações
            // Por enquanto, vamos simular o envio
            
            const notificationData = {
                title,
                message,
                radius,
                location,
                sentBy: this.currentUser.uid,
                sentAt: Timestamp.now(),
                status: 'sent',
                recipientCount: radius === 'all' ? this.users.length : Math.floor(this.users.length * 0.7) // Simulação
            };

            // Salvar no histórico
            await addDoc(collection(db, 'notifications'), notificationData);
            
            this.showNotification('Notificação enviada com sucesso!', 'success');
            this.hideNotificationForm();
            this.loadNotificationStats();

        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            this.showNotification('Erro ao enviar notificação', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadNotificationStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('sentAt', '>=', Timestamp.fromDate(today)),
                orderBy('sentAt', 'desc')
            );

            const snapshot = await getDocs(notificationsQuery);
            const todayNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const sentToday = todayNotifications.filter(n => n.status === 'sent').length;
            const pendingToday = todayNotifications.filter(n => n.status === 'pending').length;

            document.getElementById('sentNotifications').textContent = sentToday;
            document.getElementById('pendingNotifications').textContent = pendingToday;

            this.renderNotificationHistory(todayNotifications);

        } catch (error) {
            console.error('Erro ao carregar estatísticas de notificações:', error);
        }
    }

    renderNotificationHistory(notifications) {
        const container = document.getElementById('notificationsHistory');
        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 1rem;">Nenhuma notificação enviada hoje</p>';
            return;
        }

        notifications.forEach(notification => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const sentAt = notification.sentAt.toDate();
            
            historyItem.innerHTML = `
                <div class="history-content">
                    <div class="history-title">${notification.title}</div>
                    <div class="history-message">${notification.message}</div>
                    <div class="history-meta">
                        ${sentAt.toLocaleString('pt-BR')} • ${notification.recipientCount || 0} destinatários
                    </div>
                </div>
                <div class="history-status ${notification.status}">
                    ${notification.status === 'sent' ? 'Enviado' : 'Pendente'}
                </div>
            `;
            
            container.appendChild(historyItem);
        });
    }

    async loadAnalytics() {
        // Simulação de dados de analytics
        // Em um projeto real, você implementaria queries mais complexas
        
        document.getElementById('regionChart').innerHTML = 'Gráfico de usuários por região (Em desenvolvimento)';
        document.getElementById('popularEventsChart').innerHTML = 'Eventos mais populares (Em desenvolvimento)';
        document.getElementById('engagementChart').innerHTML = 'Taxa de engajamento (Em desenvolvimento)';
        document.getElementById('growthChart').innerHTML = 'Crescimento de usuários (Em desenvolvimento)';
    }

    updateAnalytics(timeframe) {
        // Atualizar analytics baseado no timeframe selecionado
        this.loadAnalytics();
    }

    generateGeohash(lat, lng) {
        // Implementação simples de geohash
        // Em produção, use uma biblioteca como geofire
        return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
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
        if (!document.querySelector('#admin-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
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

// Inicializar AdminManager quando o DOM estiver pronto
let adminManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminManager = new AdminManager();
        window.adminManager = adminManager;
    });
} else {
    adminManager = new AdminManager();
    window.adminManager = adminManager;
}

export { AdminManager };