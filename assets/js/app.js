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
      { key: "flex", label: "Flex" },
      { key: "ead", label: "100% EAD" },
    ],

    // oeste no front -> compensa no back
    COURSE_KEY_ALIAS: Object.freeze({ oeste: "compensa" }),

    // limite de cursos no modal global
    GLOBAL_LIMIT: 20,
    PRICES_DATA_PATH: "./assets/data/course_prices_2026_1_updated.json",

    DEBUG: new URLSearchParams(location.search).has("debug"),
  });

  // -----------------------------
  // Utils
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = String(v);
      else if (k.startsWith("data-")) node.setAttribute(k, String(v));
      else node.setAttribute(k, String(v));
    }
    for (const c of children) node.appendChild(c);
    return node;
  };

  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const uniq = (arr) => Array.from(new Set(arr));

  const debounce = (fn, ms = 150) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatCents = (cents) => moneyFmt.format((Number(cents) || 0) / 100);

  const safeExternalUrl = (href) => {
    try {
      const u = new URL(String(href), location.href);
      if (u.protocol !== "https:" && u.protocol !== "http:") return null;
      return u.toString();
    } catch {
      return null;
    }
  };
  const applyUnitTheme = (containerEl, theme) => {
    if (!containerEl) return;
    containerEl.classList.remove("theme-blue", "theme-red");
    const normalized = String(theme || "").toLowerCase();
    containerEl.classList.add(normalized.includes("red") ? "theme-red" : "theme-blue");
  };
  const toneKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const UNIT_TONE_MAP = Object.freeze({
    sede: "blue",
    leste: "red",
    sul: "blue",
    norte: "red",
    compensa: "blue",
    oeste: "blue",
  });

  const getUnitTone = (unitRef) => {
    const key = toneKey(unitRef);
    if (UNIT_TONE_MAP[key]) return UNIT_TONE_MAP[key];
    if (!key) return "blue";
    const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return hash % 2 === 0 ? "blue" : "red";
  };

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

  const resolvePriceUnitKey = (portalUnitKey) => PRICE_UNIT_BY_PORTAL[norm(portalUnitKey)] || "manaus";

  // -----------------------------
