# Papa Maps v3 🎵🗺️

Sistema completo de mapeamento de eventos musicais com notificações WhatsApp e painel administrativo.

## 🚀 Funcionalidades

### 🗺️ Mapa Interativo
- **Visualização em tempo real** de eventos no mapa
- **Filtros avançados** por data, distância e localização
- **Marcadores customizados** com informações detalhadas
- **Geolocalização automática** do usuário
- **Interface responsiva** para desktop e mobile

### 📱 Sistema de Notificações
- **Notificações automáticas** via WhatsApp para usuários próximos
- **Integração Z-API** para envio de mensagens
- **Filtros de proximidade** baseados em geolocalização
- **Templates personalizáveis** de mensagens
- **Histórico completo** de notificações enviadas

### 👤 Gestão de Usuários
- **Cadastro com geolocalização** automática
- **Autenticação Firebase** segura
- **Validação de dados** completa
- **Máscaras de entrada** para WhatsApp
- **Autocomplete de endereços** Google Places

### ⚙️ Painel Administrativo
- **Dashboard completo** com estatísticas
- **Gerenciamento de eventos** (CRUD completo)
- **Visualização de usuários** cadastrados
- **Central de notificações** personalizadas
- **Analytics e relatórios** em tempo real
- **Configurações do sistema**

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase (Firestore, Auth, Functions)
- **Mapas**: Google Maps API
- **Notificações**: Z-API (WhatsApp Business)
- **Geolocalização**: Geofire-js
- **UI/UX**: Font Awesome, CSS Grid/Flexbox

## 📋 Pré-requisitos

1. **Conta Firebase** com projeto configurado
2. **Google Maps API Key** com as seguintes APIs habilitadas:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. **Conta Z-API** para WhatsApp Business
4. **Servidor web** (local ou hospedado)

## ⚙️ Configuração

### 1. Firebase Setup

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative os serviços:
   - **Authentication** (Email/Password)
   - **Firestore Database**
   - **Cloud Functions**
3. Configure as regras do Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler e escrever seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Eventos são públicos para leitura, admins podem escrever
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email in ['admin@papamaps.com', 'papaizinho@papamaps.com'];
    }
    
    // Notificações apenas para admins
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.token.email in ['admin@papamaps.com', 'papaizinho@papamaps.com'];
    }
  }
}
```

4. Atualize `js/firebase-config.js` com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID"
};
```

### 2. Google Maps API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Ative as APIs necessárias
3. Crie uma API Key
4. Atualize os arquivos HTML substituindo `YOUR_GOOGLE_MAPS_API_KEY` pela sua chave

### 3. Z-API Configuration

1. Crie uma conta no [Z-API](https://z-api.io/)
2. Configure uma instância do WhatsApp Business
3. Obtenha o Instance ID e Token
4. Configure no Firebase Functions:

```bash
firebase functions:config:set zapi.instance="SEU_INSTANCE_ID" zapi.token="SEU_TOKEN"
```

### 4. Deploy das Cloud Functions

1. Instale o Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto:
```bash
firebase init functions
```

4. Copie o conteúdo de `js/index.js` para `functions/index.js`

5. Instale as dependências:
```bash
cd functions
npm install firebase-admin firebase-functions geofire-js @googlemaps/google-maps-services-js
```

6. Configure a chave do Google Maps:
```bash
firebase functions:config:set google.maps_api_key="SUA_GOOGLE_MAPS_API_KEY"
```

7. Deploy:
```bash
firebase deploy --only functions
```

## 🚀 Instalação

1. **Clone o repositório**:
```bash
git clone https://github.com/seu-usuario/papa-maps-v3.git
cd papa-maps-v3
```

2. **Configure as credenciais** (veja seção de configuração acima)

3. **Execute em um servidor web**:
```bash
# Usando Python
python -m http.server 8000

# Usando Node.js (http-server)
npx http-server

# Usando PHP
php -S localhost:8000
```

4. **Acesse**: `http://localhost:8000/pages/index.html`

## 📱 Como Usar

### Para Usuários

1. **Acesse o mapa** e veja os eventos próximos
2. **Cadastre-se** para receber notificações automáticas
3. **Use os filtros** para encontrar eventos específicos
4. **Clique nos marcadores** para ver detalhes dos eventos

### Para Administradores

1. **Faça login** com email de administrador
2. **Acesse o painel admin** através do botão no header
3. **Gerencie eventos**: criar, editar, excluir
4. **Visualize usuários** cadastrados
5. **Envie notificações** personalizadas
6. **Monitore estatísticas** em tempo real

## 🔧 Estrutura do Projeto

```
papa-maps-v3/
├── pages/
│   ├── index.html          # Página principal com mapa
│   ├── admin.html          # Painel administrativo
│   ├── login.html          # Página de login
│   └── criar_conta.html    # Página de cadastro
├── js/
│   ├── firebase-config.js  # Configuração Firebase
│   ├── map.js             # Gerenciador do mapa
│   ├── ui.js              # Interface do usuário
│   ├── admin-manager.js   # Gerenciador admin
│   ├── auth.js            # Autenticação
│   ├── main.js            # Arquivo principal
│   └── index.js           # Cloud Functions
├── css/
│   ├── global.css         # Estilos globais
│   ├── map-style.css      # Estilos do mapa
│   └── admin-style.css    # Estilos admin
├── assets/
│   └── [imagens]          # Recursos visuais
└── README.md
```

## 🔒 Segurança

- **Regras Firestore** restringem acesso aos dados
- **Validação client-side e server-side** de todos os inputs
- **Sanitização** de dados antes do armazenamento
- **Rate limiting** nas Cloud Functions
- **HTTPS obrigatório** em produção

## 🌟 Funcionalidades Avançadas

### Geolocalização Inteligente
- **Busca por proximidade** usando Geohash
- **Cálculo de distâncias** precisas
- **Filtros geográficos** automáticos

### Notificações Inteligentes
- **Segmentação por localização** dos usuários
- **Templates dinâmicos** com variáveis
- **Controle de frequência** para evitar spam
- **Histórico e analytics** completos

### Interface Responsiva
- **Design mobile-first**
- **PWA ready** (pode ser instalado como app)
- **Offline fallback** para funcionalidades básicas
- **Performance otimizada**

## 📊 Monitoramento

O sistema inclui:
- **Logs detalhados** de todas as operações
- **Métricas de uso** em tempo real
- **Alertas de erro** automáticos
- **Dashboard de performance**

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: suporte@papamaps.com
- **WhatsApp**: +55 11 99999-9999
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/papa-maps-v3/issues)

## 🎵 Sobre o Papa Maps

O Papa Maps é uma plataforma dedicada a conectar fãs de música aos eventos do Papaizinho, proporcionando uma experiência única de descoberta e engajamento através de tecnologia de ponta.

---

**Desenvolvido com ❤️ para a comunidade Papa-Fã** 🤘
