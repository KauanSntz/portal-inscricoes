// assets/js/modals-shared.js
(() => {
  "use strict";

  // -----------------------------
  // Config
  // -----------------------------
  const COURSE_TABS = [
    { key: "presencial", label: "Presencial" },
    { key: "hibrido", label: "Híbrido" },
    { key: "semipresencial", label: "Semipresencial" },
    { key: "ead", label: "EAD" },
  ];

  const GLOBAL_LIMIT = 20;

  const PRICE_UNIT_OPTIONS = Object.freeze([
    { key: "manaus", label: "Manaus" },
    { key: "compensa", label: "Compensa" },
    { key: "para", label: "Pará" },
    { key: "polos_proprios", label: "Polos Próprios" },
  ]);

  const PRICE_MODALITY_OPTIONS = Object.freeze([
    { key: "presencial", label: "Presencial" },
    { key: "semipresencial", label: "Semipresencial" },
    { key: "ead", label: "EAD" },
    { key: "hibrido", label: "Híbrido" },
  ]);

  const API_URL = window.API_URL || '';
  const isApiResponse = (data) => data && typeof data === 'object' && 'data' in data;
  const extractData = (response) => isApiResponse(response) ? response.data : response;

  const loadApiData = async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const json = await response.json();
      return extractData(json);
    } catch (error) {
      console.error(`Erro ao carregar ${endpoint}:`, error);
      return [];
    }
  };

  const PRICE_PLAN_OPTIONS = Object.freeze([
    { key: "enem_vestibular", label: "ENEM/Vestibular" },
    { key: "transfer_portador", label: "Portador/Transferência" },
  ]);

  const PRICE_UNIT_BY_PORTAL = Object.freeze({
    sede: "manaus",
    compensa: "compensa",
    oeste: "compensa",
    leste: "para",
    sul: "para",
    norte: "polos_proprios",
  });

  // -----------------------------
  // Utils (expostas globalmente)
  // -----------------------------
  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const debounce = (fn, ms = 150) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  };

  const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatCents = (cents) => moneyFmt.format((Number(cents) || 0) / 100);

  const resolvePriceUnitKey = (portalUnitKey) => PRICE_UNIT_BY_PORTAL[norm(portalUnitKey)] || "manaus";

  const applyUnitTheme = (containerEl, unitKey) => {
    if (!containerEl) return;
    containerEl.classList.remove('theme-sede', 'theme-leste', 'theme-sul', 'theme-norte', 'theme-oeste', 'theme-blue', 'theme-red');
    if (unitKey) {
      const themeClass = `theme-${unitKey}`;
      containerEl.classList.add(themeClass);
    } else {
      containerEl.classList.add('theme-sede');
    }
  };

  // Expõe utilitários globalmente
  window.norm = norm;
  window.debounce = debounce;
  window.applyUnitTheme = applyUnitTheme;

  // -----------------------------
  // Scroll lock
  // -----------------------------
  const scrollLock = (() => {
    let locks = 0;
    let scrollY = 0;
    const lock = () => {
      locks += 1;
      if (locks > 1) return;
      scrollY = window.scrollY || 0;
      document.body.classList.add("modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };
    const unlock = () => {
      if (locks === 0) return;
      locks -= 1;
      if (locks > 0) return;
      document.body.classList.remove("modal-open");
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      const y = Math.abs(parseInt(top || "0", 10)) || scrollY;
      window.scrollTo(0, y);
    };
    return { lock, unlock };
  })();

  // -----------------------------
  // Prices data loader
  // -----------------------------
  let pricesDataPromise = null;
  const loadPricesOnce = async () => {
    if (!pricesDataPromise) {
      pricesDataPromise = Promise.resolve().then(() => {
        const payload = window.COURSE_PRICES_2026_1;
        if (!payload || !Array.isArray(payload.records)) {
          return { records: [] };
        }
        return {
          ...payload,
          records: payload.records,
        };
      });
    }
    return pricesDataPromise;
  };

  // ==================== GLOBAL MODAL ====================
  const globalModal = (() => {
    let overlay, inputEl, resultsEl;
    let courseIndex = null;
    let lastFocus = null;
    let isOpen = false;

    const loadCourseIndex = () => {
      if (courseIndex) return courseIndex;
      if (!window.COURSES) return null;

      const courses = window.COURSES;
      const unitMeta = new Map();
      const availability = new Map();
      const searchable = [];

      if (courses.catalog) {
        Object.entries(courses.catalog).forEach(([id, c]) => {
          searchable.push({ id, name: c.name || id, nameNorm: norm(c.name || id) });
        });
      }

      if (courses.offers) {
        Object.entries(courses.offers).forEach(([unitKey, offerByMod]) => {
          ['presencial', 'hibrido', 'semipresencial', 'ead'].forEach(modKey => {
            (offerByMod?.[modKey] || []).forEach(item => {
              if (!item.id) return;
              if (!availability.has(item.id)) availability.set(item.id, new Map());
              const byUnit = availability.get(item.id);
              if (!byUnit.has(unitKey)) byUnit.set(unitKey, new Set());
              byUnit.get(unitKey).add(modKey);
            });
          });
        });
      }

      const unitOrder = [];
      if (Array.isArray(window.PORTAL_LINKS)) {
        window.PORTAL_LINKS.forEach(u => {
          const key = u.coursesKey || u.key || u.slug;
          if (key) unitOrder.push(key);
        });
      }

      courseIndex = { searchable, availability, unitMeta, unitOrder };
      return courseIndex;
    };

    const ensure = () => {
      if (overlay) return overlay;
      overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      applyUnitTheme(overlay, "sede");
      const dialog = document.createElement("div");
      dialog.className = "modal";

      const head = document.createElement("div");
      head.className = "modal-head";
      head.innerHTML = '<div class="modal-title">Pesquisar Cursos (todas as unidades)</div>' +
        '<button class="modal-close" type="button" data-action="close-global-modal" aria-label="Fechar"><span>×</span></button>';

      const body = document.createElement("div");
      body.className = "modal-body";

      const searchRow = document.createElement("div");
      searchRow.className = "search-row";
      inputEl = document.createElement("input");
      inputEl.className = "search-input";
      inputEl.type = "search";
      inputEl.placeholder = "Digite o nome do curso...";
      inputEl.addEventListener("input", debounce(updateResults, 150));
      searchRow.appendChild(inputEl);

      resultsEl = document.createElement("div");
      resultsEl.className = "results";

      body.appendChild(searchRow);
      body.appendChild(resultsEl);

      dialog.appendChild(head);
      dialog.appendChild(body);
      overlay.appendChild(dialog);

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) { close(); return; }
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "close-global-modal") { close(); return; }
        if (btn.dataset.action === "goto-unit") {
          const unitKey = btn.dataset.unitKey;
          close();
          if (typeof window.scrollToUnit === 'function') {
            requestAnimationFrame(() => window.scrollToUnit(unitKey));
          } else {
            window.location.href = `./portal.html#unit-${unitKey}`;
          }
        }
      });

      document.addEventListener("keydown", (e) => {
        if (isOpen && e.key === "Escape") close();
      });

      document.body.appendChild(overlay);
      return overlay;
    };

    const open = () => {
      ensure();
      const idx = loadCourseIndex();
      if (!idx) {
        resultsEl.innerHTML = '<div class="empty">Dados de cursos não disponíveis.</div>';
        return;
      }
      lastFocus = document.activeElement;
      isOpen = true;
      overlay.classList.add("is-open");
      scrollLock.lock();
      inputEl.value = "";
      resultsEl.innerHTML = '<div class="empty">Digite um curso para ver em quais unidades ele está disponível.</div>';
      inputEl.focus();
      courseIndex = idx;
    };

    const close = () => {
      if (!overlay || !isOpen) return;
      isOpen = false;
      overlay.classList.remove("is-open");
      scrollLock.unlock();
      if (lastFocus) lastFocus.focus();
    };

    const modalityLabel = (key) => {
      const t = COURSE_TABS.find(x => x.key === key);
      return t ? t.label : key;
    };

    const updateResults = () => {
      if (!courseIndex) return;
      const q = norm(inputEl.value);
      resultsEl.innerHTML = "";
      if (!q) {
        resultsEl.innerHTML = '<div class="empty">Digite um curso para ver em quais unidades ele está disponível.</div>';
        return;
      }

      const hits = courseIndex.searchable
        .filter(c => c.nameNorm.includes(q))
        .slice(0, GLOBAL_LIMIT);

      if (!hits.length) {
        resultsEl.innerHTML = '<div class="empty">Nenhum curso encontrado.</div>';
        return;
      }

      for (const course of hits) {
        const card = document.createElement("div");
        card.className = "result-card";
        card.innerHTML = `<div class="result-course">${course.name}</div>`;

        const byUnit = courseIndex.availability.get(course.id);
        if (!byUnit) {
          resultsEl.appendChild(card);
          continue;
        }

        const orderedUnits = (courseIndex.unitOrder || [])
          .filter(uk => byUnit.has(uk))
          .map(uk => ({ unitKey: uk, mods: Array.from(byUnit.get(uk)) }));

        for (const u of orderedUnits) {
          const meta = courseIndex.unitMeta.get(u.unitKey) || { title: u.unitKey.toUpperCase(), visualKey: "sede" };

          const row = document.createElement("div");
          row.className = "result-row";
          applyUnitTheme(row, meta.visualKey || "sede");

          const left = document.createElement("div");
          left.className = "result-left";
          left.innerHTML = `<div class="result-unit">Unidade ${meta.title}</div>`;

          const tags = document.createElement("div");
          tags.className = "result-tags";
          u.mods.forEach(mk => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = modalityLabel(mk);
            tags.appendChild(tag);
          });
          left.appendChild(tags);

          const btn = document.createElement("button");
          btn.className = "btn-unit";
          btn.type = "button";
          btn.dataset.action = "goto-unit";
          btn.dataset.unitKey = u.unitKey;
          btn.innerHTML = "<span>Ver na unidade</span>";

          row.appendChild(left);
          row.appendChild(btn);
          card.appendChild(row);
        }

        resultsEl.appendChild(card);
      }
    };

    return { open, close };
  })();

  // ==================== PRICES MODAL ====================
  const pricesModal = (() => {
    let overlay;
    let titleEl;
    let inputEl;
    let unitSelectEl;
    let modalitySelectEl;
    let planSelectEl;
    let listEl;
    let emptyEl;
    let isOpen = false;
    let lastFocus = null;

    const state = {
      unitKey: "manaus",
      modalityKey: "presencial",
      planKey: "enem_vestibular",
      query: "",
      unitLabel: "Manaus",
      themeClass: "blue",
      recordsView: [],
      data: null,
    };

    const filteredRecords = () => {
      if (!Array.isArray(state.data?.records)) return [];
      const q = norm(state.query);
      return state.data.records.filter((r) => {
        if (r.unitKey !== state.unitKey && r.unitKey !== '__all__') return false;
        if (r.modalityKey !== state.modalityKey) return false;
        if (r.planKey !== state.planKey) return false;
        if (!q) return true;
        return norm(r.courseName).includes(q) || norm(r.courseId).includes(q);
      });
    };

    const buildCopyMessage = (record) => {
      const p10 = record?.bolsaPontualidadeCents?.p10;
      const modalityLabel = state.data?.modalities?.[state.modalityKey]?.label || PRICE_MODALITY_OPTIONS.find((x) => x.key === state.modalityKey)?.label || state.modalityKey;
      const planLabel = state.data?.plans?.[state.planKey]?.label || PRICE_PLAN_OPTIONS.find((x) => x.key === state.planKey)?.label || state.planKey;
      const unitLabel = state.data?.units?.[state.unitKey]?.label || state.unitLabel || "Tabela Geral";

      const lines = [
        `🎓 ${record.courseName} - ${modalityLabel} (${planLabel})`,
        `Curso de ${record.courseName} – Modalidade ${modalityLabel} (${unitLabel})`,
        `Valor integral: ${formatCents(record.integralCents)}`,
        `Com bolsa de estudos: ${formatCents(record.bolsaCents)} (mensalidade)`,
      ];

      if (p10 != null) {
        lines.push(`Valor com 10% de desconto pontualidade: ${formatCents(p10)}`);
      }

      lines.push("", "O desconto de pontualidade é adicionado caso você pague até o dia 5 de todo mês, somando assim +10% de desconto à sua bolsa.");
      return lines.join("\n");
    };

    const renderList = () => {
      state.recordsView = filteredRecords();
      listEl.innerHTML = "";

      if (!state.data || !Array.isArray(state.data.records) || !state.data.records.length) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Base de preços carregada, aguardando JSON final para preenchimento completo.";
        return;
      }

      if (!state.recordsView.length) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Nenhum preço encontrado para os filtros selecionados.";
        return;
      }

      emptyEl.hidden = true;
      for (const record of state.recordsView) {
        const card = document.createElement("article");
        card.className = "result-card prices-card";
        card.innerHTML = `
          <div class="result-course prices-course">${record.courseName}</div>
          <div class="meta prices-meta">Integral: ${formatCents(record.integralCents)}</div>
          <div class="meta prices-meta">Bolsa: ${formatCents(record.bolsaCents)}</div>
          ${record?.bolsaPontualidadeCents?.p10 != null ? `<div class="meta prices-meta">Bolsa + Pontualidade: ${formatCents(record.bolsaPontualidadeCents.p10)}</div>` : ''}
        `;

        const copyBtn = document.createElement("button");
        copyBtn.className = "btn-unit prices-copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "Copiar mensagem";
        copyBtn.addEventListener("click", async () => {
          const ok = await copyText(buildCopyMessage(record));
          copyBtn.textContent = ok ? "Copiado!" : "Falha ao copiar";
          setTimeout(() => {
            copyBtn.textContent = "Copiar mensagem";
          }, 1200);
        });
        card.appendChild(copyBtn);
        listEl.appendChild(card);
      }
    };

    const updateFilters = () => {
      state.unitKey = unitSelectEl.value;
      state.modalityKey = modalitySelectEl.value;
      state.planKey = planSelectEl.value;
      state.query = inputEl.value;
      state.unitLabel = state.data?.units?.[state.unitKey]?.label || PRICE_UNIT_OPTIONS.find((x) => x.key === state.unitKey)?.label || state.unitLabel;
      renderList();
    };

    const ensure = () => {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "modal-overlay prices-overlay";
      overlay.dataset.modal = "prices";
      overlay.setAttribute("aria-hidden", "true");
      const modal = document.createElement("div");
      modal.className = "modal prices-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Pesquisar preços");

      const head = document.createElement("div");
      head.className = "modal-head prices-head";
      titleEl = document.createElement("div");
      titleEl.className = "modal-title prices-title";
      titleEl.textContent = "Pesquisar preços";
      const closeBtn = document.createElement("button");
      closeBtn.className = "modal-close prices-close";
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Fechar");
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", () => close());
      head.appendChild(titleEl);
      head.appendChild(closeBtn);

      const body = document.createElement("div");
      body.className = "modal-body prices-body";

      const controls = document.createElement("div");
      controls.className = "links-controls-grid prices-filters-grid";

      unitSelectEl = document.createElement("select");
      unitSelectEl.className = "prices-field";
      unitSelectEl.setAttribute("aria-label", "Unidade");
      PRICE_UNIT_OPTIONS.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.key;
        option.textContent = opt.label;
        unitSelectEl.appendChild(option);
      });

      modalitySelectEl = document.createElement("select");
      modalitySelectEl.className = "prices-field";
      modalitySelectEl.setAttribute("aria-label", "Modalidade");
      PRICE_MODALITY_OPTIONS.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.key;
        option.textContent = opt.label;
        modalitySelectEl.appendChild(option);
      });

      planSelectEl = document.createElement("select");
      planSelectEl.className = "prices-field";
      planSelectEl.setAttribute("aria-label", "Plano");
      PRICE_PLAN_OPTIONS.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.key;
        option.textContent = opt.label;
        planSelectEl.appendChild(option);
      });

      inputEl = document.createElement("input");
      inputEl.className = "search-input prices-field";
      inputEl.type = "search";
      inputEl.placeholder = "Buscar curso...";
      inputEl.setAttribute("aria-label", "Buscar curso");

      controls.appendChild(unitSelectEl);
      controls.appendChild(modalitySelectEl);
      controls.appendChild(planSelectEl);
      controls.appendChild(inputEl);

      listEl = document.createElement("div");
      listEl.className = "course-grid prices-grid";

      emptyEl = document.createElement("div");
      emptyEl.className = "empty prices-empty";
      emptyEl.textContent = "Carregando...";

      body.appendChild(controls);
      body.appendChild(emptyEl);
      body.appendChild(listEl);
      modal.appendChild(head);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      unitSelectEl.addEventListener("change", updateFilters);
      modalitySelectEl.addEventListener("change", updateFilters);
      planSelectEl.addEventListener("change", updateFilters);
      inputEl.addEventListener("input", debounce(updateFilters, 120));

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen) close();
      });
    };

    const open = async ({ unitKey = "sede", unitTitle = "Manaus", theme = "blue" } = {}) => {
      ensure();
      lastFocus = document.activeElement;

      state.unitKey = resolvePriceUnitKey(unitKey);
      state.unitLabel = unitTitle;
      state.themeClass = theme;

      titleEl.textContent = `Pesquisar preços — ${state.unitLabel}`;
      unitSelectEl.value = state.unitKey;
      modalitySelectEl.value = state.modalityKey;
      planSelectEl.value = state.planKey;
      inputEl.value = state.query;

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      isOpen = true;
      scrollLock.lock();

      state.data = await loadPricesOnce();
      state.unitLabel = state.data?.units?.[state.unitKey]?.label || state.unitLabel;
      renderList();
      inputEl.focus();
    };

    const close = () => {
      if (!overlay || !isOpen) return;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      isOpen = false;
      scrollLock.unlock();
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    };

    return { open, close };
  })();

  // ==================== INFO MODAL BASE (genérico) ====================
  const createInfoModal = (modalId, title, apiEndpoint, cardRenderer) => {
    return (() => {
      let overlay;
      let titleEl;
      let inputEl;
      let listEl;
      let emptyEl;
      let isOpen = false;
      let lastFocus = null;
      let data = [];

      const loadData = async () => {
        data = await loadApiData(apiEndpoint);
      };

      const renderList = (filterText = '') => {
        const q = norm(filterText);
        const filtered = data.filter(item => {
          if (!q) return true;
          return Object.values(item).some(val => 
            val && norm(String(val)).includes(q)
          );
        });

        listEl.innerHTML = '';

        if (!filtered.length) {
          emptyEl.hidden = false;
          emptyEl.textContent = 'Nenhum resultado encontrado.';
          return;
        }

        emptyEl.hidden = true;
        filtered.forEach(item => {
          const card = cardRenderer(item);
          listEl.appendChild(card);
        });
      };

      const ensure = () => {
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay info-overlay';
        overlay.id = modalId;
        overlay.setAttribute('aria-hidden', 'true');
        
        const modal = document.createElement('div');
        modal.className = 'modal info-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', title);

        // Cabeçalho
        const head = document.createElement('div');
        head.className = 'modal-head info-head';
        titleEl = document.createElement('div');
        titleEl.className = 'modal-title info-title';
        titleEl.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close info-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => close());
        head.appendChild(titleEl);
        head.appendChild(closeBtn);

        // Corpo
        const body = document.createElement('div');
        body.className = 'modal-body info-body';

        // Campo de busca
        const searchRow = document.createElement('div');
        searchRow.className = 'search-row info-search-row';
        inputEl = document.createElement('input');
        inputEl.className = 'search-input info-search';
        inputEl.type = 'search';
        inputEl.placeholder = 'Buscar...';
        inputEl.addEventListener('input', debounce((e) => {
          renderList(e.target.value);
        }, 200));
        searchRow.appendChild(inputEl);

        // Lista de cards
        listEl = document.createElement('div');
        listEl.className = 'info-grid';

        emptyEl = document.createElement('div');
        emptyEl.className = 'empty info-empty';
        emptyEl.textContent = 'Carregando...';

        body.appendChild(searchRow);
        body.appendChild(emptyEl);
        body.appendChild(listEl);
        modal.appendChild(head);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && isOpen) close();
        });

        return overlay;
      };

      const open = async () => {
        ensure();
        lastFocus = document.activeElement;

        await loadData();
        renderList();

        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        isOpen = true;
        scrollLock.lock();
        inputEl.focus();
      };

      const close = () => {
        if (!overlay || !isOpen) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        isOpen = false;
        scrollLock.unlock();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      };

      return { open, close };
    })();
  };

  // ==================== MODAL DE SETORES ====================
  const setoresModal = createInfoModal(
    'setores-modal',
    'Contatos dos Setores',
    '/setores-contato',
    (item) => {
      const card = document.createElement('article');
      card.className = 'info-card setor-card';

      const title = document.createElement('div');
      title.className = 'info-card-title';
      title.textContent = item.setor;
      card.appendChild(title);

      const contatoRow = document.createElement('div');
      contatoRow.className = 'contato-row';

      if (item.telefone) {
        const phone = document.createElement('div');
        phone.className = 'contato-item';
        phone.innerHTML = `<span class="contato-icon">📞</span><span class="contato-value">${item.telefone}</span>`;
        contatoRow.appendChild(phone);
      }

      if (item.email) {
        const email = document.createElement('div');
        email.className = 'contato-item';
        email.innerHTML = `<span class="contato-icon">✉️</span><span class="contato-value">${item.email}</span>`;
        contatoRow.appendChild(email);
      }

      card.appendChild(contatoRow);

      const btnRow = document.createElement('div');
      btnRow.className = 'btn-row';

      if (item.telefone) {
        const copyPhoneBtn = document.createElement('button');
        copyPhoneBtn.className = 'info-copy-btn';
        copyPhoneBtn.textContent = '📋 Copiar Telefone';
        copyPhoneBtn.addEventListener('click', async () => {
          const ok = await copyText(item.telefone);
          copyPhoneBtn.textContent = ok ? '✓ Copiado!' : '✗ Erro';
          setTimeout(() => copyPhoneBtn.textContent = '📋 Copiar Telefone', 1200);
        });
        btnRow.appendChild(copyPhoneBtn);
      }

      if (item.email) {
        const copyEmailBtn = document.createElement('button');
        copyEmailBtn.className = 'info-copy-btn';
        copyEmailBtn.textContent = '✉️ Copiar E-mail';
        copyEmailBtn.addEventListener('click', async () => {
          const ok = await copyText(item.email);
          copyEmailBtn.textContent = ok ? '✓ Copiado!' : '✗ Erro';
          setTimeout(() => copyEmailBtn.textContent = '✉️ Copiar E-mail', 1200);
        });
        btnRow.appendChild(copyEmailBtn);
      }

      card.appendChild(btnRow);
      return card;
    }
  );

  // ==================== MODAL DE CURSOS TÉCNICOS ====================
