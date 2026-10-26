/* assets/data/links-data.js */
(() => {
  "use strict";

  const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';
  const CACHE_KEY = "portal_links_cache";
  const CACHE_DURATION = 5 * 60 * 1000;

  // Unidades para tela inicial (capital + compensa)
  const UNIDADES_CAPITAL = ['sede', 'leste', 'norte', 'sul', 'oeste', 'compensa'];

  const MODALITY_MAP = {
    "PRESENCIAL": "presencial",
    "100% EAD": "ead",
    "EAD": "ead",
    "HÍBRIDO": "hibrido",
    "HIBRIDO": "hibrido",
    "SEMIPRESENCIAL": "semipresencial",
    "SEMIPRESENCIAL FLEX": "flex",
    "SEMI FLEX": "flex",
    "FLEX": "flex"
  };

  const makeLink = (code, type, modality, href, periodo) => ({ code, type, modality, href, periodo });

  function getCachedData() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    } catch (e) {}
    return null;
  }

  function setCachedData(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function getModalityBlock(modality) {
    const norm = (modality || "").toUpperCase().trim();
    return MODALITY_MAP[norm] || "ead";
  }

  function transformToPortalLinks(processos) {
    const unidadesMap = {};

    processos.forEach(p => {
      const uid = (p.unidade_id || "").toLowerCase();
      if (!unidadesMap[uid]) {
        unidadesMap[uid] = {
          key: uid,
          title: p.unidade_nome || uid.toUpperCase(),
          theme: uid,
          coursesKey: uid,
          blocks: {}
        };
      }

      const unidade = unidadesMap[uid];
      const blockKey = getModalityBlock(p.modalidade);

      if (!unidade.blocks[blockKey]) {
        const blockTitles = {
          presencial: "Presencial",
          hibrido: "Híbrido",
          flex: "Flex",
          semipresencial: "Semipresencial",
          ead: "100% EAD"
        };
        unidade.blocks[blockKey] = {
          title: blockTitles[blockKey] || p.modalidade,
          links: []
        };
      }

      const link = makeLink(p.codigo, p.tipo_ingresso, p.modalidade, p.link, p.periodo);
      unidade.blocks[blockKey].links.push(link);
    });

    const units = Object.values(unidadesMap);
    units.sort((a, b) => a.title.localeCompare(b.title));
    return units;
  }

  function filterByUnidades(units, unidadeIds) {
    if (!unidadeIds || unidadeIds.length === 0) return units;
    return units.filter(u => unidadeIds.includes(u.key));
  }

  // A planilha tem mais de 500 processos; o padrão da API é limit=10
  const PROCESSOS_URL = "/processos?limit=10000";

  async function refreshFromAPI() {
    try {
      console.log("[links-data] Atualizando da API...");
      const response = await portalFetch(PROCESSOS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const portalLinks = transformToPortalLinks(json.data || []);
      const mudou = JSON.stringify(portalLinks) !== JSON.stringify(window.PORTAL_LINKS);
      setCachedData(portalLinks);
      window.PORTAL_LINKS = portalLinks;
      console.log(`[links-data] ✅ PORTAL_LINKS setado: ${portalLinks.length} unidades, ${json.data?.length || 0} processos`);

      if (!window._portalLinksInitialLoaded) {
        // Primeira carga (sem cache): disparar evento de carregamento
        window._portalLinksInitialLoaded = true;
        window.dispatchEvent(new Event('portal-links-loaded'));
      } else if (mudou) {
        // A página já renderizou o cache: re-renderizar só se os dados mudaram
        window.dispatchEvent(new Event('portal-links-updated'));
      }
    } catch (error) {
      console.error("[links-data] ❌ Erro ao buscar processos:", error);
      if (!window._portalLinksInitialLoaded) {
        window.PORTAL_LINKS = [];
        window.dispatchEvent(new Event('portal-links-error'));
      }
    }
  }

  function init() {
    console.log("[links-data] ✅ Script carregado");
    const cached = getCachedData();
    if (cached && cached.length > 0) {
      console.log("[links-data] PORTAL_LINKS setado (cache):", cached.length, "unidades");
      window.PORTAL_LINKS = cached;
      window._portalLinksInitialLoaded = true;
    } else {
      console.log("[links-data] Sem cache, buscando na API...");
    }

    refreshFromAPI();
  }

  window.PortalLinks = {
    load: init,
    clearCache: () => localStorage.removeItem(CACHE_KEY),
    UNIDADES_CAPITAL: UNIDADES_CAPITAL,
    filter: filterByUnidades
  };

  init();
})();