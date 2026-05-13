Aqui está o AGENTS.md completo, com tudo que já estava mais as seções novas integradas no mesmo padrão:

text
# Portal Inscrições - Documentação do Agente

## ⚠️ REGRA FUNDAMENTAL: MANTER ESTE ARQUIVO ATUALIZADO

Sempre que qualquer uma das situações abaixo ocorrer, este arquivo **DEVE** ser atualizado
antes do commit:

- Nova rota de API criada ou modificada
- Novo componente de UI adicionado
- Novo fluxo de autenticação ou permissão implementado
- Nova variável de ambiente adicionada
- Bug relevante corrigido (adicionar em "Problemas Conhecidos")
- Novo modal ou padrão de interação criado
- Qualquer regra de negócio alterada

**O agente NÃO pode finalizar uma tarefa sem atualizar este arquivo se algo mudou.**

---

## Visão Geral do Projeto

Portal de Inscrições da FAMETRO para processos seletivos, cursos técnicos e vestibulares.

### Stack

- **Frontend**: HTML, JS vanilla, CSS
- **Backend API**: Node.js + Express
- **Dados**: Google Sheets via OpenSheet API
- **Autenticação**: Firebase Auth
- **Banco de dados**: Firebase Firestore
- **Deploy**: Render (2 serviços) + GitHub Pages
- **Ferramentas**: OpenCode com Big Pickle (OpenRouter)

---

## Estrutura de Arquivos
portal-inscricoes/
├── index.html # Página de login
├── portal.html # Portal de inscrições
├── links.html # Central de links
├── tickets.html # Sistema de tickets
├── diario.html # Diário de Bordo
├── login.html # Login admin
├── admin-links.html # Admin Gerenciar Links
├── admin-unidades.html # Admin CRUD Unidades (DESABILITADO temporarily)
├── admin-users.html # Admin Gerenciar Usuários (DESABILITADO temporarily)
├── menu-content.html # Menu carregado dinamicamente
├── server-api.js # API Express (raiz - usado no Render)
├── firestore.rules # Regras de segurança do Firestore
├── routes/
│ ├── processos.js
│ ├── unidades.js
│ ├── modalidades.js
│ ├── admin.js
│ ├── operadores.js
│ └── pos-graduacao.js
├── services/
│ ├── sheetsService.js
│ └── sheetsCrudService.js
├── assets/
│ ├── js/
│ │ ├── menu.js
│ │ ├── menu-loader.js
│ │ ├── modals-shared.js
│ │ ├── app.js
│ │ ├── links-page.js
│ │ ├── admin-links.js
│ │ ├── dark-mode.js
│ │ ├── api.js
│ │ └── pos-graduacao-modal.js
│ ├── css/
│ │ ├── styles.css
│ │ ├── admin-links.css
│ │ └── admin-unidades.css
│ └── data/
├── functions/
├── firebase.json
├── render.yaml
├── package.json
└── AGENTS.md

text

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
| GET | `/coordenadores` | Coordenadores por unidade |
| GET | `/operadores` | Operadores por unidade |
| GET | `/cursos-oferta` | Cursos ofertados |
| GET | `/precos-cursos` | Preços por turno |
| GET | `/cursos-tecnicos` | Cursos técnicos por unidade |
| POST | `/admin/:tabela` | Criar registro |
| PUT | `/admin/:tabela/:id` | Atualizar registro |
| DELETE | `/admin/:tabela/:id` | Deletar registro |

---

## Arquitetura Atual
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

text

---

## Sistema de Menu

### Carregamento Dinâmico

O menu lateral é carregado via `menu-loader.js` que faz fetch de `menu-content.html`
e injeta no `#menu-container`.

### Fluxo de Inicialização
menu-loader.js → fetch menu-content.html → injeta em #menu-container → dispara 'menu-loaded'
↓
menu.js → escuta 'menu-loaded' → inicializa eventos (toggle, submenus, temas)

text

### Modais do Menu