const cursosTecnicosModal = (() => {
  let overlay, titleEl, searchInput, turnoSelect, duracaoSelect, listEl, emptyEl, backBtn, filtersRow;
  let isOpen = false, lastFocus = null;
  let data = [];
  let currentView = 'units'; // 'units' ou 'courses'
  let currentUnit = null;
  let currentFilter = { text: '', turno: 'todos', duracao: 'todos' };

  const loadData = async () => {
    data = await loadApiData('/cursos-tecnicos');
  };

  const getUniqueDuracoes = () => {
    const duracoes = new Set();
    data.forEach(u => u.cursos.forEach(c => duracoes.add(c.duracao)));
    return Array.from(duracoes).sort();
  };

  const renderUnits = (filterText = '') => {
    const q = window.norm(filterText);
    const filtered = data.filter(u => {
      if (!q) return true;
      return window.norm(u.unidade).includes(q) || u.cursos.some(c => window.norm(c.nome).includes(q));
    });

    listEl.innerHTML = '';

    if (!filtered.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'Nenhuma unidade encontrada.';
      return;
    }

    emptyEl.hidden = true;
    filtered.forEach(u => {
      const card = document.createElement('article');
      card.className = 'info-card unidade-card';
      card.innerHTML = `
        <h3 class="unidade-nome">${u.unidade}</h3>
        <p class="unidade-endereco">${u.endereco}</p>
      `;
      card.addEventListener('click', () => showCourses(u));
      listEl.appendChild(card);
    });
  };

  const renderCourses = () => {
    if (!currentUnit) return;

    let cursos = currentUnit.cursos;

    const q = window.norm(currentFilter.text);
    if (q) {
      cursos = cursos.filter(c => window.norm(c.nome).includes(q));
    }
    if (currentFilter.turno !== 'todos') {
      cursos = cursos.filter(c => c.turnos.includes(currentFilter.turno));
    }
    if (currentFilter.duracao !== 'todos') {
      cursos = cursos.filter(c => c.duracao === currentFilter.duracao);
    }

    listEl.innerHTML = '';

    if (!cursos.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'Nenhum curso encontrado.';
      return;
    }

    emptyEl.hidden = true;
    cursos.forEach(curso => {
      const card = document.createElement('article');
      card.className = 'info-card curso-card';

      const header = document.createElement('div');
      header.className = 'curso-header';
      header.innerHTML = `
        <h4 class="curso-nome">${curso.nome}</h4>
        <span class="curso-duracao-badge">${curso.duracao}</span>
      `;
      card.appendChild(header);

      const valoresDiv = document.createElement('div');
      valoresDiv.className = 'curso-valores';
      
      const primeira = document.createElement('div');
      primeira.className = 'primeira-mensalidade';
      primeira.textContent = `1ª mensalidade: R$ ${curso.primeiraMensalidade.toFixed(2)}`;
      valoresDiv.appendChild(primeira);

      Object.entries(curso.valores).forEach(([turno, valor]) => {
        const turnoDiv = document.createElement('div');
        turnoDiv.className = 'curso-turno';
        turnoDiv.textContent = `${turno}: R$ ${valor.toFixed(2)}`;
        valoresDiv.appendChild(turnoDiv);
      });
      card.appendChild(valoresDiv);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'info-copy-btn';
      copyBtn.textContent = 'Copiar mensagem';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const turnosStr = Object.entries(curso.valores)
          .map(([t, v]) => `  • ${t}: R$ ${v.toFixed(2)}`)
          .join('\n');
        const mensagem = `🎓 *Curso Técnico em ${curso.nome}* - Unidade ${currentUnit.unidade}\n` +
          `📍 Endereço: ${currentUnit.endereco}\n` +
          `⏱️ Duração: ${curso.duracao}\n` +
          `📅 Turnos disponíveis: ${curso.turnos.join(', ')}\n\n` +
          `💰 *Valores*:\n` +
          `- 1ª mensalidade: R$ ${curso.primeiraMensalidade.toFixed(2)}\n` +
          `- A partir da 2ª:\n${turnosStr}`;
        const ok = await copyText(mensagem);
        copyBtn.textContent = ok ? 'Copiado!' : 'Erro';
        setTimeout(() => copyBtn.textContent = 'Copiar mensagem', 1200);
      });
      card.appendChild(copyBtn);

      listEl.appendChild(card);
    });
  };

  const updateView = () => {
    if (currentView === 'units') {
      titleEl.textContent = 'Cursos Técnicos - Unidades';
      searchInput.placeholder = 'Buscar unidade ou curso...';
      filtersRow.style.display = 'none';
      backBtn.style.display = 'none';
      renderUnits(searchInput.value);
    } else {
      titleEl.textContent = `Cursos - ${currentUnit.unidade}`;
      searchInput.placeholder = 'Buscar curso...';
      filtersRow.style.display = 'flex';
      backBtn.style.display = 'inline-block';
      renderCourses();
    }
  };

  const showCourses = (unit) => {
    currentUnit = unit;
    currentView = 'courses';
    currentFilter = { text: '', turno: 'todos', duracao: 'todos' };
    searchInput.value = '';
    turnoSelect.value = 'todos';
    duracaoSelect.value = 'todos';
    updateView();
  };

  const goBack = () => {
    currentView = 'units';
    currentUnit = null;
    currentFilter = { text: '', turno: 'todos', duracao: 'todos' };
    searchInput.value = '';
    turnoSelect.value = 'todos';
    duracaoSelect.value = 'todos';
    updateView();
  };

  const ensure = () => {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'modal-overlay info-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    
    const modal = document.createElement('div');
    modal.className = 'modal info-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Cursos Técnicos');

    const head = document.createElement('div');
    head.className = 'modal-head info-head';
    titleEl = document.createElement('div');
    titleEl.className = 'modal-title info-title';
    titleEl.textContent = 'Cursos Técnicos - Unidades';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close info-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);
    
    head.appendChild(titleEl);
    head.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body info-body';

    const searchRow = document.createElement('div');
    searchRow.className = 'search-row info-search-row';
    searchInput = document.createElement('input');
    searchInput.className = 'search-input info-search';
    searchInput.type = 'search';
    searchInput.placeholder = 'Buscar unidade ou curso...';
    searchInput.addEventListener('input', debounce(() => {
      if (currentView === 'units') {
        renderUnits(searchInput.value);
      } else {
        currentFilter.text = searchInput.value;
        renderCourses();
      }
    }, 200));
    searchRow.appendChild(searchInput);

    filtersRow = document.createElement('div');
    filtersRow.className = 'filters-row';
    filtersRow.style.display = 'none';

    turnoSelect = document.createElement('select');
    turnoSelect.className = 'search-input filter-select';
    turnoSelect.innerHTML = `
      <option value="todos">Todos os turnos</option>
      <option value="matutino">Matutino</option>
      <option value="vespertino">Vespertino</option>
      <option value="noturno">Noturno</option>
      <option value="sabado">Sábado</option>
    `;
    turnoSelect.addEventListener('change', () => {
      currentFilter.turno = turnoSelect.value;
      renderCourses();
    });

    duracaoSelect = document.createElement('select');
    duracaoSelect.className = 'search-input filter-select';

    backBtn = document.createElement('button');
    backBtn.className = 'btn back-btn';
    backBtn.textContent = '← Voltar';
    backBtn.style.display = 'none';
    backBtn.addEventListener('click', goBack);

    filtersRow.appendChild(turnoSelect);
    filtersRow.appendChild(duracaoSelect);
    filtersRow.appendChild(backBtn);

    listEl = document.createElement('div');
    listEl.className = 'info-grid';

    emptyEl = document.createElement('div');
    emptyEl.className = 'empty info-empty';
    emptyEl.textContent = 'Carregando...';

    body.appendChild(searchRow);
    body.appendChild(filtersRow);
    body.appendChild(listEl);
    body.appendChild(emptyEl);
    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });

    return overlay;
  };

  const open = async () => {
    ensure();
    lastFocus = document.activeElement;
    await loadData();

    const duracoes = getUniqueDuracoes();
    duracaoSelect.innerHTML = '<option value="todos">Todas as durações</option>';
    duracoes.forEach(d => {
      const option = document.createElement('option');
      option.value = d;
      option.textContent = d;
      duracaoSelect.appendChild(option);
    });

    currentView = 'units';
    currentUnit = null;
    searchInput.value = '';
    turnoSelect.value = 'todos';
    duracaoSelect.value = 'todos';
    updateView();

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    isOpen = true;
    scrollLock.lock();
    searchInput.focus();
  };

  const close = () => {
    if (!overlay || !isOpen) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    isOpen = false;
    scrollLock.unlock();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  return { open, close };
})();

