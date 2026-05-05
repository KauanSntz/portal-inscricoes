# Portal Inscrições - Documentação do Agente

## Visão Geral do Projeto

Portal de Inscrições da FAMETRO para processos seletivos, cursos técnicos e vestibulares.

### Stack

- **Frontend**: HTML, JS vanilla, CSS
- **Backend API**: Node.js + Express
- **Dados**: Google Sheets via OpenSheet API
- **Deploy**: Render (2 serviços) + GitHub Pages
- **Ferramentas**: OpenCode com Big Pickle (OpenRouter)

---

## Estrutura de Arquivos

```
portal-inscricoes/
├── index.html              # Página de login
├── portal.html           # Portal de inscrições
├── links.html           # Central de links
├── tickets.html        # Sistema de tickets
├── diario.html         # Diário de Bordo
├── login.html          # Login admin
├── admin-links.html    # Admin Gerenciar Links
├── admin-unidades.html   # Admin CRUD Unidades (DESABILITADO temporarily)
├── admin-users.html   # Admin Gerenciar Usuários (DESABILITADO temporarily)
├── menu-content.html  # Menu carregado dinamicamente
├── server-api.js      # API Express (raiz - usado no Render)
├── routes/           # Rotas da API
│   ├── processos.js
│   ├── unidades.js
│   ├── modalidades.js
│   └── admin.js      # Rotas de admin (CRUD)
├── services/         # Serviços
│   ├── sheetsService.js    # Fetch com cache
│   └── sheetsCrudService.js # CRUD Google Sheets
├── assets/
│   ├── js/          # Scripts frontend
│   │   ├── menu.js          # Lógica do menu lateral
│   │   ├── menu-loader.js   # Carrega menu-content.html via fetch
│   │   ├── modals-shared.js # Modais compartilhados (preços, cursos, setores, etc.)
│   │   ├── app.js           # Lógica do portal
│   │   ├── links-page.js    # Central de links
│   │   ├── admin-links.js   # Admin de links
│   │   ├── dark-mode.js     # Toggle dark mode
│   │   └── api.js           # Utilitários de API
│   ├── css/         # Estilos
│   │   ├── styles.css       # Estilos globais
│   │   ├── admin-links.css  # Estilos dedicados admin-links
│   │   └── admin-unidades.css
│   └── data/        # Dados (cursos, preços, coordenadores)
├── functions/       # Firebase Cloud Functions (tickets/users)
├── firebase.json    # Config Firebase
├── render.yaml      # Config deploy Render
├── package.json     # Dependências
└── AGENTS.md        # Esta documentação
```

---

## Endpoints da API

### Produção

| Serviço | URL |
|---------|-----|
| **Site + API** | https://portal-inscricoes.onrender.com |
| **GitHub Pages** | https://kauansntz.github.io/portal-inscricoes |

### Local

- **API**: http://localhost:3000

### Rotas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Status da API |
| GET | `/processos` | Lista todos os processos (287 registros) |
| GET | `/processos?limit=10` | Lista com paginação |
| GET | `/processos?unidade_id=SEDE` | Filtra por unidade |
| GET | `/processos?modalidade=EAD` | Filtra por modalidade |
| GET | `/processos/:codigo` | Detalhes de um processo |
| GET | `/unidades` | Lista unidades (46 unidades) |
| GET | `/modalidades` | Lista modalidades (5 modalidades) |
| POST | `/admin/:tabela` | Criar registro |
| PUT | `/admin/:tabela/:id` | Atualizar registro |
| DELETE | `/admin/:tabela/:id` | Deletar registro |
---


## Rotas de API adicionais

| Nova rota | Descrição |
|-----------|----------|
| coordenadores | Gerencia coordenadores por unidade |
| operadores | Gerencia operadores por unidade |
| cursos-oferta | Listagem de cursos ofertados |
| precos-cursos | Preços de cursos por turno |
| cursos-tecnicos | Cursos técnicos por unidade |

---

