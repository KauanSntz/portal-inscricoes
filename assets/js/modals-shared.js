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
  // Utils
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

  // Scroll lock
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

  // ==================== GLOBAL MODAL ====================
  const globalModal = (() => {
    let overlay, inputEl, resultsEl;
    let index = null;
    let lastFocus = null;
    let isOpen = false;

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
        if (e.target === overlay) {
          close();
          return;
        }
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "close-global-modal") {
          close();
          return;
        }
        if (btn.dataset.action === "goto-unit") {
          const unitKey = btn.dataset.unitKey;
          close();
          // Função para rolar até a unidade (pode ser definida externamente)
          if (typeof scrollToUnit === 'function') {
            requestAnimationFrame(() => scrollToUnit(unitKey));
          } else {
            // Fallback: redirecionar para index.html com âncora
            window.location.href = `./index.html#unit-${unitKey}`;
          }
        }
      });

      document.addEventListener("keydown", (e) => {
        if (!isOpen) return;
        if (e.key === "Escape") close();
      });

      document.body.appendChild(overlay);
      return overlay;
    };

    const open = (courseIndex) => {
      ensure();
      index = courseIndex;
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      isOpen = true;
      overlay.classList.add("is-open");
      scrollLock.lock();
      inputEl.value = "";
      resultsEl.innerHTML = '<div class="empty">Digite um curso para ver em quais unidades ele está disponível.</div>';
      inputEl.focus();
    };

    const close = () => {
      if (!overlay || !isOpen) return;
      isOpen = false;
      overlay.classList.remove("is-open");
      scrollLock.unlock();
      if (lastFocus) lastFocus.focus();
    };

    const modalityLabel = (key) => {
      const t = COURSE_TABS.find((x) => x.key === key);
      return t ? t.label : key;
    };

    const updateResults = () => {
      if (!index) return;
      const q = norm(inputEl.value);
      resultsEl.innerHTML = "";
      if (!q) {
        resultsEl.innerHTML = '<div class="empty">Digite um curso para ver em quais unidades ele está disponível.</div>';
        return;
      }

      const hits = index.searchable
        .filter((c) => c.nameNorm.includes(q))
        .slice(0, GLOBAL_LIMIT);

      if (!hits.length) {
        resultsEl.innerHTML = '<div class="empty">Nenhum curso encontrado.</div>';
        return;
      }

      for (const course of hits) {
        const card = document.createElement("div");
        card.className = "result-card";
        card.innerHTML = `<div class="result-course">${course.name}</div>`;

        const byUnit = index.availability.get(course.id);
        if (!byUnit) {
          resultsEl.appendChild(card);
          continue;
        }

        const orderedUnits = index.unitOrder
          .filter((uk) => byUnit.has(uk))
          .map((uk) => ({
            unitKey: uk,
            mods: Array.from(byUnit.get(uk)),
          }));

        for (const u of orderedUnits) {
          const meta = index.unitMeta.get(u.unitKey) || { title: u.unitKey.toUpperCase(), visualKey: "sede" };

          const row = document.createElement("div");
          row.className = "result-row";
          applyUnitTheme(row, meta.visualKey || "sede");

          const left = document.createElement("div");
          left.className = "result-left";
          left.innerHTML = `<div class="result-unit">Unidade ${meta.title}</div>`;

          const tags = document.createElement("div");
          tags.className = "result-tags";
          for (const mk of u.mods) {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = modalityLabel(mk);
            tags.appendChild(tag);
          }
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

  // Expor globalmente
  window.globalModal = globalModal;
  window.pricesModal = pricesModal;
  window.norm = norm; // útil para outros scripts
  window.applyUnitTheme = applyUnitTheme;
})();