# Análise Técnica do Código: Portal de Inscrições 💻

Abaixo está o detalhamento técnico profundo de cada arquivo principal do projeto. Separamos as partes essenciais de código e explicamos a lógica linha por linha para você entender como as peças se conectam.

---

## 1. O Ponto de Entrada: `index.html`

O `index.html` atua como a barreira de segurança inicial. Ele força o usuário a se autenticar via Firebase antes de acessar o portal.

### 🔑 Lógica Principal: Autenticação e Redirecionamento
```html
<script>
  // 1. O Firebase avisa sempre que o status de login muda
  auth.onAuthStateChanged(user => {
    // 2. Se o usuário estiver logado e não estivermos no meio de um registro
    if (user && !isRedirecting) {
      console.log('Usuário já logado, redirecionando para portal.html');
      // 3. Joga o usuário direto pro portal principal
      window.location.href = './portal.html';
    }
  });
</script>
```
**Como funciona:** O Firebase guarda a sessão no navegador (graças ao `auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)`). Quando você abre a página, o `onAuthStateChanged` verifica: "Esse cara já tem um token válido?". Se sim, ele nem deixa a tela de login aparecer direito e te manda pro `portal.html`.

### 🛡️ Lógica de Registro (Auto-Incremento de ID)
No mesmo arquivo, quando alguém se registra, além de criar o usuário no Firebase Auth, precisamos dar um `id_operador` único para ele, simulando um banco de dados tradicional.
```javascript
// Gerar id_operador auto-incrementado via transação do Firestore
const contadorRef = db.collection('counters').doc('id_operador');
const novoIdOperador = await db.runTransaction(async (transaction) => {
  const contadorDoc = await transaction.get(contadorRef);
  let proximoId = 1;
  if (contadorDoc.exists) {
    proximoId = (contadorDoc.data().current || 0) + 1; // Soma +1 ao ID atual
  }
  transaction.set(contadorRef, { current: proximoId });
  return proximoId;
});
```
**Como funciona:** Como o Firebase não tem "Auto Increment" igual ao MySQL, usamos uma *Transação*. Ele lê o documento `counters`, pega o número atual (ex: 45), trava o banco para ninguém mais pegar o mesmo número ao mesmo tempo, salva o 46, e devolve o 46 para ser o ID do usuário recém-criado.

---

## 2. O Coração do Backend: `services/sheetsService.js`

Este é o arquivo mais importante do servidor Node.js. Ele se conecta à API não-oficial OpenSheet para extrair dados da planilha do Google.

### 🧠 A Engrenagem de Cache (`fetchWithCache`)
```javascript
// Variável na memória do servidor que guarda os dados
const cache = {
  processos: { data: null, timestamp: 0 },
  unidades: { data: null, timestamp: 0 },
  // ...
};

async function fetchWithCache(url, cacheKey) {
  const now = Date.now();
  const cached = cache[cacheKey];

  // 1. Se tem dados e passaram menos de 5 minutos (CACHE_DURATION = 300000ms)
  if (cached.data && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data; // Retorna da memória, sem ir na internet
  }

  // 2. Se não tem ou expirou, vai na API buscar
  const response = await axios.get(url, { timeout: 10000 });
  const data = response.data;
  
  // 3. Atualiza o cache com a hora exata que pegou os dados
  cache[cacheKey] = { data, timestamp: now };
  return data;
}
```
**Como funciona:** O Google Sheets bloqueia sites que fazem muitas requisições por segundo. O Cache resolve isso. Na primeira vez, o servidor espera o Google responder. Na segunda, terceira e milésima vez, ele só olha para a própria memória (`cache.processos.data`) e devolve instantaneamente.

### 🔗 O Cruzamento de Dados (JOIN de Processos e Unidades)
```javascript
async function getProcessos(filtros = {}) {
  // Pega todos os cursos e todas as unidades do cache
  const processos = await fetchWithCache(url, 'processos');
  const unidades = await fetchWithCache(urlUnidades, 'unidades');
  
  // Cria um "dicionário" rápido de unidades
  const unidadesMap = {};
  unidades.forEach(u => { unidadesMap[u.unidade_id] = u; });

  // Pega cada curso e "gruda" o nome da unidade correspondente nele
  let resultados = processos.map(p => ({
    ...p,
    unidade_nome: unidadesMap[p.unidade_id]?.nome || null
  }));

  // ... (aplica os filtros do usuário)
  return resultados;
}
```
**Como funciona:** Na planilha de processos só tem `unidade_id = "SEDE"`. O frontend precisa escrever "Sede (Manaus)". Essa função pega as duas planilhas, mapeia os IDs, e devolve um objeto gordo já prontinho pra tela exibir.