### Arquitetura Atual

```
Google Sheets
    ↓
OpenSheet API (opensheet.elk.sh)
    ↓
sheetsService.js (cache 5 min)
    ↓
Express Routes (/processos, /unidades, /modalidades)
    ↓
Frontend (fetch API)
    ↓
links-data.js (window.PORTAL_LINKS)
    ↓
links-page.js (renderização)
```

### PORTAL_LINKS (estrutura)

```javascript
[
  {
    key: "SEDE",
    title: "SEDE",
    blocks: {
      ead: {
        title: "EAD (100% Online)",
        links: [
          { code: "3425", type: "VESTIBULAR ONLINE", modality: "EAD", href: "...", periodo: "2026/2" }
        ]
      }
    }
  }
]
```

### Importante

- **Dados são 100% da API** - JSON local foi removido
- **Período vem da API** - não hardcoded (era 2026/1, agora 2026/2)
- **Sincronização** - links-page.js aguarda PORTAL_LINKS estar disponível

---

## Sistema de Menu

### Carregamento Dinâmico
O menu lateral é carregado via `menu-loader.js` que faz fetch de `menu-content.html` e injeta no `#menu-container`.

### Fluxo de Inicialização
```
menu-loader.js → fetch menu-content.html → injeta em #menu-container → dispara 'menu-loaded'
     ↓
menu.js → escuta 'menu-loaded' → inicializa eventos (toggle, submenus, temas)
```

### Modais do Menu
| Botão | data-action | Modal Aberto |
|-------|-------------|--------------|
| Pesquisar cursos | `open-global-search` | `window.globalModal.open()` |
| Pesquisar preços | `open-prices-menu` | `window.pricesModal.open()` |
| Cursos Técnicos | `open-cursos-tecnicos` | `window.cursosTecnicosModal.open()` |
| Setores | `open-setores` | `window.setoresModal.open()` |
| Coordenação | `open-coordenadores` | `window.coordenadoresModal.open()` |

**⚠️ IMPORTANTE:** Os modais são expostos como objetos (`window.pricesModal`, `window.globalModal`, etc.), **NÃO** como funções `window.openPricesMenu()`. Sempre usar:
```js
if (window.pricesModal) window.pricesModal.open();
// NÃO: window.openPricesMenu() — NÃO EXISTE
```

---

## Componentes de UI

### Botões

| Classe | Uso | Exemplo |
|--------|-----|---------|
| `.btn--accent` | Botões de ação principal | `<button class="btn btn--accent">Salvar</button>` |
| `.btn--block` | Formulários (largura total) | `<button class="btn btn--accent btn--block">Entrar</button>` |
| `.btn--sm` | Ações em tabelas | `<button class="btn btn--sm">✏️</button>` |
| `.btn--nav` | Navegação superior | `<a class="btn btn--nav" href="...">Portal</a>` |
| `.btn--danger` | Ações destrutivas | `<button class="btn btn--danger">Excluir</button>` |

**⚠️ NÃO usar `style` attributes para tamanho de botões.** Usar classes CSS.

### Navegação Superior (`app-nav`)
Todas as páginas compartilham a mesma estrutura:
```html
<nav class="app-nav">
  <div class="nav-left">
    <a class="btn btn--nav" href="./portal.html">Portal</a>
    <a class="btn btn--nav" href="./links.html">Central de Links</a>
    <a class="btn btn--nav" href="./diario.html">Diário de Bordo</a>
    <a class="btn btn--nav" href="./tickets.html">Tickets</a>
    <button class="btn btn--nav" onclick="logout()">Sair</button>
  </div>
  <div class="nav-right">
    <button class="btn btn--nav" id="dark-mode-toggle">🌙</button>
  </div>
</nav>
```

### Modais - Overlay Close Pattern
Para evitar que modais fechem durante seleção de texto (mousedown dentro → mouseup fora), usar:
```js
let mousedownInside = false;
modal.addEventListener('mousedown', () => { mousedownInside = true; });
modal.addEventListener('mouseup', () => { mousedownInside = false; });
modal.addEventListener('click', (e) => {
  if (mousedownInside) return;
  if (e.target === modal) close();
});
```

