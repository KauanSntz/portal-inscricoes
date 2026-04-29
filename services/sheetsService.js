const axios = require('axios');

// URLs base do OpenSheet (configuradas no .env)
const BASE_URL = process.env.OPENSHET_BASE_URL || 'https://opensheet.elk.sh/1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';
const URL_PROCESSOS = process.env.URL_PROCESSOS || 'processos_normalizados';
const URL_UNIDADES = process.env.URL_UNIDADES || 'unidades';
const URL_MODALIDADES = process.env.URL_MODALIDADES || 'modalidades';
const URL_COORDENADORES = process.env.URL_COORDENADORES || 'coordenadores';
const URL_SETORES_CONTATO = process.env.URL_SETORES_CONTATO || 'setores_contato';
const URL_CURSOS_TECNICOS = process.env.URL_CURSOS_TECNICOS || 'cursos_tecnicos';
const URL_DIARIO_BORDO = process.env.URL_DIARIO_BORDO || 'diario_bordo';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycby8b4xiDWKVYums7HLlBwLdep-cpgykKGT0sRlolQVJFvGGvcuZLQi3jItu9EKg0qXX6w/exec';
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION_MS) || 300000;

// Cache em memória
const cache = {
  processos: { data: null, timestamp: 0 },
  unidades: { data: null, timestamp: 0 },
  modalidades: { data: null, timestamp: 0 },
  coordenadores: { data: null, timestamp: 0 },
  setores_contato: { data: null, timestamp: 0 },
  cursos_tecnicos: { data: null, timestamp: 0 },
  diario_bordo: { data: null, timestamp: 0 }
};

function invalidateCache(cacheKey) {
  if (cache[cacheKey]) {
    cache[cacheKey] = { data: null, timestamp: 0 };
    console.log(`[CACHE] ${cacheKey} invalidado`);
  }
}

module.exports = {
  fetchWithCache,
  getProcessos,
  getUnidades,
  getModalidades,
  getCoordenadores,
  getSetoresContato,
  getCursosTecnicos,
  getProcessoByCodigo,
  getUnidadeById,
  invalidateCache
};

/**
 * Busca dados de uma URL com cache
 * @param {string} url - URL para buscar
 * @param {string} cacheKey - Chave do cache ('processos' | 'unidades' | 'modalidades')
 * @returns {Promise<Array>} Array de dados
 */
async function fetchWithCache(url, cacheKey) {
  const now = Date.now();
  const cached = cache[cacheKey];

  // Retorna dados em cache se ainda válidos
  if (cached.data && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`[CACHE] Dados ${cacheKey} retornados do cache`);
    return cached.data;
  }

  // Busca dados do OpenSheet
  console.log(`[REQUEST] Buscando dados de: ${url}`);
  const response = await axios.get(url, { timeout: 10000 });
  
  if (response.status !== 200) {
    throw new Error(`Falha ao buscar dados: статус ${response.status}`);
  }

  const data = response.data;
  
  // Atualiza cache
  cache[cacheKey] = { data, timestamp: now };
  console.log(`[CACHE] Dados ${cacheKey} atualizados (${data.length} registros)`);

  return data;
}

/**
 * Busca processos com join de unidades
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>} Processos com dados relacionados
 */
async function getProcessos(filtros = {}) {
  const url = `${BASE_URL}/${URL_PROCESSOS}`;
  const processos = await fetchWithCache(url, 'processos');
  
  const urlUnidades = `${BASE_URL}/${URL_UNIDADES}`;
  const unidades = await fetchWithCache(urlUnidades, 'unidades');
  
  // Cria mapa de unidades para join rápido
  const unidadesMap = {};
  unidades.forEach(u => {
    unidadesMap[u.unidade_id] = u;
  });

  // Aplica filtros e join
  let resultados = processos.map(p => ({
    ...p,
    unidade_nome: unidadesMap[p.unidade_id]?.nome || null
  }));

  // Filtros
  if (filtros.unidade_id) {
    resultados = resultados.filter(p => p.unidade_id === filtros.unidade_id);
  }
  if (filtros.modalidade) {
    resultados = resultados.filter(p => p.modalidade === filtros.modalidade);
  }
  if (filtros.periodo) {
    resultados = resultados.filter(p => p.periodo === filtros.periodo);
  }
  if (filtros.codigo) {
    resultados = resultados.filter(p => p.codigo === filtros.codigo);
  }

  return resultados;
}

/**
 * Busca unidades com filtro opcional
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>} Unidades filtradas
 */
async function getUnidades(filtros = {}) {
  const url = `${BASE_URL}/${URL_UNIDADES}`;
  let unidades = await fetchWithCache(url, 'unidades');

  // FILTRA: remover deletadas (deleted_at)
  unidades = unidades.filter(u => !u.deleted_at);

  if (filtros.tipo) {
    unidades = unidades.filter(u => u.tipo === filtros.tipo);
  }

  return unidades;
}

/**
 * Busca modalidades
 * @returns {Promise<Array>} Modalidades
 */
async function getModalidades() {
  const url = `${BASE_URL}/${URL_MODALIDADES}`;
  return fetchWithCache(url, 'modalidades');
}

