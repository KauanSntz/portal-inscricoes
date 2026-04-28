/* assets/data/links-data.js */
(() => {
  "use strict";

  const API_URL = "https://portal-inscricoes.onrender.com";
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
      const uid = p.unidade_id;
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

  async function refreshFromAPI() {
    try {
      console.log("[links-data] Atualizando da API...");
      const response = await fetch(`${API_URL}/processos?limit=500`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const portalLinks = transformToPortalLinks(json.data || []);
      setCachedData(portalLinks);
      console.log(`[links-data] Cache atualizado (${json.data?.length || 0} processos)`);
    } catch (error) {
      console.warn("[links-data] Erro ao atualizar:", error);
    }
  }

  function init() {
    console.log("[links-data] ✅ Script carregado");
    const cached = getCachedData();
    console.log("[links-data] Cache encontrado:", !!cached);
    if (cached) {
      console.log("[links-data] Usando cache local:", cached.length, "unidades");
      window.PORTAL_LINKS = cached;
      console.log("[links-data] PORTAL_LINKS setado (cache)");
    } else {
      console.log("[links-data] Sem cache, tentando API...");
      fetch(`${API_URL}/processos?limit=500`)
        .then(r => {
          console.log("[links-data] Resposta API status:", r.status);
          return r.json();
        })
        .then(json => {
          console.log("[links-data] JSON recebido:", json);
          const portalLinks = transformToPortalLinks(json.data || []);
          console.log("[links-data] Transformado:", portalLinks.length, "unidades");
          setCachedData(portalLinks);
          window.PORTAL_LINKS = portalLinks;
          console.log(`[links-data] ✅ PORTAL_LINKS setado: ${portalLinks.length} unidades, ${portalLinks.reduce((acc, u) => acc + Object.values(u.blocks).reduce((a, b) => a + b.links.length, 0), 0)} links`);
          window.dispatchEvent(new Event('portal-links-loaded'));
        })
        .catch(err => {
          console.error("[links-data] ❌ Erro:", err);
          window.PORTAL_LINKS = [];
          window.dispatchEvent(new Event('portal-links-error'));
        });
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