---

## Configuração do Agente (OpenCode)

### ~/.config/opencode/opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/big-pickle",
  "small_model": "opencode/big-pickle",
  "provider": {
    "openrouter": {
      "options": {
        "baseURL": "https://openrouter.ai/api/v1"
      }
    }
  }
}
```

**Nota**: Big Pickle é um modelo do OpenCode Zen, não do Ollama. Precisa de API key do OpenRouter configurada via `opencode auth login`.

---

## Deploy e CI/CD

### Render (Automático)

Push para `feature/sistema-tickets` → Render detecta e deploya automaticamente.

```bash
# Serviço API: srv-d7lq0nvavr4c73aqkatg
# Serviço Site: srv-d7lqb11kh4rs73agpj6g
```

### Variáveis de Ambiente (Render)

| Variável | Valor |
|----------|-------|
| `OPENSHET_BASE_URL` | https://opensheet.elk.sh/1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo |
| `URL_PROCESSOS` | processos_normalizados |
| `URL_UNIDADES` | unidades |
| `URL_MODALIDADES` | modalidades |
| `CACHE_DURATION_MS` | 300000 (5 min) |

### GitHub Pages

Atualizado automaticamente via GitHub Actions quando há push na branch.

---

## Validação Obrigatória (Após Qualquer Modificação)

### REGRAS OBRIGATÓRIAS

Após **QUALQUER** modificação no código, você **DEVE** executar:

#### 1. VALIDAÇÃO DE BACKEND
- [ ] `GET /` → 200 OK
- [ ] `GET /processos?limit=1` → dados retornados (287 registros)
- [ ] `GET /unidades` → dados retornados (46 unidades)
- [ ] `GET /modalidades` → dados retornados (5 modalidades)

#### 2. VALIDAÇÃO DE CRUD (se aplicável)
- [ ] `POST /admin/:tabela` → criar registro
- [ ] `PUT /admin/:tabela/:id` → atualizar registro
- [ ] `DELETE /admin/:tabela/:id` → deletar registro
- [ ] Cache invalidado corretamente após CRUD

#### 2. VALIDAÇÃO DE FRONTEND
- [ ] Páginas carregam sem erro JS
- [ ] Console (F12) sem erros `RangeError` ou `undefined`
- [ ] `window.PORTAL_LINKS` definido com dados
- [ ] Dados renderizados na interface

#### 3. VALIDAÇÃO DE INTEGRAÇÃO
- [ ] API → fetch → `window.PORTAL_LINKS` → renderização
- [ ] Se API falhar: logar erro claro, NÃO quebrar silenciosamente
- [ ] Verificar que não há `localeCompare` com `a.code` (deve ser `b.code`)

#### 4. VALIDAÇÃO DE CACHE
- [ ] Cache localStorage pode precisar limpeza se estrutura mudou
- [ ] `localStorage.clear()` no browser se necessário

#### 5. VALIDAÇÃO DE DEPLOY
- [ ] Serviço Render sobe sem erro
- [ ] Endpoints em produção OK (não 503)
- [ ] Detectar causa de 503 (serviço dormindo vs crash)

### PROIBIÇÕES
- ❌ NÃO finalizar sem testes
- ❌ NÃO assumir "deve estar funcionando"
- ❌ NÃO ignorar 503, 500, undefined
- ❌ NÃO deixar frontend sem dados visíveis

### FORMATO DE RESPOSTA
Após qualquer alteração, retornar:

```
✔ Backend: (OK ou ERRO + detalhes)
✔ API endpoints: (status de cada rota)
✔ Frontend: (OK ou ERRO + o que está sendo exibido)
✔ Integração: (dados chegando? sim/não)
✔ Console: (erros encontrados)
✔ Produção (Render): (status real)
```

Se algo falhar:
→ Parar tudo
→ Explicar causa raiz
→ Corrigir antes de continuar
→ NÃO pular etapas

---

## Workflow de Commit e Push

### Obrigatório ANTES de cada commit:

1. **Testar API Local**
   - `node server-api.js`
   - Testar: `GET /`, `/processos`, `/unidades`, `/modalidades`

2. **Testar API Produção**
   - `GET https://portal-inscricoes.onrender.com/` → 200
   - `GET https://portal-inscricoes.onrender.com/processos?limit=2` → dados

