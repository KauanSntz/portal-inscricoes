/* assets/js/app.js */
(() => {
  "use strict";

  // -----------------------------
  // Config
  // -----------------------------
  const CONFIG = Object.freeze({
    ROOT_ID: "app",
    EMPTY_TEXT: "Modalidade não disponível para essa unidade",
    COURSE_TABS: [
      { key: "presencial", label: "Presencial" },
      { key: "hibrido", label: "Híbrido" },
      { key: "semipresencial", label: "Semipresencial" },
      { key: "ead", label: "EAD" },
    ],
    LINK_BLOCKS_ORDER: [
      { key: "presencial", label: "Presencial" },
      { key: "hibrido", label: "Híbrido" },
      { key: "semipresencial", label: "Semipresencial" },
      { key: "flex", label: "Semipresencial Flex" },
      { key: "ead", label: "EAD (100% Online)" },
    ],
    DEBUG: new URLSearchParams(location.search).has("debug"),
  });

  // -----------------------------
  // Utils (DOM seguro)
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = String(v);
      else if (k.startsWith("data-")) node.setAttribute(k, String(v));
      else if (k === "html") node.innerHTML = String(v); // use com cautela (não usamos com dados)
      else node.setAttribute(k, String(v));
    }
    for (const c of children) node.appendChild(c);
    return node;
  };

  const safeExternalUrl = (href) => {
    try {
      const u = new URL(String(href), location.href);
      if (u.protocol !== "https:" && u.protocol !== "http:") return null;
      return u.toString();
    } catch {
      return null;
    }
  };

  const uniq = (arr) => Array.from(new Set(arr));

  // -----------------------------
  // Data validation
  // -----------------------------
  const getDataOrThrow = () => {
    if (!Array.isArray(window.PORTAL_LINKS)) {
      throw new Error("PORTAL_LINKS não encontrado (assets/js/links-data.js).");
    }
    if (!window.COURSES || !window.COURSES.catalog || !window.COURSES.offers) {
      throw new Error("COURSES não encontrado (assets/js/courses-data.js).");
    }
    return { links: window.PORTAL_LINKS, courses: window.COURSES };
  };

  // -----------------------------
  // Rendering: Units + Link blocks
  // -----------------------------
  const renderApp = ({ links }) => {
    const root = document.getElementById(CONFIG.ROOT_ID);
    root.textContent = "";

    const frag = document.createDocumentFragment();
    for (const unit of links) frag.appendChild(renderUnit(unit));
    root.appendChild(frag);
  };

  const renderUnit = (unit) => {
    const unitCard = el("section", { class: `unit unit--${unit.theme}` });

    const head = el("div", { class: "unit-head" }, [
      el("h2", { class: "unit-title", text: unit.title }),
      el(
        "button",
        {
          class: "btn-courses",
          type: "button",
          "data-action": "open-courses",
          "data-unit": unit.coursesKey,
          "data-title": unit.title,
          "data-theme": unit.theme,
          "aria-label": `Pesquisar cursos - ${unit.title}`,
        },
        [el("span", { text: "Pesquisar cursos" })]
      ),
    ]);

    unitCard.appendChild(head);

    for (const blk of CONFIG.LINK_BLOCKS_ORDER) {
      const blockData = unit.blocks?.[blk.key] || { title: blk.label, links: [] };
      unitCard.appendChild(renderLinkBlock(blockData, blk.label));
    }

    return unitCard;
  };

  const renderLinkBlock = (block, fallbackTitle) => {
    const wrap = el("div", { class: "mod-block" });

    wrap.appendChild(el("h3", { class: "mod-title", text: block.title || fallbackTitle }));

    const content = el("div", { class: "mod-content" });
    const links = Array.isArray(block.links) ? block.links : [];

    if (links.length < 2) {
      content.appendChild(el("div", { class: "empty", text: CONFIG.EMPTY_TEXT }));
      wrap.appendChild(content);
      return wrap;
    }

    // valida: preferimos exatamente 2 links (vestibular/matrícula)
    const two = links.slice(0, 2);

    const grid = el("div", { class: "link-grid" });
    for (const ln of two) grid.appendChild(renderLinkCard(ln));
    content.appendChild(grid);

    wrap.appendChild(content);
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