// Scroll lock (impede scroll do fundo com modal aberto)
// -----------------------------
const scrollLock = (() => {
  let locks = 0;
  let scrollY = 0;

  const lock = () => {
    locks += 1;
    if (locks > 1) return;

    scrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");

    // trava de forma robusta (evita scroll em mobile também)
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
  // Data validation
  // -----------------------------
  const getDataOrThrow = () => {
    if (!Array.isArray(window.PORTAL_LINKS)) {
      throw new Error("PORTAL_LINKS não encontrado (assets/js/links-data.js).");
    }
    if (!window.COURSES || !window.COURSES.catalog || !window.COURSES.offers) {
      throw new Error("COURSES não encontrado (assets/js/courses-data.js).");
    }
    return { linksRaw: window.PORTAL_LINKS, courses: window.COURSES, coursePrices: window.COURSE_PRICES || null };
  };

  // -----------------------------
  // Normalize links (aceita formato cru)
  // -----------------------------
  const normalizeLinks = (linksRaw) => {
    // já normalizado
    if (linksRaw[0] && linksRaw[0].blocks && linksRaw[0].title) {
      const normalized = linksRaw.map((u) => {
        const slug = norm(u.key || u.slug || u.coursesKey || "");
        const theme = normalizeTheme(u.theme || slug);
        const coursesKey = CONFIG.COURSE_KEY_ALIAS[slug] || slug;
        return {
          key: slug,
          coursesKey,
          title: u.title,
          theme,
          blocks: u.blocks || {},
        };
      });
      return normalized;
    }

    // formato cru: { slug, titulo, modalidades:[{titulo, links:[...]}] }
    const normalized = linksRaw.map((u) => {
      const slug = norm(u.slug || u.key || "");
      const theme = normalizeTheme(slug);
      const coursesKey = CONFIG.COURSE_KEY_ALIAS[slug] || slug;
      const title = u.titulo || u.title || slug.toUpperCase();

      const buckets = Object.fromEntries(CONFIG.LINK_BLOCKS_ORDER.map((b) => [b.key, []]));
      const grupos = Array.isArray(u.modalidades) ? u.modalidades : [];

      for (const g of grupos) {
        const links = Array.isArray(g.links) ? g.links : [];
        for (const ln of links) {
          const modality = String(ln.modalidade || "").trim();
          const key = mapLinkModalityToKey(modality, g.titulo);
          if (!key) continue;

          buckets[key].push({
            code: String(ln.codigo ?? ""),
            type: String(ln.tipo ?? ""),
            modality,
            href: String(ln.href || ""),
          });
        }
      }

      const blocks = {};
      for (const { key, label } of CONFIG.LINK_BLOCKS_ORDER) {
        blocks[key] = { title: label, links: pickVestMatPair(buckets[key]) };
      }

      return { key: slug, coursesKey, title, theme, blocks };
    });

    return normalized;
  };

  const normalizeTheme = (slugOrTheme) => {
    const k = norm(slugOrTheme);
    if (k === "oeste") return "compensa";
    if (k === "compensa") return "compensa";
    if (k === "sede") return "sede";
    if (k === "leste") return "leste";
    if (k === "sul") return "sul";
    if (k === "norte") return "norte";
    return "sede";
  };

  const toneClassByUnitKey = (unit) => getUnitTone(unit?.coursesKey || unit?.key || unit?.title);

  const mapLinkModalityToKey = (modalidade, groupTitle = "") => {
    const m = norm(modalidade);
    const gt = norm(groupTitle);

    if (m.includes("presencial") || gt.includes("presencial")) return "presencial";
    if (m.includes("hibrid") || gt.includes("hibrid")) return "hibrido";
    if (m.includes("semi") && m.includes("flex")) return "flex";
    if (m.includes("semipresencial") || m.includes("semi")) return "semipresencial";
    if (m.includes("ead") || m.includes("online") || gt.includes("ead")) return "ead";

    return null;
  };

  // evita “dois vestibular”
  const pickVestMatPair = (arr) => {
    const list = Array.isArray(arr) ? arr.slice() : [];
    if (!list.length) return [];

    const isVest = (x) => norm(x.type).includes("vestibular");
    const isMat = (x) => norm(x.type).includes("matric");

    const v = list.find(isVest);
    const m = list.find(isMat);

    if (v && m) return [v, m];
    return list.slice(0, 2);
  };

  // -----------------------------
  // Render: Units + link blocks
  // -----------------------------
  const renderApp = ({ units }) => {
  const root = document.getElementById(CONFIG.ROOT_ID);
  root.textContent = "";

  const frag = document.createDocumentFragment();
  for (const unit of units) frag.appendChild(renderUnit(unit));
  root.appendChild(frag);
};


  const renderUnit = (unit) => {
    const toneClass = toneClassByUnitKey(unit);
    const unitCard = el("section", {
      class: "unit",
      id: `unit-${unit.coursesKey}`,
      "data-unit-key": unit.coursesKey,
    });

    applyUnitTheme(unitCard, toneClass);
    const head = el("div", { class: "unit-head" }, [
      el("h2", { class: "unit-title", text: unit.title }),
      el(
        "button",
        {
          class: "btn btn-courses",
          type: "button",
          "data-action": "open-courses",
          "data-unit": unit.coursesKey,
          "data-title": unit.title,
          "data-theme": toneClass,
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

  const formatModalityTitle = (title) => {
    const t = norm(title);
    if (t.includes("presencial") && !t.includes("semi") && !t.includes("hibrid")) return "Presencial";
    if (t.includes("hibrid")) return "Híbrido";
    if (t.includes("semipresencial") || (t.includes("semi") && !t.includes("flex"))) return "Semipresencial";
    if (t.includes("flex")) return "Flex";
    if (t.includes("ead") || t.includes("online")) return "100% EAD";
    return title;
  };

  const renderLinkBlock = (block, fallbackTitle) => {
    const wrap = el("div", { class: "mod-block" });
    wrap.appendChild(el("h3", { class: "mod-title", text: formatModalityTitle(block.title || fallbackTitle) }));

    const content = el("div", { class: "mod-content" });
    const links = Array.isArray(block.links) ? block.links : [];

    if (links.length < 2) {
      content.appendChild(el("div", { class: "empty", text: CONFIG.EMPTY_TEXT }));
      wrap.appendChild(content);
      return wrap;
    }

    const grid = el("div", { class: "link-grid" });
    for (const ln of links.slice(0, 2)) grid.appendChild(renderLinkCard(ln));
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
      a.classList.add("is-disabled");
    }

    return a;
  };

  // -----------------------------
  // Index (course search) — feito 1x
  // -----------------------------
  const buildCourseIndex = (courses, units) => {
    const unitMeta = new Map(
      units.map((u) => [
        u.coursesKey,
        { title: u.title, toneClass: toneClassByUnitKey(u) },
      ])
    );

    const availability = new Map(); // courseId -> Map(unitKey -> Set(modKey))

    for (const [unitKey, offerByMod] of Object.entries(courses.offers || {})) {
      for (const modKey of ["presencial", "hibrido", "semipresencial", "ead"]) {
        const list = offerByMod?.[modKey];
        if (!Array.isArray(list)) continue;

        for (const item of list) {
          const courseId = item.id;
          if (!courseId) continue;

          if (!availability.has(courseId)) availability.set(courseId, new Map());
          const byUnit = availability.get(courseId);

          if (!byUnit.has(unitKey)) byUnit.set(unitKey, new Set());
          byUnit.get(unitKey).add(modKey);
        }
      }
    }

    const searchable = Object.entries(courses.catalog || {}).map(([id, c]) => ({
      id,
      name: c.name || id,
      nameNorm: norm(c.name || id),
    }));

    return { unitMeta, availability, searchable };
  };

  const buildPriceIndex = (coursePrices) => {
    if (!coursePrices || !Array.isArray(coursePrices.items)) return new Map();
    const map = new Map();
    for (const item of coursePrices.items) {
      const k = `${item.courseId || ""}|${item.unitKey || ""}|${item.modalityKey || ""}`;
      if (!k.startsWith("||")) map.set(k, item);
    }
    return map;
  };

  const getPrice = (priceIndex, courseId, unitKey, modalityKey) => {
    if (!priceIndex || !priceIndex.size) return null;
    const k = `${courseId || ""}|${unitKey || ""}|${modalityKey || ""}`;
    return priceIndex.get(k) || null;
  };

  // -----------------------------
  // Modal: cursos por unidade (DOM estável)
  // -----------------------------
  const unitModal = (() => {
    let overlay, titleEl, tabsEl, bodyEl, inputEl, chipsEl, metaEl, gridEl, emptyEl;
    let lastFocus = null;

    const state = {
      isOpen: false,
      unitKey: "",
      unitTitle: "",
      themeClass: "blue",
      tab: "presencial",
      query: "",
      turno: "Todos",
      list: [],
    };

    const ensure = () => {
      if (overlay) return overlay;

      overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });
      applyUnitTheme(overlay, "blue");
      const dialog = el("div", { class: "modal" });

      const head = el("div", { class: "modal-head" }, [
        (titleEl = el("div", { class: "modal-title" })),
        el("button", { class: "modal-close", type: "button", "data-action": "close-unit-modal", "aria-label": "Fechar" }, [
          el("span", { text: "×" }),
        ]),
      ]);

      tabsEl = el("div", { class: "modal-tabs" });

      bodyEl = el("div", { class: "modal-body" });

      // search row fixo (não recria!)
      const searchRow = el("div", { class: "search-row" });
      inputEl = el("input", {
        class: "search-input",
        type: "search",
        placeholder: "Pesquisar curso...",
      });

      const debouncedUnitSearch = debounce(() => {
        state.query = inputEl.value || "";
        updateCoursesView();
      }, 150);
      inputEl.addEventListener("input", debouncedUnitSearch);

      chipsEl = el("div", { class: "chips" });

      searchRow.appendChild(inputEl);
      searchRow.appendChild(chipsEl);

      metaEl = el("div", { class: "meta" });
      gridEl = el("div", { class: "course-grid" });
      emptyEl = el("div", { class: "empty" });

      bodyEl.appendChild(searchRow);
      bodyEl.appendChild(metaEl);
      bodyEl.appendChild(gridEl);
      bodyEl.appendChild(emptyEl);

      dialog.appendChild(head);
      dialog.appendChild(tabsEl);
      dialog.appendChild(bodyEl);
      overlay.appendChild(dialog);

      // eventos (delegação)
      overlay.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) {
          if (e.target === overlay) close();
          return;
        }

        const action = btn.dataset.action;

        if (action === "close-unit-modal") close();

        if (action === "set-tab") {
          state.tab = btn.dataset.tab || "presencial";
          state.query = "";
          state.turno = "Todos";
          inputEl.value = "";
          syncTabs();
          loadUnitList();
          updateChips();
          updateCoursesView();
          requestAnimationFrame(() => {
           bodyEl.scrollTop = 0;
}); 

        }

        if (action === "set-turno") {
          state.turno = btn.dataset.turno || "Todos";
          updateChipsActive();
          updateCoursesView();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (!state.isOpen) return;
        if (e.key === "Escape") close();
      });

      document.body.appendChild(overlay);
      return overlay;
    };

    const open = ({ unitKey, unitTitle, theme }) => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      ensure();
      scrollLock.lock();


      state.isOpen = true;
      state.unitKey = unitKey;
      state.unitTitle = unitTitle;
      state.themeClass = theme || "blue";
      state.tab = "presencial";
      state.query = "";
      state.turno = "Todos";

      // aplica theme no overlay
      overlay.className = "modal-overlay is-open";
      applyUnitTheme(overlay, state.themeClass);

      titleEl.textContent = `Cursos disponíveis — ${state.unitTitle}`;

      renderTabs();
      syncTabs();

      inputEl.value = "";
      loadUnitList();
      updateChips();
      updateCoursesView();

      $(".modal-close", overlay)?.focus();
    };

    const close = () => {
      if (!overlay) return;
      state.isOpen = false;
      overlay.classList.remove("is-open");
      scrollLock.unlock(); 
      if (lastFocus) lastFocus.focus();
    };

    const renderTabs = () => {
      tabsEl.textContent = "";
      for (const t of CONFIG.COURSE_TABS) {
        tabsEl.appendChild(
          el(
            "button",
            {
              class: "tab",
              type: "button",
              "data-action": "set-tab",
              "data-tab": t.key,
            },
            [el("span", { text: t.label })]
          )
        );
      }
    };

    const syncTabs = () => {
      for (const btn of tabsEl.querySelectorAll(".tab")) {
        const is = btn.dataset.tab === state.tab;
        btn.classList.toggle("is-active", is);
      }
    };

    const loadUnitList = () => {
      const { courses } = getDataOrThrow();
      const list = courses.offers?.[state.unitKey]?.[state.tab] || [];
      state.list = Array.isArray(list) ? list.slice() : [];
    };

    const updateChips = () => {
      const show = state.tab === "presencial" || state.tab === "hibrido";
      chipsEl.textContent = "";

      if (!show) return;

      const allTurnos = uniq(state.list.flatMap((x) => x.turnos || []))
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

      const chips = ["Todos", ...allTurnos];

      for (const c of chips) {
        chipsEl.appendChild(
          el(
            "button",
            {
              class: `chip${c === state.turno ? " is-active" : ""}`,
              type: "button",
              "data-action": "set-turno",
              "data-turno": c,
            },
            [el("span", { text: c })]
          )
        );
      }
    };

    const updateChipsActive = () => {
      for (const btn of chipsEl.querySelectorAll(".chip")) {
        btn.classList.toggle("is-active", btn.dataset.turno === state.turno);
      }
    };

    const updateCoursesView = () => {
      const { courses } = getDataOrThrow();

      // empty state por modalidade/unidade
      if (!state.list.length) {
        metaEl.textContent = "";
        gridEl.textContent = "";
        emptyEl.style.display = "block";
        emptyEl.textContent = CONFIG.EMPTY_TEXT;
        return;
      }

      emptyEl.style.display = "none";

      const q = norm(state.query);
      const filtered = state.list
        .filter((x) => {
          const name = courses.catalog?.[x.id]?.name || x.id;
          if (q && !norm(name).includes(q)) return false;

          if ((state.tab === "presencial" || state.tab === "hibrido") && state.turno !== "Todos") {
            return (x.turnos || []).includes(state.turno);
          }
          return true;
        })
        .sort((a, b) => {
          const an = courses.catalog?.[a.id]?.name || a.id;
          const bn = courses.catalog?.[b.id]?.name || b.id;
          return an.localeCompare(bn, "pt-BR");
        });

      metaEl.textContent = `${filtered.length} curso(s) encontrado(s)`;
      gridEl.textContent = "";

      for (const item of filtered) {
        const name = courses.catalog?.[item.id]?.name || item.id;

        const card = el("div", { class: "course" }, [
          el("div", { class: "course-name", text: name }),
          el("div", { class: "course-price", "data-slot": "price" }),
        ]);

        const priceData = getPrice(window.__PRICE_INDEX__, item.id, state.unitKey, state.tab);
        if (priceData && Number.isFinite(Number(priceData.price))) {
          const slot = card.querySelector('[data-slot="price"]');
          if (slot) slot.textContent = `Mensalidade: ${Number(priceData.price).toLocaleString('pt-BR', { style: 'currency', currency: (window.COURSE_PRICES?.currency || 'BRL') })}`;
        }

        const badges = el("div", { class: "badges" });
        for (const t of item.turnos || []) badges.appendChild(el("span", { class: "badge", text: t }));
        card.appendChild(badges);

        gridEl.appendChild(card);
      }
    };

    return { open, close };
  })();

  // -----------------------------
  // Modal: pesquisar cursos (todas unidades) — DOM estável
  // -----------------------------
const globalModal = (() => {
  let overlay, inputEl, resultsEl;
  let index = null;
  let lastFocus = null;
  let isOpen = false;

  const ensure = () => {
    if (overlay) return overlay;

    overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });
      applyUnitTheme(overlay, "blue");
    const dialog = el("div", { class: "modal" });

    const head = el("div", { class: "modal-head" }, [
      el("div", { class: "modal-title", text: "Pesquisar Cursos (todas as unidades)" }),
      el("button", { class: "modal-close", type: "button", "data-action": "close-global-modal", "aria-label": "Fechar" }, [
        el("span", { text: "×" }),
      ]),
    ]);

    const body = el("div", { class: "modal-body" });

    const searchRow = el("div", { class: "search-row" });
    inputEl = el("input", {
      class: "search-input",
      type: "search",
      placeholder: "Digite o nome do curso...",
    });
    inputEl.addEventListener("input", debounce(updateResults, 150));

    searchRow.appendChild(inputEl);

    resultsEl = el("div", { class: "results" });

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
        requestAnimationFrame(() => scrollToUnit(unitKey));
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
    resultsEl.textContent = "";
    resultsEl.appendChild(
      el("div", { class: "empty", text: "Digite um curso para ver em quais unidades ele está disponível." })
    );

    inputEl.focus();
  };

  const close = () => {
    if (!overlay || !isOpen) return;
    isOpen = false;

    overlay.classList.remove("is-open");
    scrollLock.unlock();

    if (lastFocus) lastFocus.focus();
  };

  const updateResults = () => {
    if (!index) return;

    const q = norm(inputEl.value);
    resultsEl.textContent = "";

    if (!q) {
      resultsEl.appendChild(el("div", { class: "empty", text: "Digite um curso para ver em quais unidades ele está disponível." }));
      return;
    }

    const hits = index.searchable
      .filter((c) => c.nameNorm.includes(q))
      .slice(0, CONFIG.GLOBAL_LIMIT);

    if (!hits.length) {
      resultsEl.appendChild(el("div", { class: "empty", text: "Nenhum curso encontrado." }));
      return;
    }

    for (const course of hits) {
      const card = el("div", { class: "result-card" });
      card.appendChild(el("div", { class: "result-course", text: course.name }));

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
        const meta = index.unitMeta.get(u.unitKey) || { title: u.unitKey.toUpperCase(), toneClass: "blue" };

        const row = el("div", { class: "result-row" });
        applyUnitTheme(row, meta.toneClass || "blue");

        const left = el("div", { class: "result-left" });
        left.appendChild(el("div", { class: "result-unit", text: `Unidade ${meta.title}` }));

        const tags = el("div", { class: "result-tags" });
        for (const mk of u.mods) tags.appendChild(el("span", { class: "tag", text: modalityLabel(mk) }));
        left.appendChild(tags);

        const btn = el(
          "button",
          {
            class: "btn-unit",
            type: "button",
            "data-action": "goto-unit",
            "data-unit-key": u.unitKey,
          },
          [el("span", { text: "Ver na unidade" })]
        );

        row.appendChild(left);
        row.appendChild(btn);
        card.appendChild(row);
      }

      resultsEl.appendChild(card);
    }
  };

  const modalityLabel = (key) => {
    const t = CONFIG.COURSE_TABS.find((x) => x.key === key);
    return t ? t.label : key;
  };

  return { open, close };
})();

  // -----------------------------
  // Prices data loader (1x)
  // -----------------------------
  let pricesDataPromise = null;

  const loadPricesOnce = async () => {
    if (!pricesDataPromise) {
      pricesDataPromise = fetch(CONFIG.PRICES_DATA_PATH, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Falha ao carregar tabela de preços");
          return res.json();
        })
        .then((payload) => ({
          ...payload,
          records: Array.isArray(payload?.records) ? payload.records : [],
        }));
    }
    return pricesDataPromise;
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
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

  const pricesModal = (() => {
    let overlay, titleEl, inputEl, unitSelectEl, modChipsEl, planChipsEl, listEl, emptyEl;
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
      const source = state.data?.records || [];
      const scoped = source.filter((r) =>
        r.modalityKey === state.modalityKey &&
        r.planKey === state.planKey &&
        (r.unitKey === state.unitKey || r.unitKey === "__all__")
      );

      const byCourse = new Map();
      for (const rec of scoped) {
        const current = byCourse.get(rec.courseId);
        if (!current) {
          byCourse.set(rec.courseId, rec);
          continue;
        }
        if (current.unitKey === "__all__" && rec.unitKey === state.unitKey) {
          byCourse.set(rec.courseId, rec);
        }
      }

      const q = norm(state.query);
      return Array.from(byCourse.values())
        .filter((r) => !q || norm(r.courseName).includes(q) || norm(r.courseId).includes(q))
        .sort((a, b) => String(a.courseName || "").localeCompare(String(b.courseName || ""), "pt-BR"));
    };

    const buildCopyMessage = (rec) => {
      const modalityLabel = PRICE_MODALITY_OPTIONS.find((m) => m.key === rec.modalityKey)?.label || rec.modalityKey;
      const planLabel = PRICE_PLAN_OPTIONS.find((p) => p.key === rec.planKey)?.label || rec.planKey;
      const p10 = rec.bolsaPontualidadeCents?.p10;

      return [
        `🎓 ${rec.courseName} — ${modalityLabel} (${planLabel})`,
        `Curso de ${rec.courseName} – Modalidade ${modalityLabel} (${state.unitLabel})`,
        `Valor integral: ${formatCents(rec.integralCents)}`,
        `Com bolsa de estudos: ${formatCents(rec.bolsaCents)} (mensalidade)`,
        `Valor com 10% de desconto pontualidade: ${formatCents(p10)}`,
      ].join("\n");
    };

    const renderModalityChips = () => {
      modChipsEl.textContent = "";
      for (const item of PRICE_MODALITY_OPTIONS) {
        modChipsEl.appendChild(el("button", {
          class: `chip${item.key === state.modalityKey ? " is-active" : ""}`,
          type: "button",
          "data-action": "set-price-modality",
          "data-key": item.key,
          text: item.label,
        }));
      }
    };

    const renderPlanChips = () => {
      planChipsEl.textContent = "";
      for (const item of PRICE_PLAN_OPTIONS) {
        planChipsEl.appendChild(el("button", {
          class: `chip${item.key === state.planKey ? " is-active" : ""}`,
          type: "button",
          "data-action": "set-price-plan",
          "data-key": item.key,
          text: item.label,
        }));
      }
    };

    const renderList = () => {
      listEl.textContent = "";
      const records = filteredRecords();
      state.recordsView = records;

      if (!records.length) {
        emptyEl.style.display = "block";
        emptyEl.textContent = "Nenhum preço encontrado";
        return;
      }

      emptyEl.style.display = "none";

      for (const rec of records) {
        const p10 = rec.bolsaPontualidadeCents?.p10;
        if (!Number.isFinite(Number(rec.integralCents)) || !Number.isFinite(Number(rec.bolsaCents)) || !Number.isFinite(Number(p10))) continue;

        const card = el("article", { class: "price-card" });
        card.appendChild(el("h4", { class: "price-card__title", text: rec.courseName }));
        card.appendChild(el("p", { class: "price-line", text: `Integral: ${formatCents(rec.integralCents)}` }));
        card.appendChild(el("p", { class: "price-line", text: `Com bolsa: ${formatCents(rec.bolsaCents)} (mensalidade)` }));
        card.appendChild(el("p", { class: "price-line", text: `Com pontualidade: ${formatCents(p10)}` }));

        const copyBtn = el("button", {
          class: "btn btn--accent price-copy-btn",
          type: "button",
          "data-action": "copy-price-msg",
          "data-course-id": rec.courseId,
          text: "Copiar mensagem",
        });

        card.appendChild(copyBtn);
        listEl.appendChild(card);
      }
    };

    const ensure = () => {
      if (overlay) return overlay;

      overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });
      applyUnitTheme(overlay, "blue");
      const dialog = el("div", { class: "modal prices-modal" });

      const head = el("div", { class: "modal-head" }, [
        (titleEl = el("div", { class: "modal-title" })),
        el("button", { class: "modal-close", type: "button", "data-action": "close-prices-modal", "aria-label": "Fechar" }, [
          el("span", { text: "×" }),
        ]),
      ]);

      const body = el("div", { class: "modal-body" });
      inputEl = el("input", { class: "search-input", type: "search", placeholder: "Pesquisar curso..." });
      inputEl.addEventListener("input", debounce(() => {
        state.query = inputEl.value || "";
        renderList();
      }, 150));

      const unitRow = el("div", { class: "prices-filter-row" }, [
        el("label", { class: "field" }, [
          el("span", { text: "Unidade" }),
          (unitSelectEl = el("select", { "aria-label": "Filtrar unidade" })),
        ]),
      ]);

      const modWrap = el("div", { class: "prices-filter-row" }, [
        el("strong", { class: "prices-filter-title", text: "Modalidade" }),
        (modChipsEl = el("div", { class: "chips" })),
      ]);

      const planWrap = el("div", { class: "prices-filter-row" }, [
        el("strong", { class: "prices-filter-title", text: "Ingresso/Plano" }),
        (planChipsEl = el("div", { class: "chips" })),
      ]);

      listEl = el("div", { class: "prices-list" });
      emptyEl = el("div", { class: "empty" });

      body.appendChild(inputEl);
      body.appendChild(unitRow);
      body.appendChild(modWrap);
      body.appendChild(planWrap);
      body.appendChild(listEl);
      body.appendChild(emptyEl);

      dialog.appendChild(head);
      dialog.appendChild(body);
      overlay.appendChild(dialog);

      overlay.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) {
          if (e.target === overlay) close();
          return;
        }

        const action = btn.dataset.action;
        if (action === "close-prices-modal") {
          close();
          return;
        }
        if (action === "set-price-modality") {
          state.modalityKey = btn.dataset.key || state.modalityKey;
          renderModalityChips();
          renderList();
          return;
        }
        if (action === "set-price-plan") {
          state.planKey = btn.dataset.key || state.planKey;
          renderPlanChips();
          renderList();
          return;
        }
        if (action === "copy-price-msg") {
          const rec = state.recordsView.find((r) => r.courseId === btn.dataset.courseId);
          if (!rec) return;
          const copied = await copyText(buildCopyMessage(rec));
          if (copied) {
            const old = btn.textContent;
            btn.textContent = "Copiado!";
            setTimeout(() => (btn.textContent = old), 1000);
          }
        }
      });

      unitSelectEl.addEventListener("change", () => {
        state.unitKey = unitSelectEl.value;
        state.unitLabel = PRICE_UNIT_OPTIONS.find((u) => u.key === state.unitKey)?.label || "Manaus";
        titleEl.textContent = `Preços disponíveis — ${state.unitLabel}`;
        renderList();
      });

      document.addEventListener("keydown", (e) => {
        if (!isOpen) return;
        if (e.key === "Escape") close();
      });

      document.body.appendChild(overlay);
      return overlay;
    };

    const open = async ({ unitKey, unitTitle, theme }) => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      ensure();
      scrollLock.lock();

      state.data = await loadPricesOnce();
      state.unitKey = resolvePriceUnitKey(unitKey);
      state.unitLabel = PRICE_UNIT_OPTIONS.find((u) => u.key === state.unitKey)?.label || "Manaus";
      state.themeClass = theme || "blue";
      state.modalityKey = "presencial";
      state.planKey = "enem_vestibular";
      state.query = "";

      overlay.className = "modal-overlay is-open";
      applyUnitTheme(overlay, state.themeClass);

      titleEl.textContent = `Preços disponíveis — ${state.unitLabel}`;

      unitSelectEl.textContent = "";
      for (const opt of PRICE_UNIT_OPTIONS) unitSelectEl.appendChild(new Option(opt.label, opt.key));
      unitSelectEl.value = state.unitKey;

      inputEl.value = "";
      renderModalityChips();
      renderPlanChips();
      renderList();
      isOpen = true;
    };

    const close = () => {
      if (!overlay || !isOpen) return;
      isOpen = false;
      overlay.classList.remove("is-open");
      scrollLock.unlock();
      if (lastFocus) lastFocus.focus();
    };

    return { open, close };
  })();


  // -----------------------------
  // Scroll to unit
  // -----------------------------
  const scrollToUnit = (unitKey) => {
  const target =
    document.getElementById(`unit-${unitKey}`) ||
    document.querySelector(`[data-unit-key="${CSS.escape(unitKey)}"]`);

  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });

  target.classList.add("unit--flash");
  setTimeout(() => target.classList.remove("unit--flash"), 900);
};


  // -----------------------------
  // Events
  // -----------------------------
  const bindEvents = (courseIndex) => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;

      if (action === "open-courses") {
        unitModal.open({
          unitKey: btn.dataset.unit,
          unitTitle: btn.dataset.title,
          theme: btn.dataset.theme,
        });
        return;
      }

      if (action === "open-prices-menu") {
        pricesModal.open({
          unitKey: "sede",
          unitTitle: "Manaus",
          theme: "blue",
        });
        return;
      }

      if (action === "open-global-search") {
        globalModal.open(courseIndex);
        return;
      }
    });
  };

  // -----------------------------
  // Diagnostics
  // -----------------------------
  const runDiagnostics = (units, courses, index) => {
    if (!CONFIG.DEBUG) return;

    console.log("[debug] units:", units.length);
    console.log("[debug] catalog:", Object.keys(courses.catalog || {}).length);
    console.log("[debug] availability indexed:", index.availability.size);

  };

  // -----------------------------
  // Init
  // -----------------------------
  const init = () => {
    try {
      const { linksRaw, courses, coursePrices } = getDataOrThrow();
      const units = normalizeLinks(linksRaw);

      window.__PRICE_INDEX__ = buildPriceIndex(coursePrices);

      // index global (1x)
      const idx = buildCourseIndex(courses, units);
      idx.unitOrder = units.map((u) => u.coursesKey);

      renderApp({ units });
      bindEvents(idx);

      const params = new URLSearchParams(location.search);
      if (params.get("openPrices") === "1") {
        pricesModal.open({ unitKey: "sede", unitTitle: "Manaus", theme: "blue" });
      }

      runDiagnostics(units, courses, idx);
    } catch (err) {
      console.error(err);
      const root = document.getElementById(CONFIG.ROOT_ID);
      if (root) {
        root.textContent = "";
        root.appendChild(el("div", { class: "empty", text:
          `Erro: ${err.message}`
        }));
      }
    }
  };

  init();
})();