3. **Verificar Frontend**
   - `assets/js/api.js` e `assets/data/links-data.js` com URL correta
   - Sem referências quebradas

4. **Verificar Credenciais**
   - NÃO commitar `functions/credentials.json`
   - Se detectado, usar `git rm --cached` imediatamente

5. **Feedback ao Usuário**
   - Reportar status de cada teste
   - **PERGUNTAR**: "Posso comitar?"
   - Somente comitar após autorização explícita

### Em caso de erro
- Verificar logs Render
- Não fazer push se API estiver 503
- Reportar erro antes de prosseguir

---

## Troubleshooting

### API retorna 503

1. Render gratuito dorme após 15 min de inatividade
2. Acessar o site primeiro para "acordar" o serviço
3. Verificar logs: `render logs <service-id>`

### PORTAL_LINKS não carrega / Central de Links vazia

1. Verificar console (F12) por erros
2. Testar API direto: `Invoke-WebRequest https://portal-inscricoes.onrender.com/processos`
3. Limpar cache: `localStorage.clear()` no browser
4. Verificar logs:
   - `[links-data] ✅ Script carregado`
   - `[links-data] Cache encontrado: true/false`
   - `[links-data] PORTAL_LINKS setado`
   - `[links-page] PORTAL_LINKS disponível`
   - `[links-page] fromPortalLinks result: X registros`

### Erro RangeError: Invalid language tag

- Causado por `localeCompare` com argumento errado
- Corrigir: `a.code.localeCompare(b.code, "pt-BR")` em vez de `a.code.localeCompare(a.code, "pt-BR")`

### Erro de build no Render

1. Verificar se package.json está na raiz
2. Verificar se startCommand (`npm start`) está correto
3. Verificar logs de build

### Módulo não encontrado

- Verificar caminhos de require
- `routes/processos.js` → `../services/sheetsService`
- não `./services/sheetsService`

### GitHub Push bloqueado por secret

- Usar `git reset --soft HEAD~1` para desfazer commit
- `git rm --cached <arquivo-com-secret>` para remover do staging
- Recommitar sem o arquivo

---

## Tarefas Comuns

### CRUD de dados via API

1. `POST /admin/:tabela` - Criar registro
2. `PUT /admin/:tabela/:id` - Atualizar registro
3. `DELETE /admin/:tabela/:id` - Deletar registro
4. Cache é invalidado automaticamente após CRUD

### Adicionar novo processo

1. Via API: `POST /admin/processos` com dados do processo
2. Ou adicionar na planilha Google Sheets
3. Esperar cache expirar (5 min) ou invalidar

### Adicionar nova unidade

1. Via API: `POST /admin/unidades` com dados da unidade
2. Ou adicionar linha em `unidades` no Sheets
3. Adicionar theme em `assets/css/themes.css` (se necessário)

### Atualizar dados locais

1. Editar JSON em `assets/data/`
2. Fazer commit e push

---

## Comandos Rápidos

```bash
# Instalar dependências
npm install

# Iniciar API local
node server-api.js

# Testar API local
Invoke-WebRequest http://localhost:3000/processos?limit=2

# Ver logs Render
$env:RENDER_API_KEY = "sua-key"
render logs <service-id> -r <instance-id>

# Deploy manual (se necessário)
render deploys create <service-id> --confirm
```

---

## Contatos e Links

