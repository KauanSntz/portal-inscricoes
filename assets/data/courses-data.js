/* assets/data/courses-data.js — VERSÃO API */
(() => {
  "use strict";

  // ---------- Helpers ----------
  const normalizeKey = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  const toId = (canonicalName) =>
    normalizeKey(canonicalName)
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");

  const uniq = (arr) => Array.from(new Set(arr));

  // Canonical map: variações -> nome canônico
  const CANON = (() => {
    const map = new Map();
    const set = (raw, canonical) => map.set(normalizeKey(raw), canonical);

    set("Análise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");
    set("Analise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");
    set("Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");
    set("Logística", "Tecnologia em Logística");
    set("Tecnologia em Logística", "Tecnologia em Logística");
    set("Marketing", "Tecnologia em Marketing");
    set("Tecnologia em Marketing", "Tecnologia em Marketing");
    set("Gestão da Qualidade", "Tecnologia em Gestão da Qualidade");
    set("Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Qualidade");
    set("Gestão de Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");
    set("Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");
    set("Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");
    set("Radiologia", "Tecnologia em Radiologia");
    set("Tecnologia em Radiologia", "Tecnologia em Radiologia");
    set("Segurança no Trabalho", "Tecnologia em Segurança no Trabalho");
    set("Tecnologia em Segurança no Trabalho", "Tecnologia em Segurança no Trabalho");
    set("Design Gráfico", "Tecnologia em Design Gráfico");
    set("Tecnologia em Design Gráfico", "Tecnologia em Design Gráfico");
    set("Estética e Cosmética", "Tecnologia em Estética e Cosmética");
    set("Tecnologia em Estética e Cosmética", "Tecnologia em Estética e Cosmética");
    set("Gastronomia", "Tecnologia em Gastronomia");
    set("Tecnologia em Gastronomia", "Tecnologia em Gastronomia");
    set("Fullstack", "Tecnologia em Desenvolvimento Full Stack");
    set("Tecnologia em Desenvolvimento Full Stack", "Tecnologia em Desenvolvimento Full Stack");
    set("Big Data e Inteligência Analítica", "Tecnologia em Big Data e Inteligência Analítica");
    set("Tecnologia em Big Data e Inteligência Analítica", "Tecnologia em Big Data e Inteligência Analítica");
    set("Ciências de Dados", "Tecnologia em Ciência de Dados");
    set("Tecnologia em Ciência de Dados", "Tecnologia em Ciência de Dados");
    set("Inteligência Artificial", "Tecnologia em Inteligência Artificial");
    set("Tecnologia em Inteligência Artificial", "Tecnologia em Inteligência Artificial");
    set("Internet das Coisas (IoT)", "Tecnologia em Internet das Coisas (IoT)");
    set("Tecnologia em Internet das Coisas (IoT)", "Tecnologia em Internet das Coisas (IoT)");
    set("Jogos Digitais", "Tecnologia em Jogos Digitais");
    set("Tecnologia em Jogos Digitais", "Tecnologia em Jogos Digitais");
    set("Gestão da Segurança e Defesa Cibernética", "Tecnologia em Gestão da Segurança e Defesa Cibernética");
    set("Tecnologia em Gestão da Segurança e Defesa Cibernética", "Tecnologia em Gestão da Segurança e Defesa Cibernética");
    set("Gestão de Serviços Jurídicos e Notariais", "Tecnologia em Gestão de Serviços Jurídicos e Notariais");
    set("Tecnologia em Gestão de Serviços Jurídicos e Notariais", "Tecnologia em Gestão de Serviços Jurídicos e Notariais");
    set("Redes de Computadores", "Redes de Computadores");
    set("Rede de Computadores", "Redes de Computadores");
    set("Engenharia Ambiental", "Engenharia Ambiental e Energias Renováveis");
    set("Engenharia Ambiental e Energias Renováveis", "Engenharia Ambiental e Energias Renováveis");
    return map;
  })();

  const canonicalizeName = (rawName) => {
    const key = normalizeKey(rawName);
    if (!key) return "";
    return CANON.get(key) || String(rawName).trim();
  };

  // ---------- Build from API data ----------
  const buildFromApiData = (apiRows) => {
    const catalog = Object.create(null);
    const offersMap = Object.create(null);

    const ensureCourse = (rawName) => {
      const name = canonicalizeName(rawName);
      const id = toId(name);
      if (!catalog[id]) {
        catalog[id] = {
          id,
          name,
          degree: name.toLowerCase().startsWith("tecnologia em ") ? "tecnologo" : "nao_definido",
        };
      }
      return id;
    };

    for (const row of apiRows) {
      const unitKey = row.unidade_id;
      const modalityKey = row.modalidade;
      const courseId = ensureCourse(row.curso);
      const turno = row.turno || '';

      offersMap[unitKey] ||= Object.create(null);
      offersMap[unitKey][modalityKey] ||= Object.create(null);
      const slot = offersMap[unitKey][modalityKey];

      if (!slot[courseId]) slot[courseId] = { id: courseId, turnos: [] };
      if (turno && !slot[courseId].turnos.includes(turno)) {
        slot[courseId].turnos.push(turno);
      }
    }

    // Transform maps -> arrays sorted alphabetically
    const offers = Object.create(null);
    for (const [unitKey, unitObj] of Object.entries(offersMap)) {
      offers[unitKey] = Object.create(null);
      for (const [modalityKey, map] of Object.entries(unitObj)) {
        const arr = Object.values(map)
          .map((x) => ({ id: x.id, turnos: uniq(x.turnos) }))
          .sort((a, b) => catalog[a.id].name.localeCompare(catalog[b.id].name, "pt-BR"));
        offers[unitKey][modalityKey] = arr;
      }
    }

    return { catalog, offers, canonicalizeName, toId };
  };

  // ---------- Load from API ----------
  const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';

  const loadCourses = async () => {
    try {
      console.log('[courses-data] Carregando cursos da API...');
      const response = await fetch(`${API_URL}/cursos-oferta`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const data = json.data || json;
      window.COURSES = buildFromApiData(data);
      console.log(`[courses-data] ✅ ${data.length} registros carregados da API`);
      window.dispatchEvent(new Event('courses-loaded'));
    } catch (error) {
      console.error('[courses-data] ❌ Erro ao carregar da API:', error);
      // window.COURSES ficará undefined, modais mostrarão mensagem de erro
    }
  };

  // Iniciar carregamento
  loadCourses();
})();
