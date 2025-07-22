// Arquivo principal que coordena todos os módulos
import { MapManager } from './map.js';
import { UIManager } from './ui.js';

// Variáveis globais para os managers
let mapManager;
let uiManager;

// Função para inicializar a aplicação
function initApp() {
    console.log('🗺️ Iniciando Papa Maps...');
    
    // O UIManager já é inicializado automaticamente no seu próprio arquivo
    // O MapManager será inicializado quando o Google Maps carregar (callback initMap)
    
    console.log('✅ Papa Maps inicializado com sucesso!');
}

// Aguardar o DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Exportar função de inicialização para uso global
window.initApp = initApp;