// Expor globalmente (adicione esta linha junto com os outros exports)
window.cursosTecnicosModal = cursosTecnicosModal; 

// ==================== MODAL DE COORDENAÇÃO (ATUALIZADO) ====================
const coordenadoresModal = createInfoModal(
    'coordenadores-modal',
    'Coordenação de Cursos e Contatos',
    '/coordenadores',
    (item) => {
      const card = document.createElement('article');
      card.className = 'info-card coordenador-card';

      const displayUnidade = item.unidade_nome || item.unidade || '';
      const displayCursos = (item.cursos && typeof item.cursos === 'string') 
        ? item.cursos.split(',').map(c => c.trim()) 
        : (Array.isArray(item.cursos) ? item.cursos : []);

      // Nome do coordenador
      if (item.coordenador) {
        const nome = document.createElement('div');
        nome.className = 'info-card-nome';
        nome.textContent = item.coordenador;
        card.appendChild(nome);
      }

      // Cursos
      if (displayCursos.length > 0) {
        const cursos = document.createElement('div');
        cursos.className = 'info-card-cursos';
        cursos.innerHTML = `⚡ ${displayCursos.join(', ')}`;
        card.appendChild(cursos);
      }

      // Contato row
      const contatoRow = document.createElement('div');
      contatoRow.className = 'contato-row';

      // Telefone (pode ser array telefones ou contato)
      const telefone = item.contato || (item.telefones && item.telefones[0]);
      if (telefone) {
        const phone = document.createElement('div');
        phone.className = 'contato-item';
        phone.innerHTML = `<span class="contato-icon">📞</span><span class="contato-value">${telefone}</span>`;
        contatoRow.appendChild(phone);
      }

      // E-mail
      if (item.email) {
        const email = document.createElement('div');
        email.className = 'contato-item';
        email.innerHTML = `<span class="contato-icon">✉️</span><span class="contato-value">${item.email}</span>`;
        contatoRow.appendChild(email);
      }

      card.appendChild(contatoRow);

      // Botões de copiar
      const btnRow = document.createElement('div');
      btnRow.className = 'btn-row';

      if (telefone) {
        const copyPhoneBtn = document.createElement('button');
        copyPhoneBtn.className = 'info-copy-btn';
        copyPhoneBtn.textContent = '📋 Copiar Telefone';
        copyPhoneBtn.addEventListener('click', async () => {
          const ok = await copyText(telefone);
          copyPhoneBtn.textContent = ok ? '✓ Copiado!' : '✗ Erro';
          setTimeout(() => copyPhoneBtn.textContent = '📋 Copiar Telefone', 1200);
        });
        btnRow.appendChild(copyPhoneBtn);
      }

      if (item.email) {
        const copyEmailBtn = document.createElement('button');
        copyEmailBtn.className = 'info-copy-btn';
        copyEmailBtn.textContent = '✉️ Copiar E-mail';
        copyEmailBtn.addEventListener('click', async () => {
          const ok = await copyText(item.email);
          copyEmailBtn.textContent = ok ? '✓ Copiado!' : '✗ Erro';
          setTimeout(() => copyEmailBtn.textContent = '✉️ Copiar E-mail', 1200);
        });
        btnRow.appendChild(copyEmailBtn);
      }

      card.appendChild(btnRow);

      return card;
    }
  );

 // Expor globalmente
window.globalModal = globalModal;
window.pricesModal = pricesModal;
window.setoresModal = setoresModal;
window.coordenadoresModal = coordenadoresModal;
window.cursosTecnicosModal = cursosTecnicosModal;

  // Listener global para os botões de pesquisa
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'open-cursos-tecnicos') {
  e.preventDefault();
  if (window.cursosTecnicosModal) window.cursosTecnicosModal.open();
}

    if (action === 'open-global-search') {
      e.preventDefault();
      if (window.globalModal) window.globalModal.open();
    }

    if (action === 'open-prices-menu') {
      e.preventDefault();
      if (window.pricesModal) window.pricesModal.open({ unitKey: 'sede', unitTitle: 'Manaus' });
    }
  });

  document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  console.log('Clique em ação:', action); // Log para depuração

  if (action === 'open-global-search') {
    e.preventDefault();
    if (window.globalModal) window.globalModal.open();
    else console.error('globalModal não encontrado');
  }

  if (action === 'open-prices-menu') {
    e.preventDefault();
    if (window.pricesModal) window.pricesModal.open({ unitKey: 'sede', unitTitle: 'Manaus' });
    else console.error('pricesModal não encontrado');
  }
});

})();