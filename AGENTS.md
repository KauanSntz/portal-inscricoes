# Portal Inscrições - Documentação do Agente

## Visão Geral do Projeto

Portal de Inscrições da FAMETRO para processos seletivos, cursos técnicos e vestibulares.

### Stack

- **Frontend**: HTML, JS vanilla, CSS
- **Backend API**: Node.js + Express
- **Dados**: Google Sheets via OpenSheet + JSON local
- **Deploy**: Render (2 serviços)
- **Ferramentas**: Ollama (Qwen2.5 Coder)

### Estrutura de Arquivos

```
portal-inscricoes/
├── index.html              # Página principal
├── portal.html           # Portal de inscrições
├── links.html           # Central de links
├── tickets.html        # Sistema de tickets
├── login.html          # Login admin
├── admin-users.html   # Gerenciamento de usuários
├── menu-content.html  # Menu carregado dinamicamente
├── server-api.js      # API Express (raiz)
├── routes/           # Rotas da API
│   ├── processos.js
│   ├── unidades.js
│   └── modalidades.js
├── services/         # Serviços
│   └── sheetsService.js
├── assets/
│   ├── js/          # Scripts frontend
│   ├── css/         # Estilos
│   └── data/        # JSONs de dados
├── functions/       # Firebase Cloud Functions (tickets/users)
├── firebase.json    # Config Firebase
├── render.yaml      # Config deploy
└── package.json     # Dependências
```

---

## Endpoints da API

### Produção

- **Site**: https://portal-inscricoes.onrender.com
- **API**: https://portal-inscricoes-api.onrender.com

### Local

- **Local**: http://localhost:3000

### Rotas

| Método | Endpoint | Descrição |
|--------|----------|----------|
| GET | `/processos` | Lista todos os processos |
| GET | `/processos?limit=10` | Lista com paginação |
| GET | `/processos?unidade_id=SEDE` | Filtra por unidade |
| GET | `/processos?modalidade=EAD` | Filtra por modalidade |
| GET | `/processos/:codigo` | Detalhes de um processo |
| GET | `/unidades` | Lista unidades |
| GET | `/modalidades` | Lista modalidades |

---

## Fluxo de Dados

### 1. Dados Originais

- Google Sheets → OpenSheet API → sheetsService.js → rotas Express

### 2. Frontend (api.js)

```
PortalAPI.load() 
  → fetch(${API_URL}/processos)
  → transformToPortalLinks(processos)
  → localStorage cache (5 min)
  → window.PORTAL_LINKS
```

### 3. Fallback (links-page.js)

```
loadRecords()
  → Tenta JSON (portal_links_2026_1.json)
  → Faz merge com PORTAL_LINKS
  → renderiza na interface
```

---

## Como o Frontend Usa a API

### Arquivos Principais

1. **assets/js/api.js** - Carrega dados da API
2. **assets/js/links-page.js** - Renderiza página de links
3. **assets/js/app.js** - App principal

###PORTAL_LINKS (estrutura)

```javascript
[
  {
    key: "SEDE",
    title: "SEDE",
    theme: "sede",
    coursesKey: "SEDE",
    blocks: {
      ead: {
        title: "EAD (100% Online)",
        links: [
          { code: "3116", type: "vestibular", modality: "EAD", href: "..." }
        ]
      }
    }
  }
]
```

---

## Como Fazer-build e Deploy

### Deploy via GitHub (automático)

1. Faz push para `feature/sistema-tickets`
2. Render detecta e faz deploy automaticamente

### Deploy manual

```bash
# API
ollama deploy create portal-inscricoes-api --confirm

# Site
ollama deploy create portal-inscricoes --confirm
```

### Variáveis de Ambiente

No Render:
- `OPENSHET_BASE_URL`: URL do OpenSheet
- `URL_PROCESSOS`: processos_normalizados
- `URL_UNIDADES`: unidades
- `URL_MODALIDADES`: modalidades
- `CACHE_DURATION_MS`: 300000 (5 min)

---

##Tarefas Comuns

### Adicionar novo processo

1. Adicionar na planilha Google Sheets
2. Esperar cache expirar (5 min) ou invalidar

### Adicionar nova unidade

1. Adicionar linha em `unidades` no Sheets
2. Adicionar theme em `assets/css/themes.css`

### Corrigir dados

1. Editar JSON em `assets/data/`
2. Fazer commit e push

---

## Configuração Ollama

### Provider OpenCode

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "big-pickle": {
          "name": "Big Pickle"
        },
        "qwen2.5-coder:7b-32k": {
          "name": "Qwen Coder 7B 32K"
        },
        "qwen2.5-coder:7b": {
          "name": "Qwen Coder 7B"
        }
      }
    }
  },
  "model": "ollama/big-pickle",
  "small_model": "ollama/qwen2.5-coder:7b"
}
```

### Comandos Úteis

```bash
# Listar modelos
ollama list

# Baixar modelo
ollama pull big-pickle

# Testar localmente
ollama run big-pickle

# Ver servidor
curl http://localhost:11434/api/tags
```

---

## Troubleshooting

### API retorna 503

1. Verificar se serviço está ativo no Render
2. Verificar logs: `render logs <service-id>`
3. Se suspenso, reativar via dashboard

###PORTAL_LINKS não carrega

1. Verificar console (F12)
2. Testar API direto: `curl https://portal-inscricoes.onrender.com/processos`
3. Verificar cache localStorage

### Erro de build no Render

1. Verificar se package.json está na raiz
2. Verificar se startCommand está correto
3. Verificar logs de build

### Módulo não encontrado

- Verificar caminhos de require
- routes/processos.js → `../services/sheetsService`
- não `./services/sheetsService`

---

## Comandos Rápidos

```bash
# Desenvolvimento local
npm install
node server-api.js

# Testar API
curl http://localhost:3000/processos?limit=2

# Ver logs Render
render logs srv-d7lq0nvavr4c73aqkatg -r <instance-id>

# Deploy
render deploys create <service-id> --confirm
```

---

## Contatos

- **Dashboard Render**: https://dashboard.render.com
- **Repositório**: https://github.com/KauanSntz/portal-inscricoes
- **Site**: https://portal-inscricoes.onrender.com
- **API**: https://portal-inscricoes-api.onrender.com