---

## 3. As Portas do Backend: `/routes/`

Os arquivos na pasta `routes/` (ex: `processos.js`, `diario.js`) são as portas que o frontend chama.

### 🌐 Rota GET `/processos`
```javascript
// routes/processos.js
router.get('/', async (req, res) => {
  // Pega o que o usuário quer da URL (ex: ?limit=10&modalidade=EAD)
  const { unidade_id, modalidade, periodo, limit = 10, offset = 0 } = req.query;

  // Monta os filtros
  const filtros = { unidade_id, modalidade, periodo };
  
  // Remove filtros que o usuário não mandou
  Object.keys(filtros).forEach(key => {
    if (filtros[key] === undefined) delete filtros[key];
  });

  // Chama o SheetsService passando os filtros
  const processos = await sheetsService.getProcessos(filtros);
  
  // Recorta (Paginação) e envia pro navegador
  const data = processos.slice(offset, offset + limit);
  res.json({ total: processos.length, limit, data });
});
```
**Como funciona:** Express Route típica. Ela traduz a URL em variáveis, limpa o lixo, e manda para o serviço.

### 📝 Rota POST `/diario`
```javascript
// routes/diario.js
router.post('/', async (req, res) => {
  const { id_operador, nome, cpf /* ... */ } = req.body;

  // Obriga ter nome e cpf
  if (!nome || !cpf) return res.status(400).json({ error: 'Faltam dados' });

  // Dispara pro Google Apps Script (que escreve na planilha lá no Google)
  const resultado = await salvarDiarioBordo({ ...req.body });
  res.json(resultado);
});
```
**Como funciona:** Em vez de *ler*, aqui nós *escrevemos*. O `salvarDiarioBordo` manda um POST para um webhook (`APPS_SCRIPT_URL`), que é um códigozinho dentro do Google Sheets que insere uma linha nova na tabela.

---

## 4. O Cérebro do Frontend: `assets/js/api.js`

Este arquivo é quem conecta a ponte entre a tela do usuário e o seu servidor Node.

### 🚚 O Caminhão de Dados (`PortalAPI.load`)
```javascript
// Transformar o JSON simples em uma árvore dividida por Unidades e Modalidades
function transformToPortalLinks(processos) {
  const unidadesMap = {};

  processos.forEach(p => {
    const uid = p.unidade_id;
    // Se a unidade ainda não existe no nosso mapeamento, cria ela
    if (!unidadesMap[uid]) {
      unidadesMap[uid] = { key: uid, title: p.unidade_nome, blocks: {} };
    }

    // Acha se é EAD, presencial, etc...
    const blockKey = getModalityBlock(p.modalidade);
    // Cria a modalidade dentro da unidade se não existir
    if (!unidadesMap[uid].blocks[blockKey]) {
      unidadesMap[uid].blocks[blockKey] = { title: "...", links: [] };
    }

    // Insere o link na modalidade certa
    unidadesMap[uid].blocks[blockKey].links.push(makeLink(p.codigo, p.tipo_ingresso, p.modalidade, p.link));
  });

  return Object.values(unidadesMap); // Retorna uma lista limpa
}
```
**Como funciona:** A API entrega uma lista reta de 500 cursos. Se você colocar isso na tela, fica horrível. O `transformToPortalLinks` agrupa os dados: `Unidade Sede -> EAD -> Curso X`. No final, joga isso na variável mágica `window.PORTAL_LINKS` para os outros scripts usarem.

---

## 5. A Interface do Usuário: `assets/js/app.js`

Este arquivo cuida apenas da página `portal.html`. Ele pega o agrupamento feito pelo `api.js` e desenha as caixinhas na tela.

