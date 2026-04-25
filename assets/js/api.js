/* assets/js/api.js */
(() => {
  "use strict";

  const API_URL = "https://portal-inscricoes.onrender.com";
  const CACHE_KEY = "portal_links_cache";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

  const makeLink = (code, type, modality, href) => ({
    code,
    type,
    modality,
    href
  });

  function getCachedData() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    } catch (e) {
      console.warn("[API] Cache inválido:", e);
    }
    return null;
  }

  function setCachedData(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn("[API] Erro ao salvar cache:", e);
    }
  }

  async function fetchFromAPI() {
    const response = await fetch(`${API_URL}/processos?limit=500`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.data || [];
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
          semipresencial: "Semipresencial",
          flex: "Semipresencial Flex",
          ead: "EAD (100% Online)"
        };
        unidade.blocks[blockKey] = {
          title: blockTitles[blockKey] || p.modalidade,
          links: []
        };
      }

      const link = makeLink(
        p.codigo,
        p.tipo_ingresso,
        p.modalidade,
        p.link
      );
      unidade.blocks[blockKey].links.push(link);
    });

    const units = Object.values(unidadesMap);
    units.sort((a, b) => a.title.localeCompare(b.title));

    return units;
  }

  window.PortalAPI = {
    async load(forceRefresh = false) {
      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached) {
          console.log("[API] Usando cache local");
          window.PORTAL_LINKS = cached;
          return cached;
        }
      }

      try {
        console.log("[API] Buscando da API...");
        const processos = await fetchFromAPI();
        const portalLinks = transformToPortalLinks(processos);

        setCachedData(portalLinks);
        console.log(`[API] Carregados ${processos.length} processos de ${portalLinks.length} unidades`);

        window.PORTAL_LINKS = portalLinks;
        return portalLinks;
      } catch (error) {
        console.error("[API] Erro ao buscar API:", error);

        const cached = getCachedData();
        if (cached) {
          console.log("[API] Usando cache após erro");
          window.PORTAL_LINKS = cached;
          return cached;
        }

        console.warn("[API] Sem cache disponível, os dados podem não carregar");
        return null;
      }
    },

    clearCache() {
      localStorage.removeItem(CACHE_KEY);
      console.log("[API] Cache limpo");
    },

    getAPIUrl() {
      return API_URL;
    }
  };

  console.log("[API] Helper carregado. Use window.PortalAPI.load() para buscar dados.");
})();