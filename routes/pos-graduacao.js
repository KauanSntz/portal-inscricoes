// routes/pos-graduacao.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const BASE_URL = process.env.OPENSHET_BASE_URL || 'https://opensheet.elk.sh/1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';

const cache = {
  semana: { data: null, timestamp: 0 },
  sabado: { data: null, timestamp: 0 },
  'ao-vivo': { data: null, timestamp: 0 },
  ead: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Normaliza valor monetário: "R$99,00" -> "R$ 99,00"
function normalizaMoeda(val) {
  if (!val) return '';
  return val.trim().replace(/^R\$\s*/, 'R$ ');
}

// Normaliza registro das abas semana/sabado/ao vivo
function normalizaRegistroSimples(r) {
  return {
    curso: (r['CURSO'] || '').trim(),
    duracao: (r['DURAÇÃO'] || '').trim(),
    primeiraMsg: normalizaMoeda(r['1° \nMENSALIDADE'] || r['1° MENSALIDADE'] || ''),
    valorIntegral: normalizaMoeda(r['VALOR DA MENSALIDADE INTEGRAL'] || ''),
    valorBolsa: normalizaMoeda(r[' MENSALIDADE COM DESCONTO 50%'] || r['MENSALIDADE COM DESCONTO 50%'] || ''),
    pontualidade: normalizaMoeda(r['10% DE PONTUALIDADE'] || ''),
  };
}

// Normaliza registro da aba EAD
function normalizaRegistroEAD(r) {
  return {
    curso: (r['EAD'] || '').trim(),
    taxaMatricula: normalizaMoeda(r['TAXA DE MATRÍCULA'] || ''),
    valorTotal: normalizaMoeda(r['VALOR TOTAL DO CURSO'] || ''),
    meses6: normalizaMoeda(r['  6 MESES     (SEM TCC)'] || r['6 MESES'] || ''),
    pontualidade6: normalizaMoeda(r['10% PONTUALIDADE 6 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses9: normalizaMoeda(r['9 MESES'] || ''),
    pontualidade9: normalizaMoeda(r['10% PONTUALIDADE 9 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses12: normalizaMoeda(r['12 MESES          \n(SEM TCC)'] || r['12 MESES'] || ''),
    pontualidade12: normalizaMoeda(r['10% PONTUALIDADE 12 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses15: normalizaMoeda(r['15 MESES'] || ''),
    pontualidade15: normalizaMoeda(r['10% PONTUALIDADE 15 MESES'] || r['10% PONTUALIDADE'] || ''),
  };
}

async function fetchAba(abaName, cacheKey) {
  const now = Date.now();
  if (cache[cacheKey] && cache[cacheKey].data && (now - cache[cacheKey].timestamp < CACHE_DURATION)) {
    return cache[cacheKey].data;
  }

  const url = `${BASE_URL}/${encodeURIComponent(abaName)}`;
  console.log(`[POS] Buscando dados de ${url}`);
  
  const response = await axios.get(url, { timeout: 10000 });
  if (response.status !== 200) {
    throw new Error(`Erro ao buscar aba ${abaName}: ${response.status}`);
  }
  
  cache[cacheKey] = { data: response.data, timestamp: now };
  return response.data;
}

// GET /pos-graduacao/semana
router.get('/semana', async (req, res) => {
  try {
    const raw = await fetchAba('pós semana', 'semana');
    const data = raw.filter(r => r['CURSO'] && r['CURSO'].trim()).map(normalizaRegistroSimples);
    res.json({ status: 'ok', modalidade: 'semana', data });
  } catch (e) {
    console.error('[POS] Erro semana:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /pos-graduacao/sabado
router.get('/sabado', async (req, res) => {
  try {
    const raw = await fetchAba('pós sabado', 'sabado');
    const data = raw.filter(r => r['CURSO'] && r['CURSO'].trim()).map(normalizaRegistroSimples);
    res.json({ status: 'ok', modalidade: 'sabado', data });
  } catch (e) {
    console.error('[POS] Erro sabado:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /pos-graduacao/ao-vivo
router.get('/ao-vivo', async (req, res) => {
  try {
    const raw = await fetchAba('pós ao vivo', 'ao-vivo');
    const data = raw.filter(r => r['CURSO'] && r['CURSO'].trim()).map(normalizaRegistroSimples);
    res.json({ status: 'ok', modalidade: 'ao-vivo', data });
  } catch (e) {
    console.error('[POS] Erro ao-vivo:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /pos-graduacao/ead
router.get('/ead', async (req, res) => {
  try {
    const raw = await fetchAba('pós EAD', 'ead');
    const data = raw.filter(r => r['EAD'] && r['EAD'].trim()).map(normalizaRegistroEAD);
    res.json({ status: 'ok', modalidade: 'ead', data });
  } catch (e) {
    console.error('[POS] Erro ead:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;
