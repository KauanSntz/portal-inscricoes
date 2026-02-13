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
      else if (k === "html") node.innerHTML = String(v);
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
//
  const uniqBy = (arr, keyFn) => {
    const seen = new Set();
    const out = [];
    for (const item of arr) {
      const k = keyFn(item);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(item);
    }
    return out;
  };

  const normalizeText = (v) =>
    String(v ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const turnoKey = (t) => {
    const n = normalizeText(t);
    if (!n) return "";
    if (n.startsWith("mat")) return "matutino";
    if (n.startsWith("ves")) return "vespertino";
    if (n.startsWith("not")) return "noturno";
    if (n.startsWith("flex")) return "flex";
    if (n.startsWith("onl")) return "online";
    return n;
  };

  const canonicalTurnoLabel = (t) => {
    const k = turnoKey(t);
    if (k === "matutino") return "Matutino";
    if (k === "vespertino") return "Vespertino";
    if (k === "noturno") return "Noturno";
    if (k === "flex") return "Flex";
    if (k === "online") return "Online";
    return String(t ?? "").trim();
  };

  const TURN_SORT = Object.freeze({
    matutino: 1,
    vespertino: 2,
    noturno: 3,
    flex: 4,
    online: 5,
  });

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
    if (!root) return;

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

    // preferimos exatamente 2 links (vestibular/matrícula)
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

      // clique fora fecha
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          close();
          return;
        }

        // Event delegation ESTÁVEL (não quebra em re-render)
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;

        if (action === "close-modal") {
          close();
          return;
        }

        if (action === "set-tab") {
          state.tab = btn.dataset.tab || "presencial";
          state.query = "";
          state.turnoFilter = "Todos";
          render();
          return;
        }

        if (action === "set-turno") {
          state.turnoFilter = btn.dataset.turno || "Todos";
          render();
          return;
        }
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

      const closeBtn = $('[data-action="close-modal"]', ov);
      closeBtn?.focus();
    };

    const close = () => {
      if (!overlay) return;
      state.isOpen = false;
      overlay.classList.remove("is-open");

      const body = $('[data-role="body"]', overlay);
      if (body) body.textContent = "";

      if (lastFocus) lastFocus.focus();
    };

    const render = () => {
      if (!overlay) return;
      const { courses } = getDataOrThrow();

      const titleEl = $('[data-role="title"]', overlay);
      titleEl.textContent = `Cursos disponíveis — ${state.unitTitle}`;

      // Tabs
      const tabsEl = $('[data-role="tabs"]', overlay);
      tabsEl.textContent = "";
      for (const t of CONFIG.COURSE_TABS) {
        tabsEl.appendChild(
          el(
            "button",
            {
              class: `tab${t.key === state.tab ? " is-active" : ""}`,
              type: "button",
              "data-action": "set-tab",
              "data-tab": t.key,
            },
            [el("span", { text: t.label })]
          )
        );
      }

      // Body
      const body = $('[data-role="body"]', overlay);
      body.textContent = "";

      const listRaw = courses.offers?.[state.unitKey]?.[state.tab] || [];
      const list = Array.isArray(listRaw) ? listRaw : [];

      if (list.length === 0) {
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
        render();
      });

      searchRow.appendChild(input);

      // Chips apenas presencial/hibrido
      const showChips = state.tab === "presencial" || state.tab === "hibrido";
      if (showChips) {
        const allTurnos = uniqBy(
          list.flatMap((x) => (x.turnos || []).map(canonicalTurnoLabel)),
          (t) => turnoKey(t)
        )
          .filter((t) => turnoKey(t))
          .sort((a, b) => {
            const ak = turnoKey(a);
            const bk = turnoKey(b);
            const ao = TURN_SORT[ak] ?? 999;
            const bo = TURN_SORT[bk] ?? 999;
            return ao - bo || a.localeCompare(b, "pt-BR");
          });

        const chipsWrap = el("div", { class: "chips" });

        const makeChip = (label) =>
          el(
            "button",
            {
              class: `chip${label === state.turnoFilter ? " is-active" : ""}`,
              type: "button",
              "data-action": "set-turno",
              "data-turno": label,
            },
            [el("span", { text: label })]
          );

        chipsWrap.appendChild(makeChip("Todos"));
        for (const t of allTurnos) chipsWrap.appendChild(makeChip(t));

        searchRow.appendChild(chipsWrap);
      }

      body.appendChild(searchRow);

      const filtered = applyCourseFilters(courses, list, state);

      body.appendChild(el("div", { class: "meta", text: `${filtered.length} curso(s) encontrado(s)` }));

      const grid = el("div", { class: "course-grid" });
      for (const item of filtered) grid.appendChild(renderCourseCard(courses, item));
      body.appendChild(grid);
    };

    const applyCourseFilters = (courses, list, st) => {
      const q = normalizeText(st.query);

      const filterTurnKey = st.turnoFilter === "Todos" ? "" : turnoKey(st.turnoFilter);

      return list.filter((x) => {
        const name = courses.catalog?.[x.id]?.name || x.id;
        if (q && !normalizeText(name).includes(q)) return false;

        if (st.tab === "presencial" || st.tab === "hibrido") {
          if (filterTurnKey) {
            const keys = (x.turnos || []).map(turnoKey);
            return keys.includes(filterTurnKey);
          }
        }
        return true;
      });
    };

    const renderCourseCard = (courses, item) => {
      const name = courses.catalog?.[item.id]?.name || item.id;

      const card = el("div", { class: "course" });
      card.appendChild(el("div", { class: "course-name", text: name }));

      const badges = el("div", { class: "badges" });
      for (const t of item.turnos || []) {
        badges.appendChild(el("span", { class: "badge", text: canonicalTurnoLabel(t) }));
      }
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
      if (action !== "open-courses") return;

      const unitKey = btn.dataset.unit;
      const unitTitle = btn.dataset.title;
      const theme = btn.dataset.theme;

      // pega accent do próprio card (sem criar elemento fake)
      const unitSection = btn.closest(".unit");
      const accent =
        (unitSection && getComputedStyle(unitSection).getPropertyValue("--accent").trim()) || "#2563eb";

      modal.open({ unitKey, unitTitle, theme, accent });
    });
  };

  // -----------------------------
  // Diagnostics / tests (manual + semi-automático)
  // -----------------------------
  const runDiagnostics = () => {
    if (!CONFIG.DEBUG) return;

    const { links, courses } = getDataOrThrow();

    // Links: cada bloco deve ter 0 ou >=2, e quando >=2, validamos URL
    for (const u of links) {
      for (const blk of Object.values(u.blocks || {})) {
        const arr = Array.isArray(blk.links) ? blk.links : [];
        if (arr.length !== 0 && arr.length < 2) {
          console.warn("[links] bloco com 1 link (incompleto):", u.coursesKey, blk.title);
        }
        for (const ln of arr) {
          if (!safeExternalUrl(ln.href)) console.warn("[links] url inválida:", u.coursesKey, blk.title, ln);
        }
      }
    }

    // Courses: presença de unidades
    const mustUnits = ["sede", "leste", "sul", "norte", "compensa"];
    for (const k of mustUnits) {
      if (!courses.offers[k]) console.error("[courses] unidade faltando:", k);
    }

    // Perf: simulação 10k
    const t0 = performance.now();
    const big = [];
    const ids = Object.keys(courses.catalog);
    for (let i = 0; i < 10000; i++) {
      big.push({ id: ids[i % ids.length], turnos: ["Matutino", "Noturno"] });
    }
    const out = big.filter((x) => normalizeText(courses.catalog[x.id]?.name).includes("a"));
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
      if (!root) return;
      root.textContent = "";
      root.appendChild(el("div", { class: "empty", text: `Erro: ${err.message}` }));
    }
  };

  init();
})();