| Recurso | URL |
|---------|-----|
| Dashboard Render | https://dashboard.render.com |
| Repositório | https://github.com/KauanSntz/portal-inscricoes |
| Site (Render) | https://portal-inscricoes.onrender.com |
| GitHub Pages | https://kauansntz.github.io/portal-inscricoes |

---

## Problemas Conhecidos e Soluções

| Problema | Solução |
|----------|--------|
| Central de Links vazia | Aguardar PORTAL_LINKS com loop de espera (5s max) |
| 503 após很久 inatividade | Acessar site para acordar serviço |
| JSON local desatualizado | Removido - usar apenas API |
| Período 2026/1 aparecendo | Corrigido - agora usa `ln.periodo` da API |
| localeCompare error | `String(a.code\|\|"").localeCompare(String(b.code\|\|""), "pt-BR")` |
| Modal "Pesquisar Preços" não abre | Verificar se está chamando `window.pricesModal.open()` e NÃO `window.openPricesMenu()` |
| Acentos aparecem como `├í` `├ú` | Encoding corrompido. Rodar `git checkout -- <arquivo>` para restaurar UTF-8 |
| Menu não carrega | Verificar se `menu-loader.js` consegue fetch de `menu-content.html` |

---

## Problemas de Encoding

### Sintoma
Texto na interface aparece como:
- `est├í dispon├¡vel` (deveria ser `está disponível`)
- `1┬¬ mensalidade` (deveria ser `1ª mensalidade`)
- `a├º├úo` (deveria ser `ação`)

### Causa
Arquivos JS salvos com encoding incorreto (Windows-1252 em vez de UTF-8).

### Como verificar
```powershell
Select-String -Path "assets\js\*.js" -Pattern "├|┬" | Group-Object Path
```

### Como corrigir
```powershell
git checkout -- assets/js/modals-shared.js
```

### Prevenção
- Sempre salvar arquivos com encoding UTF-8
- Verificar antes de commitar: `Select-String -Path "assets\js\*.js" -Pattern "├|┬"`

---

## Notas Importantes

1. **Credenciais Firebase**: `functions/credentials.json` NUNCA deve ser commitado
2. **Cache**: Dados em cache por 5 minutos no servidor, mas localStorage pode precisar limpeza
3. **Período**: Atualmente 2026/2 - veio da API, não hardcoded
4. **Modelo Big Pickle**: Disponibilizado via OpenCode Zen (OpenRouter), não Ollama
5. **Modais**: Usar `window.pricesModal.open()` e NÃO `window.openPricesMenu()` (função não existe)
6. **Encoding**: Sempre salvar arquivos JS como UTF-8. Verificar com `Select-String -Pattern "├|┬"`
7. **Menu**: Carregado dinamicamente via `menu-loader.js` → `menu-content.html` → `menu.js`

---

## Regras do Agente

### ⚠️ IMPORTANTE: O/agente NÃO pode reiniciar/processar nada sozinho

O agente está rodando dentro de um processo persistence shell. **Qualquer comando que tente reiniciar esse processo vai fazer o agente PARAR de funcionar**.

#### É PROIBIDO executar:
- ❌ `Ctrl+C` ou equivalente
- ❌ Comandos que fecham o terminal/shell
- ❌ Qualquer comando queforce o restart do agente
- ❌kill` em processos do agente

#### O que fazer:
- ✅ Apenas responder perguntas
- ✅ Ler e editar arquivos
- ✅ Executar comandos de開発 (npm, git, curl, etc.)
- ✅ **SEMPRE pedir autorização antes de commitar ou fazer push**

#### Fluxo de trabalho:
1. Agente executa tarefas solicitadas pelo usuário
2. Ao final, **perguntar**: "Posso fazer o commit?"
3. **AGUARDAR** autorização explícita
4. Se autorizado → fazer commit
5. **SEMPRE perguntar** sobre push: "Posso fazer o push?"

#### Se o usuário pedir algo que reiniciaria o agente:
- Alertar que isso faria o agente parar
- Pedir confirmação explícita