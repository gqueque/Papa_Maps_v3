import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class UIManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupModalHandlers();
        this.setupAuthStateListener();
        this.setupNavigationHandlers();
        this.setupFormHandlers();
    }

    setupModalHandlers() {
        // Modal de autenticação
        const authModal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        
        // Modal de detalhes do evento
        const eventModal = document.getElementById('eventModal');

        // Abrir modal de login
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showAuthModal('login');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.showAuthModal('register');
            });
        }

        // Fechar modais ao clicar no X ou fora do modal
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // ESC para fechar modais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'block') {
                        this.closeModal(modal);
                    }
                });
            }
        });

        // Alternar entre login e registro
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthMode('register');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthMode('login');
        });
    }

    setupAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.updateUIForAuthState(user);
        });
    }

    setupNavigationHandlers() {
        // Botão de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    this.showNotification('Logout realizado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro no logout:', error);
                    this.showNotification('Erro ao fazer logout', 'error');
                }
            });
        }

        // Botão admin
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
    }

    setupFormHandlers() {
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const isLogin = document.getElementById('loginForm').style.display !== 'none';
                
                if (isLogin) {
                    await this.handleLogin();
                } else {
                    await this.handleRegister();
                }
            });
        }

        // Máscara para WhatsApp
        const whatsappInput = document.getElementById('registerWhatsapp');
        if (whatsappInput) {
            whatsappInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length > 0) {
                    if (value.length <= 2) {
                        value = `+${value}`;
                    } else if (value.length <= 4) {
                        value = `+${value.slice(0, 2)} ${value.slice(2)}`;
                    } else if (value.length <= 9) {
                        value = `+${value.slice(0, 2)} ${value.slice(2, 4)} ${value.slice(4)}`;
                    } else {
                        value = `+${value.slice(0, 2)} ${value.slice(2, 4)} ${value.slice(4, 9)}-${value.slice(9, 13)}`;
                    }
                }
                
                e.target.value = value;
            });
        }

        // Autocomplete para endereço
        const addressInput = document.getElementById('registerAddress');
        if (addressInput && typeof google !== 'undefined') {
            const autocomplete = new google.maps.places.Autocomplete(addressInput, {
                types: ['address'],
                componentRestrictions: { country: 'BR' }
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showNotification('Preencha todos os campos!', 'error');
            return;
        }

        try {
            this.setFormLoading(true);
            
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
            await signInWithEmailAndPassword(auth, email, password);
            
            this.showNotification('Login realizado com sucesso!', 'success');
            this.closeModal(document.getElementById('authModal'));
            
        } catch (error) {
            console.error('Erro no login:', error);
            let errorMessage = 'Erro ao fazer login';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Usuário desabilitado';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
                    break;
            }
            
            this.showNotification(errorMessage, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const whatsapp = document.getElementById('registerWhatsapp').value;
        const address = document.getElementById('registerAddress').value;
        const password = document.getElementById('registerPassword').value;

        if (!name || !email || !whatsapp || !address || !password) {
            this.showNotification('Preencha todos os campos!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        // Validar formato do WhatsApp
        const whatsappRegex = /^\+55\s\d{2}\s\d{4,5}-\d{4}$/;
        if (!whatsappRegex.test(whatsapp)) {
            this.showNotification('Formato do WhatsApp inválido. Use: +55 11 99999-9999', 'error');
            return;
        }

        try {
            this.setFormLoading(true);
            
            // Usar Cloud Function para cadastro com geolocalização
            const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
            const functions = getFunctions();
            const cadastrarUsuario = httpsCallable(functions, 'cadastrarUsuarioComGeolocalizacao');
            
            const result = await cadastrarUsuario({
                nome: name,
                email: email,
                senha: password,
                whatsapp: whatsapp,
                endereco: address
            });

            this.showNotification('Cadastro realizado com sucesso! Você receberá notificações dos shows próximos.', 'success');
            this.closeModal(document.getElementById('authModal'));
            
            // Fazer login automático após cadastro
            setTimeout(() => {
                this.handleLogin();
            }, 1000);
            
        } catch (error) {
            console.error('Erro no cadastro:', error);
            let errorMessage = 'Erro ao criar conta';
            
            if (error.code === 'functions/already-exists') {
                errorMessage = 'Este email já está cadastrado';
            } else if (error.code === 'functions/not-found') {
                errorMessage = 'Endereço não encontrado. Verifique se está correto';
            } else if (error.code === 'functions/invalid-argument') {
                errorMessage = 'Dados inválidos. Verifique os campos';
            }
            
            this.showNotification(errorMessage, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    showAuthModal(mode = 'login') {
        const authModal = document.getElementById('authModal');
        const authModalTitle = document.getElementById('authModalTitle');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (mode === 'login') {
            authModalTitle.textContent = 'Login';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            authModalTitle.textContent = 'Cadastro';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }

        authModal.style.display = 'block';
        
        // Focar no primeiro campo
        setTimeout(() => {
            const firstInput = mode === 'login' ? 
                document.getElementById('loginEmail') : 
                document.getElementById('registerName');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    switchAuthMode(mode) {
        const authModalTitle = document.getElementById('authModalTitle');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (mode === 'login') {
            authModalTitle.textContent = 'Login';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            document.getElementById('loginEmail').focus();
        } else {
            authModalTitle.textContent = 'Cadastro';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            document.getElementById('registerName').focus();
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            
            // Limpar formulários
            const forms = modal.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    }

    updateUIForAuthState(user) {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const adminBtn = document.getElementById('adminBtn');
        const registerBtn = document.getElementById('registerBtn');

        if (user) {
            // Usuário logado
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) {
                logoutBtn.style.display = 'flex';
                logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${user.displayName || user.email}`;
            }
            
            // Mostrar botão admin para administradores
            if (adminBtn && this.isAdmin(user)) {
                adminBtn.style.display = 'flex';
            }

            // Alterar CTA para usuários logados
            if (registerBtn) {
                registerBtn.innerHTML = '<i class="fas fa-check-circle"></i> Notificações Ativas';
                registerBtn.disabled = true;
                registerBtn.style.background = '#4CAF50';
            }

        } else {
            // Usuário não logado
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            
            if (registerBtn) {
                registerBtn.innerHTML = '<i class="fas fa-bell"></i> Receber Notificações';
                registerBtn.disabled = false;
                registerBtn.style.background = '';
            }
        }
    }

    isAdmin(user) {
        // Verificar se o usuário é admin
        // Você pode implementar isso verificando claims customizadas ou uma lista de emails admin
        const adminEmails = ['admin@papamaps.com', 'papaizinho@papamaps.com'];
        return adminEmails.includes(user.email);
    }

    setFormLoading(loading) {
        const submitBtns = document.querySelectorAll('.auth-btn');
        const inputs = document.querySelectorAll('#authForm input');

        submitBtns.forEach(btn => {
            if (loading) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            } else {
                btn.disabled = false;
                const isLogin = document.getElementById('loginForm').style.display !== 'none';
                btn.innerHTML = isLogin ? 'Entrar' : 'Cadastrar';
            }
        });

        inputs.forEach(input => {
            input.disabled = loading;
        });
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

    // Métodos utilitários para outros módulos
    getCurrentUser() {
        return this.currentUser;
    }

    isUserLoggedIn() {
        return !!this.currentUser;
    }
}

// Inicializar UIManager quando o DOM estiver pronto
let uiManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        uiManager = new UIManager();
        window.uiManager = uiManager;
    });
} else {
    uiManager = new UIManager();
    window.uiManager = uiManager;
}

export { UIManager };