/**
 * Busca coordenadores com JOIN de unidades
 * @param {Object} filtros - Filtros opcionais (unidade_id)
 * @returns {Promise<Array>} Coordenadores com unidade_nome
 */
async function getCoordenadores(filtros = {}) {
  const url = `${BASE_URL}/${URL_COORDENADORES}`;
  const coordenadores = await fetchWithCache(url, 'coordenadores');
  
  const urlUnidades = `${BASE_URL}/${URL_UNIDADES}`;
  const todasUnidades = await fetchWithCache(urlUnidades, 'unidades');
  const unidades = todasUnidades.filter(u => !u.deleted_at);
  
  const unidadesMap = {};
  unidades.forEach(u => {
    unidadesMap[u.unidade_id] = u;
  });
  
  let resultados = coordenadores.map(c => ({
    ...c,
    unidade_nome: unidadesMap[c.unidade_id]?.nome || null
  }));
  
  if (filtros.unidade_id) {
    resultados = resultados.filter(c => c.unidade_id === filtros.unidade_id);
  }
  
  return resultados;
}

/**
 * Busca contatos de setores
 * @returns {Promise<Array>} Setores com contatos
 */
async function getSetoresContato() {
  const url = `${BASE_URL}/${URL_SETORES_CONTATO}`;
  return fetchWithCache(url, 'setores_contato');
}

/**
 * Busca cursos técnicos com filtro opcional por unidade
 * @param {Object} filtros - Filtros opcionais (unidade - minúsculo sem acento)
 * @returns {Promise<Array>} Cursos técnicos filtrados
 */
async function getCursosTecnicos(filtros = {}) {
  const url = `${BASE_URL}/${URL_CURSOS_TECNICOS}`;
  let cursos = await fetchWithCache(url, 'cursos_tecnicos');

  if (filtros.unidade) {
    const normalizedFilter = filtros.unidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cursos = cursos.filter(c => {
      const normalizedUnidade = (c.unidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedUnidade.includes(normalizedFilter);
    });
  }

  return cursos;
}

/**
 * Busca um processo pelo código
 * @param {string} codigo - Código do processo
 * @returns {Promise<Object|null>} Processo encontrado ou null
 */
async function getProcessoByCodigo(codigo) {
  const processos = await getProcessos();
  return processos.find(p => p.codigo === codigo) || null;
}

/**
 * Busca uma unidade pelo ID
 * @param {string} unidade_id - ID da unidade
 * @returns {Promise<Object|null>} Unidade encontrada ou null
 */
async function getUnidadeById(unidade_id) {
  const url = `${BASE_URL}/${URL_UNIDADES}`;
  const unidades = await fetchWithCache(url, 'unidades');
  const unidade = unidades.find(u => u.unidade_id === unidade_id);
  if (unidade && unidade.deleted_at) return null;
  return unidade || null;
}

/**
 * Força刷新 do cache
 */
function invalidateCache() {
  cache.processos = { data: null, timestamp: 0 };
  cache.unidades = { data: null, timestamp: 0 };
  cache.modalidades = { data: null, timestamp: 0 };
  cache.coordenadores = { data: null, timestamp: 0 };
  cache.setores_contato = { data: null, timestamp: 0 };
  cache.cursos_tecnicos = { data: null, timestamp: 0 };
  cache.diario_bordo = { data: null, timestamp: 0 };
  console.log('[CACHE] Cache invalidado');
}

/**
 * Busca registros do diário de bordo
 * @param {Object} filtros - Filtros opcionais (operador, data, cpf)
 * @returns {Promise<Array>} Registros do diário
 */
async function getDiarioBordo(filtros = {}) {
  const url = `${BASE_URL}/${URL_DIARIO_BORDO}`;
  let registros = await fetchWithCache(url, 'diario_bordo');

  if (filtros.operador) {
    registros = registros.filter(r => String(r.ID_OPERADOR) === String(filtros.operador));
  }
  if (filtros.data) {
    registros = registros.filter(r => r.DATA_INSCRICAO === filtros.data);
  }
  if (filtros.cpf) {
    registros = registros.filter(r => (r.CPF || '').includes(filtros.cpf));
  }
  if (filtros.nome) {
    const termo = filtros.nome.toLowerCase();
    registros = registros.filter(r => (r.NOME || '').toLowerCase().includes(termo));
  }

  return registros;
}

/**
 * Salva um registro no diário de bordo via Google Apps Script
 * @param {Object} registro - Dados do registro
 * @returns {Promise<Object>} Resposta do Apps Script
 */
async function salvarDiarioBordo(registro) {
  const response = await axios.post(APPS_SCRIPT_URL, registro, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    maxRedirects: 5
  });
  // Invalidar cache do diário após salvar
  cache.diario_bordo = { data: null, timestamp: 0 };
  return response.data;
}

module.exports = {
  getProcessos,
  getUnidades,
  getModalidades,
  getCoordenadores,
  getSetoresContato,
  getCursosTecnicos,
  getProcessoByCodigo,
  getUnidadeById,
  getDiarioBordo,
  salvarDiarioBordo,
  invalidateCache
};