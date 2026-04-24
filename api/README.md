# API Portal Inscrições

API proxy em Node.js/Express para consumir dados do Google Sheets via OpenSheet.

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Instalação

```bash
cd api
npm install
```

## Executar

### Desenvolvimento (com nodemon)

```bash
npm run dev
```

### Produção

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Endpoints

### Processos

```bash
# Listar todos os processos (com paginação)
curl http://localhost:3000/processos

# Com filtros
curl "http://localhost:3000/processos?unidade_id=altamira&modalidade=EAD&periodo=2026/2"

# Com paginação
curl "http://localhost:3000/processos?limit=10&offset=0"

# Por código
curl http://localhost:3000/processos/3425
```

### Unidades

```bash
# Listar todas
curl http://localhost:3000/unidades

# Por tipo
curl "http://localhost:3000/unidades?tipo=capital"

# Por ID
curl http://localhost:3000/unidades/altamira
```

### Modalidades

```bash
curl http://localhost:3000/modalidades
```

## Respostas de Exemplo

### GET /processos?unidade_id=altamira

```json
{
  "total": 6,
  "limit": 10,
  "offset": 0,
  "data": [
    {
      "codigo": "3425",
      "tipo_ingresso": "VESTIBULAR ONLINE",
      "unidade_id": "altamira",
      "unidade_nome": "ALTAMIRA",
      "modalidade": "EAD",
      "periodo": "2026/2",
      "link": "https://..."
    }
  ]
}
```

## Variáveis de Ambiente (.env)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| PORT | Porta do servidor | 3000 |
| CACHE_DURATION_MS | Tempo de cache (ms) | 300000 (5 min) |

## Deploy

### Render (gratuito)

1. Criar conta em [render.com](https://render.com)
2. Criar novo Web Service
3. Conectar repositório Git
4. Configurar:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

### Railway

1. Criar conta em [railway.app](https://railway.app)
2. Conectar repositório
3. Deploy automático

### Cloudflare Workers

Para um endpoint serverless mais rápido, considere reescrever em Cloudflare Workers.

## Estrutura

```
api/
├── .env              # Variáveis de ambiente
├── package.json      # Dependências
├── server.js         # Servidor principal
├── routes/
│   ├── processos.js
│   ├── unidades.js
│   └── modalidades.js
└── services/
    └── sheetsService.js  # Lógica de cache e API
```

## Limitações

- Depende do OpenSheet (serviço externo)
- Cache de 5 minutos pode atrasar atualizações
- Sem autenticação (API pública)