| Botão | data-action | Modal Aberto |
|-------|-------------|--------------|
| Pesquisar cursos | `open-global-search` | `window.globalModal.open()` |
| Pesquisar preços | `open-prices-menu` | `window.pricesModal.open()` |
| Cursos Técnicos | `open-cursos-tecnicos` | `window.cursosTecnicosModal.open()` |
| Setores | `open-setores` | `window.setoresModal.open()` |
| Coordenação | `open-coordenadores` | `window.coordenadoresModal.open()` |
| Pós-Graduação | `open-pos-graduacao` | `window.posGraduacaoModal.open()` |

**⚠️ IMPORTANTE:** Os modais são objetos expostos em `window`, **NÃO** funções diretas.
Sempre usar:
```js
if (window.pricesModal) window.pricesModal.open();
// NÃO: window.openPricesMenu() — NÃO EXISTE
```

---

## Sistema de Permissões de Usuários (Firebase)

### Estrutura do documento `/users/{userId}`
createdAt → timestamp
email → string
id_operador → int64
nome → string
tipo → string ← campo de controle de permissão

text

### Hierarquia do campo `tipo`

| Valor | Acesso |
|---|---|
| `"comum"` | Lê e edita apenas o próprio documento |
| `"admin"` | Lê todos os usuários, não pode alterar `tipo` |
| `"superadmin"` | Lê todos e pode alterar o campo `tipo` de qualquer usuário |

### Regras do Firestore (`firestore.rules`)
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {

function isAuthenticated() {
return request.auth != null;
}

function isSuperAdmin() {
return isAuthenticated() &&
get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo == 'superadmin';
}

function isAdmin() {
return isAuthenticated() &&
get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo in ['admin', 'superadmin'];
}

match /users/{userId} {
// Leitura: próprio doc ou admin/superadmin
allow read: if request.auth.uid == userId || isAdmin();

// Escrita de campos normais (sem alterar "tipo")
allow write: if request.auth.uid == userId
&& !('tipo' in request.resource.data);

// Alteração do campo "tipo" (promoção): somente superadmin
allow write: if isSuperAdmin();
}

match /counters/{document=**} {
allow read, write: if isAuthenticated();
}

match /tickets/{document=**} {
allow read, write: if isAuthenticated();
}
} }

text

**⚠️ NUNCA alterar o campo `tipo` via frontend sem verificar se o usuário logado
é `superadmin`. A regra do Firestore bloqueia no banco, mas a UI deve bloquear antes.**

---

## Padrão Visual e de Interface

### ⚠️ Regras Obrigatórias para o Agente

**NUNCA** aplicar estilos inline (`style=""`) em botões, badges ou qualquer elemento
de UI. Usar exclusivamente as classes CSS definidas abaixo.

### Botões — Classes Disponíveis

| Classe | Uso | Quando NÃO usar |
|---|---|---|
| `.btn.btn--accent` | Ação principal (salvar, confirmar) | Não duplicar em uma mesma tela |
| `.btn.btn--danger` | Ações destrutivas (excluir) | Não usar para cancelar |
| `.btn.btn--sm` | Ações em tabela ou lista | Não forçar tamanho via `style` |
| `.btn.btn--nav` | Navegação superior (`app-nav`) | Apenas no `app-nav` |
| `.btn.btn--block` | Formulários largura total | Apenas dentro de `<form>` |

```html
<!-- ✅ CORRETO -->
<button class="btn btn--accent">Salvar</button>
<button class="btn btn--danger btn--sm">Excluir</button>

<!-- ❌ ERRADO -->
<button style="background:#e74c3c; padding:4px 8px">Excluir</button>
```

### Badges de Tipo de Usuário

```html
<!-- ✅ CORRETO -->
<span class="badge badge--superadmin">superadmin</span>
<span class="badge badge--admin">admin</span>
<span class="badge badge--comum">comum</span>

<!-- ❌ ERRADO -->
<span style="color:gold; font-weight:bold">superadmin</span>
```

CSS (adicionar em `styles.css` se ainda não existir):

```css
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge--superadmin { background: var(--accent-color); color: #fff; }
.badge--admin      { background: var(--btn-secondary-bg, #444); color: #fff; }
.badge--comum      { background: var(--border-color, #ccc); color: var(--text-color); }
```

### Botões de Filtro/Tag (ex: abas de duração EAD)

Para evitar quebra de linha em textos longos dentro de botões de filtro:

```css
.pos-dur-btn,
.pos-tab-btn {
  white-space: nowrap;
  flex-shrink: 0;
}
```

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

