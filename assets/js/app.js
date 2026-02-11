/* assets/js/app.js */
(() => {
  "use strict";

  // -----------------------------
  // Config
  // -----------------------------
  const APP_ROOT_ID = "app";

  const FRONT_MODALITIES = [
    { key: "presencial", label: "Presencial" },
    { key: "hibrido", label: "Híbrido" },
    { key: "semipresencial", label: "Semipresencial" },
    { key: "semiflex", label: "Semipresencial Flex" },
    { key: "ead", label: "EAD (100% Online)" },
  ];

  const MODAL_TABS = [
    { key: "presencial", label: "Presencial" },
    { key: "hibrido", label: "Híbrido" },
    { key: "semipresencial", label: "Semipresencial" },
    { key: "ead", label: "EAD" },
  ];

  const TURN_ORDER = ["Matutino", "Vespertino", "Noturno", "Flex", "Online"];
  const EMPTY_MODALITY_MESSAGE = "Modalidade não disponível para essa unidade";

  // -----------------------------
  // Helpers
  // -----------------------------
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const byTurnOrder = (a, b) => TURN_ORDER.indexOf(a) - TURN_ORDER.indexOf(b);

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getPortalLinks() {
    return safeArray(window.PORTAL_LINKS);
  }

  function getCoursesStore() {
    // Formato esperado (antigo): window.coursesData[slug][modalidade] -> [{nome, turno}]
    // Se você estiver usando outro formato, este wrapper evita crash e mostra mensagens claras.
    const store = window.coursesData;
    return store && typeof store === "object" ? store : null;
  }

  function getUnitAccentFromElement(unitEl) {
    if (!unitEl) return "#2563eb";
    const accent = getComputedStyle(unitEl).getPropertyValue("--accent").trim();
    return accent || "#2563eb";
  }

  function createEl(tag, { className, text, attrs } = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v == null) return;
        el.setAttribute(k, String(v));
      });
    }
    return el;
  }

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // -----------------------------
  // Links: split per modality and ensure Vestibular + Matrícula
  // -----------------------------
  function classifyLinkModality(mod) {
    const m = normalize(mod);
    if (m.includes("ead")) return "ead";
    if (m.includes("semi") && m.includes("flex")) return "semiflex";
    if (m.includes("semipresencial")) return "semipresencial";
    if (m.includes("hibrido")) return "hibrido";
    if (m.includes("presencial")) return "presencial";
    // fallback:
    if (m.includes("flex")) return "semiflex";
    if (m.includes("semi")) return "semipresencial";
    return "presencial";
  }

  function pickVestibularMatricula(links) {
    const list = safeArray(links);
    const vestibular = list.find((l) => normalize(l.tipo).includes("vestibular")) || null;
    const matricula = list.find((l) => normalize(l.tipo).includes("matricula")) || null;

    // fallback: pega os 2 primeiros se não achou por tipo
    const fallback = list.slice(0, 2);
    return {
      vestibular: vestibular || fallback[0] || null,
      matricula: matricula || fallback[1] || null,
    };
  }

  function buildFrontModalityBuckets(unitLinks) {
    // Aceita tanto formato antigo (modalidades agrupadas) quanto já separado.
    // Sempre retorna buckets: presencial, hibrido, semipresencial, semiflex, ead -> {vestibular, matricula}
    const buckets = {
      presencial: [],
      hibrido: [],
      semipresencial: [],
      semiflex: [],
      ead: [],
    };

    const modalities = safeArray(unitLinks.modalidades);
    modalities.forEach((modBlock) => {
      safeArray(modBlock.links).forEach((link) => {
        const key = classifyLinkModality(link.modalidade || modBlock.titulo || "");
        buckets[key].push(link);
      });
    });

    return {
      presencial: pickVestibularMatricula(buckets.presencial),
      hibrido: pickVestibularMatricula(buckets.hibrido),
      semipresencial: pickVestibularMatricula(buckets.semipresencial),
      semiflex: pickVestibularMatricula(buckets.semiflex),
      ead: pickVestibularMatricula(buckets.ead),
    };
  }

  // -----------------------------
  // Courses (modal): normalize and group
  // -----------------------------
  function readCourses(unitSlug, modalityKey) {
    const store = getCoursesStore();
    if (!store) return [];

    const unit = store[unitSlug];
    if (!unit || typeof unit !== "object") return [];

    const raw = safeArray(unit[modalityKey]);

    // raw esperado: [{nome, turno}]
    // tolerante: se vier { name/turn }, etc.
    return raw
      .map((item) => {
        const nome = item?.nome ?? item?.name ?? "";
        const turno = item?.turno ?? item?.turn ?? "";
        return { nome: String(nome).trim(), turno: String(turno).trim() };
      })
      .filter((c) => c.nome.length > 0);
  }

  function groupCoursesByName(courses, modalityKey) {
    const map = new Map();

    for (const c of courses) {
      const key = normalize(c.nome);
      if (!map.has(key)) map.set(key, { nome: c.nome, turnos: new Set() });

      const entry = map.get(key);

      // Regras de negócio:
      // - Semipresencial + Flex: mesma disponibilidade, badges Noturno e Flex (sem filtro obrigatório)
      // - EAD: badge Online
      if (modalityKey === "semipresencial") {
        entry.turnos.add("Noturno");
        entry.turnos.add("Flex");
      } else if (modalityKey === "ead") {
        entry.turnos.add("Online");
      } else {
        // Presencial / Híbrido usa o turno vindo do dado
        entry.turnos.add(c.turno || "Noturno");
      }
    }

    return Array.from(map.values()).map((x) => ({
      nome: x.nome,
      turnos: Array.from(x.turnos).sort(byTurnOrder),
    }));
  }

  function computeAvailableTurnos(grouped, modalityKey) {
    // Semipresencial e EAD sem filtro (regras do usuário)
    if (modalityKey === "semipresencial" || modalityKey === "ead") return [];

    const set = new Set();
    grouped.forEach((c) => c.turnos.forEach((t) => set.add(t)));
    return Array.from(set).sort(byTurnOrder);
  }

  // -----------------------------
  // Modal (singleton)
  // -----------------------------
  const CoursesModal = (() => {
    let overlay, modal, titleEl, closeBtn, tabsEl, bodyEl;
    let searchInput, chipsEl, metaEl, gridEl, emptyEl;

    const state = {
      unitSlug: null,
      unitTitle: null,
      accent: "#2563eb",
      activeTab: "presencial",
      query: "",
      turno: "ALL",
    };

    function ensureModal() {
      if (overlay) return;

      overlay = createEl("div", { className: "modal-overlay" });
      modal = createEl("div", { className: "modal" });

      const header = createEl("div", { className: "modal-header" });
      titleEl = createEl("div", { className: "modal-title", text: "Cursos disponíveis" });

      closeBtn = createEl("button", {
        className: "modal-close",
        attrs: { type: "button", "aria-label": "Fechar" },
        text: "×",
      });

      header.append(titleEl, closeBtn);

      tabsEl = createEl("div", { className: "modal-tabs" });
      bodyEl = createEl("div", { className: "modal-body" });

      // Search row
      const searchRow = createEl("div", { className: "search-row" });
      searchInput = createEl("input", {
        className: "search-input",
        attrs: { type: "text", placeholder: "Pesquisar curso..." },
      });

      chipsEl = createEl("div", { className: "chips" });

      searchRow.append(searchInput, chipsEl);

      metaEl = createEl("div", { className: "courses-meta" });
      gridEl = createEl("div", { className: "course-grid" });
      emptyEl = createEl("div", { className: "empty-state" });

      bodyEl.append(searchRow, metaEl, gridEl);

      modal.append(header, tabsEl, bodyEl);
      overlay.append(modal);
      document.body.append(overlay);

      // Events (bind once)
      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      document.addEventListener("keydown", (e) => {
        if (!overlay.classList.contains("is-open")) return;
        if (e.key === "Escape") close();
      });

      tabsEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;
        const key = btn.dataset.tab;
        if (!key) return;
        setTab(key);
      });

      chipsEl.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        const turno = chip.dataset.turno;
        if (!turno) return;
        setTurno(turno);
      });

      // Search: debounce leve
      let t = null;
      searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.query = searchInput.value || "";
          renderBody();
        }, 80);
      });
    }

    function open({ unitSlug, unitTitle, accent }) {
      ensureModal();

      state.unitSlug = unitSlug;
      state.unitTitle = unitTitle;
      state.accent = accent || "#2563eb";
      state.activeTab = "presencial";
      state.query = "";
      state.turno = "ALL";

      overlay.style.setProperty("--accent", state.accent);
      overlay.classList.add("is-open");

      titleEl.textContent = `Cursos disponíveis — ${unitTitle || unitSlug || ""}`;
      searchInput.value = "";

      renderTabs();
      renderBody();
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove("is-open");

      // limpa conteúdo do body para evitar "ghost modal" / duplicação visual
      clearEl(tabsEl);
      clearEl(chipsEl);
      clearEl(gridEl);
      metaEl.textContent = "";
      state.unitSlug = null;
      state.unitTitle = null;
      state.query = "";
      state.turno = "ALL";
    }

    function setTab(key) {
      if (state.activeTab === key) return;
      state.activeTab = key;
      state.query = "";
      state.turno = "ALL";
      searchInput.value = "";
      renderTabs();
      renderBody();
    }

    function setTurno(turno) {
      state.turno = turno;
      renderBody();
      // atualizar UI chips
      [...chipsEl.querySelectorAll(".chip")].forEach((c) => {
        c.classList.toggle("is-active", c.dataset.turno === turno);
      });
    }

    function renderTabs() {
      clearEl(tabsEl);

      MODAL_TABS.forEach((t) => {
        const btn = createEl("button", {
          className: `tab-btn${t.key === state.activeTab ? " is-active" : ""}`,
          text: t.label,
          attrs: { type: "button" },
        });
        btn.dataset.tab = t.key;
        tabsEl.append(btn);
      });
    }

    function renderChips(turnos) {
      clearEl(chipsEl);

      // Semipresencial e EAD: sem filtro
      if (state.activeTab === "semipresencial" || state.activeTab === "ead") {
        chipsEl.style.display = "none";
        return;
      }

      chipsEl.style.display = "flex";

      const allChip = createEl("button", {
        className: `chip${state.turno === "ALL" ? " is-active" : ""}`,
        text: "Todos",
        attrs: { type: "button" },
      });
      allChip.dataset.turno = "ALL";
      chipsEl.append(allChip);

      turnos.forEach((t) => {
        const chip = createEl("button", {
          className: `chip${state.turno === t ? " is-active" : ""}`,
          text: t,
          attrs: { type: "button" },
        });
        chip.dataset.turno = t;
        chipsEl.append(chip);
      });
    }

    function renderBody() {
      if (!state.unitSlug) return;

      const raw = readCourses(state.unitSlug, state.activeTab);
      const grouped = groupCoursesByName(raw, state.activeTab);

      // Busca
      const q = normalize(state.query);
      let filtered = grouped;

      if (q) {
        filtered = filtered.filter((c) => normalize(c.nome).includes(q));
      }

      // Filtro por turno (somente presencial/hibrido)
      if (state.turno !== "ALL" && state.activeTab !== "semipresencial" && state.activeTab !== "ead") {
        filtered = filtered.filter((c) => c.turnos.some((t) => normalize(t) === normalize(state.turno)));
      }

      const availableTurnos = computeAvailableTurnos(grouped, state.activeTab);
      renderChips(availableTurnos);

      // Meta + Grid
      clearEl(gridEl);

      if (grouped.length === 0) {
        metaEl.textContent = "";
        emptyEl.textContent = `Conteúdo de ${MODAL_TABS.find((t) => t.key === state.activeTab)?.label || "Modalidade"} ainda não cadastrado para ${state.unitTitle || state.unitSlug}.`;
        gridEl.append(emptyEl);
        return;
      }

      metaEl.textContent = `${filtered.length} curso(s) encontrado(s)`;

      if (filtered.length === 0) {
        emptyEl.textContent = "Nenhum curso corresponde ao filtro/pesquisa.";
        gridEl.append(emptyEl);
        return;
      }

      const frag = document.createDocumentFragment();

      filtered.forEach((course) => {
        const card = createEl("div", { className: "course-card" });

        const name = createEl("div", { className: "course-name", text: course.nome });

        const badges = createEl("div", { className: "badges" });
        course.turnos.forEach((t) => {
          badges.append(createEl("span", { className: "badge", text: t }));
        });

        card.append(name, badges);
        frag.append(card);
      });

      gridEl.append(frag);
    }

    return { open, close };
  })();

  // -----------------------------
  // Render UI (front)
  // -----------------------------
  function renderApp() {
    const root = document.getElementById(APP_ROOT_ID);
    if (!root) return;

    const linksData = getPortalLinks();
    if (!linksData.length) {
      root.textContent = "Erro: PORTAL_LINKS não encontrado (links-data.js).";
      return;
    }

    clearEl(root);

    const frag = document.createDocumentFragment();

    linksData.forEach((unit) => {
      const unitSlug = unit.slug;
      const unitTitle = unit.titulo || unit.slug;

      const unitEl = createEl("section", { className: `unidade ${unitSlug}` });

      // Header
      const header = createEl("div", { className: "unidade-header" });
      const h2 = createEl("h2", { text: unitTitle });

      const btn = createEl("button", {
        className: "btn-cursos",
        attrs: { type: "button" },
        text: "Pesquisar cursos",
      });

      // Botão abre modal (usa accent real do card)
      btn.addEventListener("click", () => {
        const accent = getUnitAccentFromElement(unitEl);
        CoursesModal.open({ unitSlug, unitTitle, accent });
      });

      header.append(h2, btn);
      unitEl.append(header);

      // Front modalities
      const buckets = buildFrontModalityBuckets(unit);

      FRONT_MODALITIES.forEach((m) => {
        const subtitle = createEl("h3", { className: "subtitulo-modalidade", text: m.label });
        unitEl.append(subtitle);

        const box = createEl("div", { className: "botoes" });

        const pair = buckets[m.key] || { vestibular: null, matricula: null };
        const a = pair.vestibular;
        const b = pair.matricula;

        if (!a && !b) {
          const empty = createEl("div", { className: "empty-state", text: EMPTY_MODALITY_MESSAGE });
          box.append(empty);
          unitEl.append(box);
          return;
        }

        // Render link card helper
        const renderLink = (link) => {
          if (!link) return null;

          const card = createEl("a", {
            className: "botao",
            attrs: {
              href: link.href,
              target: "_blank",
              rel: "noopener noreferrer",
            },
          });

          const code = createEl("div", { className: "codigo", text: link.codigo || "" });
          const type = createEl("span", { className: "tipo", text: link.tipo || "Acessar" });
          const mod = createEl("span", { className: "modalidade", text: link.modalidade || "" });

          card.append(code, type, mod);
          return card;
        };

        const cardA = renderLink(a);
        const cardB = renderLink(b);

        if (cardA) box.append(cardA);
        if (cardB) box.append(cardB);

        unitEl.append(box);
      });

      frag.append(unitEl);
    });

    root.append(frag);
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    renderApp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();    wrap.appendChild(content);
    return wrap;
  };

  const renderLinkCard = (ln) => {
    const url = safeExternalUrl(ln.href);
    const a = el("a", {
      class: "link-card",
      href: url || "#",
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${ln.type} - ${ln.modality} (código ${ln.code})`,
    });

    a.appendChild(el("div", { class: "link-code", text: ln.code }));
    a.appendChild(el("div", { class: "link-type", text: ln.type }));
    a.appendChild(el("div", { class: "link-mod", text: ln.modality }));

    if (!url) {
      a.setAttribute("tabindex", "-1");
      a.style.opacity = "0.6";
      a.style.pointerEvents = "none";
    }

    return a;
  };

  // -----------------------------
  // Modal (singleton)
  // -----------------------------
  const modal = (() => {
    let overlay = null;
    let lastFocus = null;

    const state = {
      isOpen: false,
      unitKey: "",
      unitTitle: "",
      theme: "",
      tab: "presencial",
      query: "",
      turnoFilter: "Todos",
    };

    const ensure = () => {
      if (overlay) return overlay;

      overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });

      const dialog = el("div", { class: "modal" });
      const head = el("div", { class: "modal-head" }, [
        el("div", { class: "modal-title", "data-role": "title" }),
        el("button", { class: "modal-close", type: "button", "data-action": "close-modal", "aria-label": "Fechar" }, [
          el("span", { text: "×" }),
        ]),
      ]);

      const tabs = el("div", { class: "modal-tabs", "data-role": "tabs" });
      const body = el("div", { class: "modal-body", "data-role": "body" });

      dialog.appendChild(head);
      dialog.appendChild(tabs);
      dialog.appendChild(body);
      overlay.appendChild(dialog);

      overlay.addEventListener("click", (e) => {
        // clique fora fecha
        if (e.target === overlay) close();
      });

      document.addEventListener("keydown", (e) => {
        if (!state.isOpen) return;
        if (e.key === "Escape") close();
      });

      document.body.appendChild(overlay);
      return overlay;
    };

    const open = ({ unitKey, unitTitle, theme, accent }) => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      state.isOpen = true;
      state.unitKey = unitKey;
      state.unitTitle = unitTitle;
      state.theme = theme;
      state.tab = "presencial";
      state.query = "";
      state.turnoFilter = "Todos";

      const ov = ensure();
      ov.classList.add("is-open");

      const modalEl = $(".modal", ov);
      modalEl.style.setProperty("--accent", accent);

      render();
      // foco inicial
      const closeBtn = $('[data-action="close-modal"]', ov);
      closeBtn?.focus();
    };

    const close = () => {
      if (!overlay) return;
      state.isOpen = false;
      overlay.classList.remove("is-open");

      // limpa body (evita “modal fantasma” e zumbis)
      const body = $('[data-role="body"]', overlay);
      if (body) body.textContent = "";

      if (lastFocus) lastFocus.focus();
    };

    const render = () => {
      if (!overlay) return;
      const { courses } = getDataOrThrow();

      const titleEl = $('[data-role="title"]', overlay);
      titleEl.textContent = `Cursos disponíveis — ${state.unitTitle}`;

      // tabs
      const tabsEl = $('[data-role="tabs"]', overlay);
      tabsEl.textContent = "";
      for (const t of CONFIG.COURSE_TABS) {
        const b = el("button", {
          class: `tab${t.key === state.tab ? " is-active" : ""}`,
          type: "button",
          "data-action": "set-tab",
          "data-tab": t.key,
        }, [el("span", { text: t.label })]);
        tabsEl.appendChild(b);
      }

      // body
      const body = $('[data-role="body"]', overlay);
      body.textContent = "";

      const list = courses.offers?.[state.unitKey]?.[state.tab] || [];
      if (!Array.isArray(list) || list.length === 0) {
        body.appendChild(el("div", { class: "empty", text: CONFIG.EMPTY_TEXT }));
        return;
      }

      const searchRow = el("div", { class: "search-row" });
      const input = el("input", {
        class: "search-input",
        type: "search",
        placeholder: "Pesquisar curso...",
        value: state.query,
        "aria-label": "Pesquisar curso",
      });
      input.addEventListener("input", () => {
        state.query = input.value || "";
        render(); // simples e previsível (lista não é gigante)
      });
      searchRow.appendChild(input);

      // chips apenas presencial/hibrido
      const showChips = state.tab === "presencial" || state.tab === "hibrido";
      if (showChips) {
        const allTurnos = uniq(list.flatMap((x) => x.turnos || [])).sort((a, b) => a.localeCompare(b, "pt-BR"));
        const chips = ["Todos", ...allTurnos];

        const chipsWrap = el("div", { class: "chips" });
        for (const c of chips) {
          const btn = el("button", {
            class: `chip${c === state.turnoFilter ? " is-active" : ""}`,
            type: "button",
            "data-action": "set-turno",
            "data-turno": c,
          }, [el("span", { text: c })]);
          chipsWrap.appendChild(btn);
        }
        searchRow.appendChild(chipsWrap);
      }

      body.appendChild(searchRow);

      const filtered = applyCourseFilters(courses, list, state);
      body.appendChild(el("div", { class: "meta", text: `${filtered.length} curso(s) encontrado(s)` }));

      const grid = el("div", { class: "course-grid" });
      for (const item of filtered) grid.appendChild(renderCourseCard(courses, item));
      body.appendChild(grid);

      // event delegation (tabs + chips)
      // event delegation (tabs + chips)
tabsEl.onclick = (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.action === "set-tab") {
    state.tab = btn.dataset.tab || "presencial";
    state.query = "";
    state.turnoFilter = "Todos";
    render();
  }
};

body.onclick = (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.action === "set-turno") {
    state.turnoFilter = btn.dataset.turno || "Todos";
    render();
  }
};


    const applyCourseFilters = (courses, list, st) => {
      const q = (st.query || "").trim().toLowerCase();

      return list.filter((x) => {
        const name = courses.catalog?.[x.id]?.name || x.id;
        if (q && !name.toLowerCase().includes(q)) return false;

        if (st.tab === "presencial" || st.tab === "hibrido") {
          if (st.turnoFilter && st.turnoFilter !== "Todos") {
            return (x.turnos || []).includes(st.turnoFilter);
          }
        }

        // semipresencial/ead: sem filtro de turno
        return true;
      });
    };

    const renderCourseCard = (courses, item) => {
      const name = courses.catalog?.[item.id]?.name || item.id;

      const card = el("div", { class: "course" });
      card.appendChild(el("div", { class: "course-name", text: name }));

      const badges = el("div", { class: "badges" });
      for (const t of (item.turnos || [])) badges.appendChild(el("span", { class: "badge", text: t }));
      card.appendChild(badges);

      return card;
    };

    return { open, close };
  })();

  // -----------------------------
  // Events
  // -----------------------------
  const bindEvents = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === "open-courses") {
        const { links } = getDataOrThrow();
        const unitKey = btn.dataset.unit;
        const unitTitle = btn.dataset.title;
        const theme = btn.dataset.theme;

        // pega accent do CSS (por theme) de forma robusta
        const fake = document.createElement("div");
        fake.className = `unit unit--${theme}`;
        document.body.appendChild(fake);
        const accent = getComputedStyle(fake).getPropertyValue("--accent").trim() || "#2563eb";
        fake.remove();

        modal.open({ unitKey, unitTitle, theme, accent });
      }

      if (action === "close-modal") {
        modal.close();
      }
    });
  };

  // -----------------------------
  // Diagnostics / tests (manual + semi-automático)
  // -----------------------------
  const runDiagnostics = () => {
    if (!CONFIG.DEBUG) return;

    const { links, courses } = getDataOrThrow();

    // 1) Links: cada bloco deve ter 0 ou >=2, e quando >=2, validamos URL
    for (const u of links) {
      for (const blk of Object.values(u.blocks || {})) {
        const arr = Array.isArray(blk.links) ? blk.links : [];
        if (arr.length !== 0 && arr.length < 2) {
          console.warn("[links] bloco com 1 link (incompleto):", u.key, blk.title);
        }
        for (const ln of arr) {
          if (!safeExternalUrl(ln.href)) console.warn("[links] url inválida:", u.key, blk.title, ln);
        }
      }
    }

    // 2) Courses: unidade e modalidades existem
    const mustUnits = ["sede", "leste", "sul", "norte", "compensa"];
    for (const k of mustUnits) {
      if (!courses.offers[k]) console.error("[courses] unidade faltando:", k);
    }

    // 3) Performance (dados grandes)
    const t0 = performance.now();
    const big = [];
    const ids = Object.keys(courses.catalog);
    for (let i = 0; i < 10000; i++) {
      big.push({ id: ids[i % ids.length], turnos: ["Matutino", "Noturno"] });
    }
    // filtra (simula render)
    const q = "a";
    const out = big.filter((x) => (courses.catalog[x.id]?.name || "").toLowerCase().includes(q));
    const t1 = performance.now();
    console.log("[debug] perf filter 10k:", Math.round(t1 - t0), "ms | hits:", out.length);
  };

  // -----------------------------
  // Init
  // -----------------------------
  const init = () => {
    try {
      const data = getDataOrThrow();
      renderApp(data);
      bindEvents();
      runDiagnostics();
    } catch (err) {
      console.error(err);
      const root = document.getElementById(CONFIG.ROOT_ID);
      root.textContent = "";
      root.appendChild(el("div", { class: "empty", text: `Erro: ${err.message}` }));
    }
  };

  init();
})();
