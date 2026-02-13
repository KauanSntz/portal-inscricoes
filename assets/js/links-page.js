/* assets/js/links-page.js */
(() => {
  "use strict";

  if (!location.pathname.endsWith("links.html") && location.pathname !== "/links") return;

  const CHUNK_SIZE = 120;
  const JSON_DATA_PATH = "./assets/data/portal_links_2026_1.json";
  const FIXED_HASH = "#/es/inscricoeswizard/dados-basicos";

  const TYPE_LABELS = Object.freeze({ vestibular: "Vestibular", matricula: "Matrícula", outro: "Outro" });
  const MODALITY_LABELS = Object.freeze({ ead: "100% EAD", semipresencial: "Semipresencial", flex: "Flex", outro: "Outro" });
  const MODALITY_ORDER = Object.freeze({ ead: 0, semipresencial: 1, flex: 2, outro: 3 });
  const TYPE_ORDER = Object.freeze({ vestibular: 0, matricula: 1, outro: 2 });

  const state = {
    records: [],
    filtered: [],
    renderCount: CHUNK_SIZE,
    sourceLabel: "",
    qa: null,
    filters: { query: "", unit: "all", modality: "all", type: "all" },
  };

  const dom = {
    groups: document.getElementById("links-groups"),
    meta: document.getElementById("links-meta"),
    empty: document.getElementById("links-empty"),
    loadMore: document.getElementById("links-load-more"),
    query: document.getElementById("filter-query"),
    unit: document.getElementById("filter-unit"),
    modality: document.getElementById("filter-modality"),
    type: document.getElementById("filter-type"),
    qaList: document.getElementById("qa-list"),
  };

  const norm = (v) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const normalizeWizardUrl = (href) => {
    try {
      const parsed = new URL(String(href), location.href);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      return `${parsed.origin}${parsed.pathname}${parsed.search}${FIXED_HASH}`;
    } catch {
      return null;
    }
  };

  const normalizeUnitName = (rawName) => {
    let name = norm(rawName)
      .replace(/[—–]/g, "-")
      .replace(/\b2026\/1\b/gi, "")
      .replace(/\s*-\s*$/g, "")
      .trim();

    // remove sufixos de modalidade no final
    const suffixes = [
      /\s*100%\s*ead\s*$/i,
      /\s*ead\s*$/i,
      /\s*semipresencial\s*$/i,
      /\s*semi[-\s]?flex\s*$/i,
      /\s*flex\s*$/i,
    ];

    for (const rgx of suffixes) name = name.replace(rgx, "").trim();

    return name
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  };

  const parseTypeKey = (title) => {
    const t = norm(title);
    if (t.includes("vestibular")) return "vestibular";
    if (t.includes("matricula")) return "matricula";
    return "outro";
  };

  const parseModalityKey = (title) => {
    const t = norm(title);
    if (t.includes("100% ead") || t.includes(" ead")) return "ead";
    if (t.includes("semi-flex") || t.includes("semi flex") || t.includes(" flex")) return "flex";
    if (t.includes("semipresencial")) return "semipresencial";
    return "outro";
  };

  const codeFromTitle = (title, fallback = "") => {
    const m = String(title || "").match(/^\s*(\d+)/);
    return String(m?.[1] || fallback || "").trim();
  };

  const unitFromTitle = (title) => {
    const clean = String(title || "").replace(/^\s*\d+\s*/, "");
    const parts = clean.split(" - ").map((x) => x.trim()).filter(Boolean);
    const candidate = parts[1] || "";
    return normalizeUnitName(candidate);
  };

  const processTitleFromTitle = (title, code) =>
    String(title || "")
      .replace(new RegExp(`^\\s*${code}\\s*`), "")
      .trim();

  const normalizeLinksData = (rawItems) => {
    const normalized = rawItems.map((item) => {
      const title = String(item.title || "");
      const code = codeFromTitle(title, item.code || item.ps || "");
      const typeKey = parseTypeKey(title || item.type || "");
      const modalityKey = parseModalityKey(title || item.modality || "");
      const unitCanonical = normalizeUnitName(item.unitHint || unitFromTitle(title));

      const processTitle = title
        ? processTitleFromTitle(title, code)
        : `${TYPE_LABELS[typeKey].toUpperCase()} - ${unitCanonical} ${MODALITY_LABELS[modalityKey].toUpperCase()} - 2026/1`;

      const url = normalizeWizardUrl(item.url || item.href || "");
      const dataWarning = !norm(processTitle).includes(norm(unitCanonical));

      if (dataWarning) {
        console.warn(`[WARN] unidade divergente expected=${unitCanonical} got=${processTitle} code=${code}`);
      }

      return {
        unitKey: norm(unitCanonical),
        unitCanonical,
        code,
        typeKey,
        typeLabel: TYPE_LABELS[typeKey] || TYPE_LABELS.outro,
        modalityKey,
        modalityLabel: MODALITY_LABELS[modalityKey] || MODALITY_LABELS.outro,
        processTitle,
        url,
        rawUrl: String(item.url || item.href || ""),
        dataWarning,
        searchable: norm([unitCanonical, processTitle, item.sheetName || "", item.url || item.href || ""].join(" ")),
      };
    });

    const seen = new Set();
    const unique = [];
    for (const rec of normalized) {
      const key = [rec.unitKey, rec.code, rec.typeKey, rec.modalityKey, rec.url].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(rec);
    }

    return unique.sort((a, b) =>
      a.unitCanonical.localeCompare(b.unitCanonical, "pt-BR") ||
      (MODALITY_ORDER[a.modalityKey] ?? 9) - (MODALITY_ORDER[b.modalityKey] ?? 9) ||
      (TYPE_ORDER[a.typeKey] ?? 9) - (TYPE_ORDER[b.typeKey] ?? 9) ||
      a.code.localeCompare(b.code, "pt-BR")
    );
  };

  const fromDataJson = (payload) => {
    const raw = [];
    for (const sheet of payload?.sheets || []) {
      for (const entry of sheet.entries || []) {
        if (entry.type !== "link") continue;
        raw.push({ title: entry.title, url: entry.url, ps: entry.params?.ps, sheetName: sheet.name });
      }
    }
    return normalizeLinksData(raw);
  };

  const fromPortalLinks = (units) => {
    const raw = [];
    for (const unit of Array.isArray(units) ? units : []) {
      const unitHint = normalizeUnitName(unit.title || unit.key || unit.coursesKey || "");
      for (const [blockKey, block] of Object.entries(unit.blocks || {})) {
        for (const ln of block.links || []) {
          const type = TYPE_LABELS[parseTypeKey(ln.type)] || "Processo";
          const modality = MODALITY_LABELS[parseModalityKey(`${ln.modality || ""} ${blockKey}`)] || "Outro";
          const title = `${ln.code || ""} ${String(ln.type || type).toUpperCase()} - ${unitHint} ${String(modality).toUpperCase()} - 2026/1`;
          raw.push({ title, href: ln.href, code: ln.code, unitHint });
        }
      }
    }
    return normalizeLinksData(raw);
  };

  const buildQA = (records) => ({
    total: records.length,
    invalidUrls: records.filter((x) => !x.url || !x.url.endsWith(FIXED_HASH)).length,
    emptyCodes: records.filter((x) => !x.code).length,
    warnings: records.filter((x) => x.dataWarning).length,
  });

  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  const buildOptions = (select, values, labels) => {
    select.textContent = "";
    select.appendChild(new Option("Todos", "all"));
    for (const value of values) select.appendChild(new Option(labels[value] || value, value));
  };

  const createBadge = (text, kind) => {
    const span = document.createElement("span");
    span.className = `badge-chip badge-chip--${kind}`;
    span.textContent = text;
    return span;
  };

  const renderGroups = () => {
    dom.groups.textContent = "";
    const visible = state.filtered.slice(0, state.renderCount);

    const byUnit = new Map();
    for (const rec of visible) {
      if (!byUnit.has(rec.unitKey)) byUnit.set(rec.unitKey, { unitCanonical: rec.unitCanonical, items: [] });
      byUnit.get(rec.unitKey).items.push(rec);
    }

    const units = Array.from(byUnit.values()).sort((a, b) => a.unitCanonical.localeCompare(b.unitCanonical, "pt-BR"));
    const frag = document.createDocumentFragment();

    units.forEach((group, idx) => {
      const card = document.createElement("article");
      card.className = `unit-group ${idx % 2 === 0 ? "unit-group--blue" : "unit-group--red"}`;

      const h2 = document.createElement("h2");
      h2.className = "unit-group__title";
      h2.textContent = group.unitCanonical;
      card.appendChild(h2);

      const listWrap = document.createElement("div");
      listWrap.className = "unit-group__list";

      const byModality = new Map();
      for (const rec of group.items) {
        if (!byModality.has(rec.modalityKey)) byModality.set(rec.modalityKey, []);
        byModality.get(rec.modalityKey).push(rec);
      }

      const modalityKeys = Array.from(byModality.keys()).sort((a, b) => (MODALITY_ORDER[a] ?? 9) - (MODALITY_ORDER[b] ?? 9));

      for (const mKey of modalityKeys) {
        const section = document.createElement("section");
        section.className = "modality-group";

        const h3 = document.createElement("h3");
        h3.className = "modality-group__title";
        h3.textContent = MODALITY_LABELS[mKey] || MODALITY_LABELS.outro;
        section.appendChild(h3);

        const rows = byModality.get(mKey)
          .slice()
          .sort((a, b) => (TYPE_ORDER[a.typeKey] ?? 9) - (TYPE_ORDER[b.typeKey] ?? 9) || a.code.localeCompare(b.code, "pt-BR"));

        for (const rec of rows) {
          const row = document.createElement("div");
          row.className = "unit-row";
          if (rec.dataWarning) row.dataset.warning = "true";

          const link = document.createElement(rec.url ? "a" : "div");
          link.className = "process-link-title";
          if (rec.url) {
            link.href = rec.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }

          const code = document.createElement("span");
          code.className = "process-code";
          code.textContent = rec.code || "—";

          const text = document.createElement("span");
          text.className = "process-text";
          text.textContent = rec.processTitle;

          const meta = document.createElement("div");
          meta.className = "unit-row__meta";
          meta.appendChild(createBadge(rec.modalityLabel, rec.typeKey === "matricula" ? "modality-matricula" : "modality-vestibular"));
          meta.appendChild(createBadge(rec.typeLabel, rec.typeKey === "matricula" ? "matricula" : "vestibular"));

          link.appendChild(code);
          link.appendChild(text);
          row.appendChild(link);
          row.appendChild(meta);
          section.appendChild(row);
        }

        listWrap.appendChild(section);
      }

      card.appendChild(listWrap);
      frag.appendChild(card);
    });

    dom.groups.appendChild(frag);
    dom.empty.hidden = state.filtered.length > 0;
    dom.loadMore.hidden = state.filtered.length <= state.renderCount;
  };

  const renderMeta = () => {
    dom.meta.textContent = `${state.filtered.length} de ${state.records.length} links exibidos. Fonte: ${state.sourceLabel}.`;
  };

  const renderQA = () => {
    dom.qaList.innerHTML = `
      <li>Total de links normalizados: <strong>${state.qa.total}</strong></li>
      <li>Links fora do padrão wizard: <strong>${state.qa.invalidUrls}</strong></li>
      <li>Códigos vazios: <strong>${state.qa.emptyCodes}</strong></li>
      <li>Divergências unidade ↔ título: <strong>${state.qa.warnings}</strong></li>
    `;
  };

  const applyFilters = () => {
    const q = norm(state.filters.query);
    state.filtered = state.records.filter((r) => {
      if (state.filters.unit !== "all" && r.unitKey !== state.filters.unit) return false;
      if (state.filters.modality !== "all" && r.modalityKey !== state.filters.modality) return false;
      if (state.filters.type !== "all" && r.typeKey !== state.filters.type) return false;
      if (q && !r.searchable.includes(q)) return false;
      return true;
    });

    state.renderCount = CHUNK_SIZE;
    renderGroups();
    renderMeta();
  };

  const toCSV = (rows) => {
    const head = ["unidade", "modalidade", "ingresso", "codigo", "titulo", "url"];
    const lines = rows.map((r) => [r.unitCanonical, r.modalityLabel, r.typeLabel, r.code, r.processTitle, r.url || r.rawUrl]);
    return [head, ...lines].map((line) => line.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(state.filtered)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `portal-links-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const bindEvents = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      if (btn.dataset.action === "load-more") {
        state.renderCount += CHUNK_SIZE;
        renderGroups();
      }
      if (btn.dataset.action === "reset-filters") {
        state.filters = { query: "", unit: "all", modality: "all", type: "all" };
        dom.query.value = "";
        dom.unit.value = "all";
        dom.modality.value = "all";
        dom.type.value = "all";
        applyFilters();
      }
      if (btn.dataset.action === "export-csv") exportCSV();
    });

    dom.query.addEventListener("input", debounce(() => {
      state.filters.query = dom.query.value;
      applyFilters();
    }, 150));

    dom.unit.addEventListener("change", () => {
      state.filters.unit = dom.unit.value;
      applyFilters();
    });
    dom.modality.addEventListener("change", () => {
      state.filters.modality = dom.modality.value;
      applyFilters();
    });
    dom.type.addEventListener("change", () => {
      state.filters.type = dom.type.value;
      applyFilters();
    });
  };

  const loadRecords = async () => {
    const fallback = fromPortalLinks(window.PORTAL_LINKS);

    try {
      const res = await fetch(JSON_DATA_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("json fail");
      const payload = await res.json();
      const fromJson = fromDataJson(payload);
      if (fromJson.length) {
        state.sourceLabel = `JSON bruto (${fromJson.length} registros)`;
        return fromJson;
      }
    } catch {
      // fallback
    }

    state.sourceLabel = `links-data.js (${fallback.length} registros)`;
    return fallback;
  };

  const init = async () => {
    state.records = await loadRecords();
    state.qa = buildQA(state.records);

    const unitMap = Object.fromEntries(state.records.map((r) => [r.unitKey, r.unitCanonical]));
    buildOptions(dom.unit, [...new Set(state.records.map((r) => r.unitKey))], unitMap);
    buildOptions(dom.modality, [...new Set(state.records.map((r) => r.modalityKey))], MODALITY_LABELS);
    buildOptions(dom.type, [...new Set(state.records.map((r) => r.typeKey))], TYPE_LABELS);

    bindEvents();
    applyFilters();
    renderQA();
  };

  init();
})();