### Proibições Gerais de Interface

- ❌ `style="color:..."` em qualquer elemento
- ❌ `style="width:..."` ou `style="height:..."` em botões
- ❌ Cores fora das variáveis CSS (`--accent-color`, `--text-color`, `--border-color`)
- ❌ `font-size` hardcoded — usar classes existentes
- ❌ Criar classe nova para algo que já tem classe definida acima
- ❌ Botões com `<div>` ou `<span>` no lugar de `<button>`

---

## Modais — Padrão de Implementação

### Overlay Close Pattern

Para evitar que modais fechem durante seleção de texto:

```js
let mousedownInside = false;
modal.addEventListener('mousedown', () => { mousedownInside = true; });
modal.addEventListener('mouseup', () => { mousedownInside = false; });
modal.addEventListener('click', (e) => {
  if (mousedownInside) return;
  if (e.target === modal) close();
});
```

### Expor modal no `window`

```js
window.nomeDoModal = { open, close };
// NÃO expor como função: window.abrirNomeDoModal = open  ← NÃO FAZER
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

---

## Deploy e CI/CD

### Render (Automático)

Push para `feature/sistema-tickets` → Render deploya automaticamente.

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

---

## Validação Obrigatória (Após Qualquer Modificação)

Após **QUALQUER** modificação, executar:

#### 1. Backend
- [ ] `GET /` → 200 OK
- [ ] `GET /processos?limit=1` → dados retornados
- [ ] `GET /unidades` → dados retornados
- [ ] `GET /modalidades` → dados retornados

#### 2. CRUD (se aplicável)
- [ ] `POST /admin/:tabela` → criar registro
- [ ] `PUT /admin/:tabela/:id` → atualizar registro
- [ ] `DELETE /admin/:tabela/:id` → deletar registro
- [ ] Cache invalidado corretamente

#### 3. Frontend
- [ ] Páginas carregam sem erro JS no console
- [ ] `window.PORTAL_LINKS` definido com dados
- [ ] Dados visíveis na interface

#### 4. Integração
- [ ] API → fetch → `window.PORTAL_LINKS` → renderização OK
- [ ] Erros de API logados claramente, sem quebrar silenciosamente

#### 5. Deploy
- [ ] Render sobe sem erro
- [ ] Endpoints em produção retornam 200

### Formato de Resposta Obrigatório
✔ Backend: (OK ou ERRO + detalhes)
✔ API endpoints: (status de cada rota)
✔ Frontend: (OK ou ERRO + o que está sendo exibido)
✔ Integração: (dados chegando? sim/não)
✔ Console: (erros encontrados)
✔ Produção (Render): (status real)

text

### Proibições

- ❌ Finalizar sem testes
- ❌ Assumir "deve estar funcionando"
- ❌ Ignorar 503, 500, undefined
- ❌ Deixar frontend sem dados visíveis

---

## Workflow de Commit e Push

1. Testar API local (`node server-api.js`)
2. Testar API produção
3. Verificar frontend sem erros no console
4. Verificar que `functions/credentials.json` **não** está no staging
5. **Atualizar este arquivo (AGENTS.md) se algo mudou**
6. Perguntar: "Posso fazer o commit?"
7. Aguardar autorização explícita
8. Após commit, perguntar: "Posso fazer o push?"

---

## Troubleshooting

### API retorna 503

1. Render gratuito dorme após 15 min de inatividade
2. Acessar o site para "acordar" o serviço
3. Verificar logs: `render logs <service-id>`

### PORTAL_LINKS vazio / Central de Links vazia

1. Verificar console (F12) por erros
2. Testar API: `Invoke-WebRequest https://portal-inscricoes.onrender.com/processos`
3. Limpar cache: `localStorage.clear()` no browser
4. Verificar logs:
   - `[links-data] ✅ Script carregado`
   - `[links-data] PORTAL_LINKS setado`
   - `[links-page] PORTAL_LINKS disponível`

### Erro de permissão no painel de usuários

- Verificar se o usuário logado tem `tipo == "superadmin"` ou `"admin"` no Firestore
- Confirmar que as regras em `firestore.rules` estão publicadas no Firebase Console

