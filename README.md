# 🎓 Portal de Inscrições FAMETRO

Portal de inscriptions para processos seletivos, cursos técnicos e vestibulares da FAMETRO.

## 🔗 Links

| Ambiente | URL |
|----------|-----|
| **Site (GitHub Pages)** | https://kauansntz.github.io/portal-inscricoes/ |
| **API (Render)** | https://portal-inscricoes.onrender.com/ |

## 🏗️ Arquitetura

```
├── index.html          # Login/Registro
├── portal.html        # Portal de inscrições
├── links.html        # Central de links
├── tickets.html     # Sistema de tickets
├── server-api.js    # API Express (Backend)
└── assets/
    ├── js/          # Scripts frontend
    ├── css/         # Estilos
    └── data/        # Dados (cursos, preços)
```

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|---------|----------|
| GET | `/` | Status da API |
| GET | `/processos` | Lista processos (287 registros) |
| GET | `/unidades` | Lista unidades (45 unidades) |
| GET | `/modalidades` | Lista modalidades (5 modalidades) |

**Query Params:**
- `?limit=10` - Paginação
- `?unidade_id=SEDE` - Filtro por unidade
- `?modalidade=EAD` - Filtro por modalidade

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js + Express
- **Dados:** Google Sheets via OpenSheet API
- **Deploy:** Render (API) + GitHub Pages (Site)
- **Auth:** Firebase Auth

## 📝 Licença

MIT