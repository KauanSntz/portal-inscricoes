// assets/data/course_prices_2026_1_data.js — VERSÃO API
(() => {
  "use strict";

  // ---------- Fetch API ----------
  const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';

  const loadPrices = async () => {
    try {
      console.log('[course-prices] Carregando preços da API...');
      const response = await fetch(`${API_URL}/precos-cursos`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const rows = json.data || json;

      // Reconstruir o formato esperado pelo frontend (window.COURSE_PRICES_2026_1)
      const records = rows.map(r => ({
        unitKey: r.unidade_id || '',
        modalityKey: r.modalidade || '',
        planKey: r.plano || '',
        courseId: r.curso_id || '',
        courseName: r.curso_nome || '',
        integralCents: parseInt(r.integral_centavos) || 0,
        bolsaCents: parseInt(r.bolsa_centavos) || 0,
        bolsaPontualidadeCents: {
          p10: r.bolsa_p10_centavos ? parseInt(r.bolsa_p10_centavos) : null,
          p15: r.bolsa_p15_centavos ? parseInt(r.bolsa_p15_centavos) : null,
        },
        ...(r.observacao ? { meta: { note: r.observacao } } : {})
      }));

      window.COURSE_PRICES_2026_1 = {
        schemaVersion: 1,
        currency: "BRL",
        units: {
          manaus: { label: "Manaus" },
          compensa: { label: "Compensa" },
          para: { label: "Pará" },
          polos_proprios: { label: "Polos Próprios" },
          __all__: { label: "Tabela Geral" }
        },
        modalities: {
          presencial: { label: "Presencial" },
          hibrido: { label: "Híbrido" },
          semipresencial: { label: "Semipresencial" },
          ead: { label: "EAD" }
        },
        plans: {
          enem_vestibular: { label: "ENEM/Vestibular" },
          transfer_portador: { label: "Portador/Transferência" }
        },
        records
      };

      console.log(`[course-prices] ✅ ${records.length} registros de preços carregados da API`);
      window.dispatchEvent(new Event('prices-loaded'));
    } catch (error) {
      console.error('[course-prices] ❌ Erro ao carregar preços:', error);
      // Fallback: objeto vazio para não quebrar o modal
      window.COURSE_PRICES_2026_1 = {
        schemaVersion: 1,
        currency: "BRL",
        units: {},
        modalities: {},
        plans: {},
        records: []
      };
    }
  };

  loadPrices();
})();