### Erro RangeError: Invalid language tag

```js
// ✅ CORRETO
String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR')
// ❌ ERRADO
a.code.localeCompare(a.code, 'pt-BR')  // primeiro argumento errado
```

### Valores `undefined` no modal EAD de Pós-Graduação

- Verificar se os campos `meses6`, `meses9`, `meses12`, `meses15`, `pont6`...`pont15`
  existem no objeto retornado pela API
- Confirmar que `buildCopyMsgEAD` usa template literals corretos (sem `\$` escapado)
- Confirmar que `pontMap` não tem backticks misturados nas chaves

### Botões de filtro com quebra de linha

Adicionar em `styles.css`:
```css
.pos-dur-btn, .pos-tab-btn { white-space: nowrap; flex-shrink: 0; }
```

### Acentos aparecem como `├í` `├ú`

Encoding corrompido. Restaurar com:
```powershell
git checkout -- assets/js/<arquivo>.js
```
Prevenção — verificar antes de commitar:
```powershell
Select-String -Path "assets\js\*.js" -Pattern "├|┬"
```

### Modal não abre

```js
// ✅ CORRETO
if (window.pricesModal) window.pricesModal.open();
// ❌ ERRADO
window.openPricesMenu()  // não existe
```

### Menu não carrega

Verificar se `menu-loader.js` consegue fazer fetch de `menu-content.html`.
Verificar se o evento `'menu-loaded'` está sendo disparado.

---

## Problemas Conhecidos e Soluções

| Problema | Solução |
|----------|--------|
| Central de Links vazia | Aguardar PORTAL_LINKS com loop de espera (5s max) |
| 404 em Pós-Graduação | Certificar que pos-graduacao.js está nas rotas e server reiniciado |
| pontualidade6 undefined | Usar pontualidade6 (API retorna nome longo) |
| Título duplicado | Cada página deve ter seu próprio <title> e H1 |
| Perfil sumindo em admin | Garantir que admin-users.js etc. tenham lógica de perfil |
| 503 após inatividade | Acessar site para acordar serviço |
| JSON local desatualizado | Removido — usar apenas API |
| Período 2026/1 aparecendo | Corrigido — usa `ln.periodo` da API |
| localeCompare error | `String(a.code\|\|'').localeCompare(...)` |
| Modal não abre | Usar `window.nomeModal.open()`, não funções diretas |
| Encoding corrompido | `git checkout -- <arquivo>` |
| Menu não carrega | Verificar fetch de `menu-content.html` |
| Permissão negada no painel admin | Verificar `tipo` do usuário no Firestore |
| `undefined` no EAD | Verificar campos `mesesX`/`pontX` na API |
| Botão "15 meses" deformado | `white-space: nowrap` em `.pos-dur-btn` |

---

## Notas Importantes

1. **Credenciais Firebase**: `functions/credentials.json` NUNCA commitado
2. **Cache**: 5 minutos no servidor; `localStorage.clear()` se necessário
3. **Período**: 2026/2 — vem da API, não hardcoded
4. **Modais**: sempre `window.nomeModal.open()` — nunca funções globais avulsas
5. **Encoding**: sempre salvar arquivos JS como UTF-8
6. **Menu**: carregado dinamicamente via `menu-loader.js` → `menu-content.html` → `menu.js`
7. **Permissões**: campo `tipo` no Firestore controla hierarquia (`comum` / `admin` / `superadmin`)
8. **Interface**: nunca usar `style=""` em botões ou badges — usar classes CSS

---

## Regras do Agente

### ⚠️ O agente NÃO pode reiniciar processos

#### Proibido:
- ❌ `Ctrl+C` ou equivalente
- ❌ Comandos que fecham o terminal
- ❌ `kill` em processos do agente

#### Permitido:
- ✅ Responder perguntas
- ✅ Ler e editar arquivos
- ✅ Executar comandos de desenvolvimento (npm, git, curl)
- ✅ Atualizar este arquivo sempre que algo mudar

#### Fluxo obrigatório:
1. Executar a tarefa
2. Atualizar `AGENTS.md` se algo mudou
3. Perguntar: "Posso fazer o commit?"
4. Aguardar autorização
5. Perguntar: "Posso fazer o push?"
6. Aguardar autorização