### 🎨 Renderizando os Cartões (A UI principal)
```javascript
const renderUnit = (unit) => {
  // 1. Cria a caixa (<section>) HTML do zero usando JavaScript
  const card = el("section", { class: `unit ${unit.key}` });
  applyUnitTheme(card, unit.key); // Muda a cor (ex: Azul pra Sede, Verde pra Norte)

  // 2. Coloca o título
  const head = el("div", { class: "unit-head" }, [
    el("h2", { class: "unit-title", text: unit.title }),
    el("button", { class: "btn btn-courses", "data-action": "open-courses" }, [el("span", { text: "Pesquisar cursos" })])
  ]);
  card.appendChild(head);

  // 3. Renderiza os bloquinhos de Presencial/EAD
  CONFIG.LINK_BLOCKS_ORDER.forEach(blk => {
    const blockData = unit.blocks?.[blk.key] || { title: blk.label, links: [] };
    card.appendChild(renderLinkBlock(blockData, blk.label));
  });

  return card;
};
```
**Como funciona:** Ele cria o HTML "na mão" (manipulação de DOM). A função `el` é uma ajudante que cria a tag (ex: `<section>`), aplica a classe e o texto. Isso é mais rápido que usar templates HTML tradicionais para grandes listas.

### 🔍 A Lógica do Modal de Pesquisa (`unitModal.updateCoursesView`)
```javascript
const updateCoursesView = () => {
  // Filtra a lista com base no que o usuário digitou no campo de busca (state.query)
  const q = norm(state.query);
  const filtered = state.list.filter(item => {
    // Busca o nome legível do curso
    const name = courses.catalog?.[item.id]?.name || item.id;
    // Se digitou algo e o nome não bate, esconde o curso (return false)
    if (q && !norm(name).includes(q)) return false;
    // Se selecionou um Turno (ex: Matutino) e não bate, esconde
    if (["presencial", "hibrido"].includes(state.tab) && state.turno !== "Todos") return (item.turnos || []).includes(state.turno);
    return true;
  });

  // Desenha os cursos na tela depois de filtrar
  gridEl.textContent = ""; // Limpa a grade
  filtered.forEach(item => {
    // ... cria o <div> do curso e joga na grade
  });
};
```
**Como funciona:** Sempre que o usuário aperta uma tecla no campo de pesquisa, essa função é ativada. Ela varre todos os cursos, remove os acentos e maiúsculas (função `norm()`) para comparar, e redesenha a tela só com o que sobrou.

---

## 6. O Sistema de Níveis: `portal.html` (Script Firebase)

A lógica de permissões (RBAC) fica solta dentro da tag `<script>` no final do `portal.html` e nos arquivos de gestão (como `tickets.html`).

### 👮 Controle de Acesso e Badges
```javascript
// Quando pega os dados do usuário, ele checa o "tipo"
if (doc.exists) {
  currentUser = { uid: user.uid, ...doc.data() }; // Pode ser comum, admin, ou super_admin
}

// ...
async function atualizarBadges() {
  // Consultas diferentes baseadas no cargo do usuário
  let queryAbertos = db.collection('tickets').where('status', '==', 'aberto');

  if (currentUser.tipo === 'comum') {
    // Aluno comum SÓ VÊ os tickets dele
    queryAbertos = queryAbertos.where('criadoPor', '==', currentUser.uid);
  } else if (currentUser.tipo === 'admin') {
    // Admin vê os tickets de todos, MENOS os superTickets (diretoria)
    queryAbertos = queryAbertos.where('superTicket', '==', false);
  }

  // Faz a contagem e coloca a "bolinha vermelha" de notificação no menu
  const snapAbertos = await queryAbertos.get();
  badgeAbertos.textContent = snapAbertos.size;
}
```
**Como funciona:** O Firebase Firestore possui um sistema poderoso de *Queries* (buscas). Dependendo do papel (`tipo`) do usuário guardado no banco de dados, o JavaScript do frontend muda a busca, trazendo menos ou mais coisas. Isso impede que um operador comum acesse pedidos de mudança financeira, por exemplo.

---

## Resumo das Escolhas de Engenharia 📌

1. **Frontend "Vanilla":** Não usar React ou Vue foi uma escolha para garantir que o projeto fosse extremamente leve, carregasse rápido, e pudesse rodar diretamente no GitHub Pages sem processos de build complexos (Webpack, Vite). O `app.js` compensa a falta de um framework reconstruindo o DOM diretamente.
2. **Separação de Preocupações:** O banco de dados real é pesado (Sheets), então usar o Express como "Middleman" (Meio-campo) protege a planilha e entrega só os JSONs leves que o frontend precisa, além do sistema de *Cache* prevenir travamentos.
3. **Escalabilidade com Firebase:** Ao deixar a Autenticação e os Tickets no Firebase (e não no Sheets/Express), o sistema ganha a possibilidade de ter tempo-real (mensagens chegando na hora) sem derreter o servidor Node.js.
