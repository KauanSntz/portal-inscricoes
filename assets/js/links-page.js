/* assets/js/links-page.js */
(() => {
  "use strict";

  if (!location.pathname.endsWith("links.html") && location.pathname !== "/links") return;

  const CHUNK_SIZE = 120;
  const JSON_DATA_PATH = "./assets/data/portal_links_2026_1.json";
  const TYPE_LABELS = {
    vestibular: "Vestibular",
    matricula: "Matrícula",
    outro: "Outro",
  };

  const UNIT_ALIAS = {
    oeste: "compensa",
    compensa: "compensa",
    "oeste compensa": "compensa",
    "oeste - compensa": "compensa",
  };

  const MODALITY_LABELS = {
    presencial: "Presencial",
    hibrido: "Híbrido",
    semipresencial: "Semipresencial",
    flex: "Flex",
    ead: "EAD",
    outro: "Outro",
  };

  const state = {
    records: [],
    filtered: [],
    renderCount: CHUNK_SIZE,
    qa: null,
    sourceLabel: "",
    filters: {
      query: "",
      unit: "all",
      modality: "all",
      type: "all",
    },
  };

  const dom = {
    groups: document.getElementById("links-groups"),
    meta: document.getElementById("links-meta"),
    empty: document.getElementById("links-empty"),
    loadMore: document.getElementById("links-load-more"),
    unit: document.getElementById("filter-unit"),
    modality: document.getElementById("filter-modality"),
    type: document.getElementById("filter-type"),
    query: document.getElementById("filter-query"),
    qaList: document.getElementById("qa-list"),
  };

  const norm = (v) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const safeUrl = (url) => {
    try {
      const parsed = new URL(String(url), location.href);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const parseType = (value) => {
    const t = norm(value);
    if (t.includes("vestib")) return "vestibular";
    if (t.includes("matric")) return "matricula";
    return "outro";
  };

  const parseModality = (value) => {
    const t = norm(value);
    if (t.includes("flex")) return "flex";
    if (t.includes("semi")) return "semipresencial";
    if (t.includes("hibrid")) return "hibrido";
    if (t.includes("ead") || t.includes("online")) return "ead";
    if (t.includes("presencial")) return "presencial";
    return "outro";
  };

  const parseUnit = (value) => {
    const key = norm(value).replace(/[—–]/g, "-").replace(/\s+/g, " ");
    return UNIT_ALIAS[key] || key;
  };

  const humanUnit = (key) => {
    const map = {
      sede: "SEDE",
      leste: "LESTE",
      sul: "SUL",
      norte: "NORTE",
      compensa: "OESTE — COMPENSA",
    };
    return map[key] || String(key || "").toUpperCase();
  };

  const removeCodePrefix = (title, code) => {
    const cleanTitle = String(title || "").trim();
    if (!code) return cleanTitle;
    return cleanTitle.replace(new RegExp(`^${code}\\s*[-–—:]?\\s*`, "i"), "").trim();
  };

  const buildFallbackTitle = ({ typeLabel, unitName, modalityLabel }) =>
    `${typeLabel} Online - ${unitName} ${modalityLabel} - 2026/1`;

  const normalizeFromPortalLinks = (units) => {
    const out = [];
    for (const unit of Array.isArray(units) ? units : []) {
      const unitKey = parseUnit(unit.coursesKey || unit.key || unit.title);
      const unitName = humanUnit(unitKey);

      for (const [blockKey, block] of Object.entries(unit.blocks || {})) {
        const links = Array.isArray(block?.links) ? block.links : [];
        for (const item of links) {
          const merged = `${item.modality || ""} ${blockKey}`;
          const url = safeUrl(item.href);
          const typeKey = parseType(item.type);
          const typeLabel = item.type || TYPE_LABELS.outro;
          const modalityKey = parseModality(merged);
          const modalityLabel = MODALITY_LABELS[modalityKey] || block.title || item.modality || "Outro";
          const code = String(item.code || "").trim();
          const processTitle = buildFallbackTitle({ typeLabel, unitName, modalityLabel });

          out.push({
            unitKey,
            unitName,
            modalityKey,
            modalityLabel,
            typeKey,
            typeLabel,
            code,
            processTitle,
            url,
            rawUrl: String(item.href || "").trim(),
            searchable: norm([unitName, processTitle, item.modality, item.type, item.code, item.href].join(" ")),
          });
        }
      }
    }
    return out;
  };

  const extractUnitFromTitle = (title) => {
    const text = norm(title);
    const known = ["sede", "leste", "sul", "norte", "oeste", "compensa"];
    for (const key of known) {
      if (text.includes(key)) return parseUnit(key);
    }
    const match = text.match(/-\s*([a-z\s]+?)\s+(100%|ead|semipresencial|hibrido|presencial)/i);
    if (match?.[1]) return parseUnit(match[1]);
    return parseUnit("outros");
  };

  const normalizeFromDataJson = (payload) => {
    const out = [];
    const sheets = Array.isArray(payload?.sheets) ? payload.sheets : [];

    for (const sheet of sheets) {
      for (const entry of Array.isArray(sheet.entries) ? sheet.entries : []) {
        if (entry.type !== "link") continue;

        const fullTitle = String(entry.title || "");
        const code = String(entry.params?.ps || fullTitle.split(" ")[0] || "").trim();
        const processTitle = removeCodePrefix(fullTitle, code);
        const typeKey = parseType(fullTitle);
        const modalityKey = parseModality(fullTitle);
        const unitKey = extractUnitFromTitle(fullTitle);
        const unitName = humanUnit(unitKey);
        const url = safeUrl(entry.url);

        out.push({
          unitKey,
          unitName,
          modalityKey,
          modalityLabel: MODALITY_LABELS[modalityKey] || MODALITY_LABELS.outro,
          typeKey,
          typeLabel: TYPE_LABELS[typeKey] || TYPE_LABELS.outro,
          code,
          processTitle,
          url,
          rawUrl: String(entry.url || "").trim(),
          searchable: norm([unitName, sheet.name, fullTitle, code, entry.url].join(" ")),
        });
      }
    }

    return out;
  };

  const dedupeAndSort = (records) => {
    const unique = [];
    const seen = new Set();

    for (const rec of records) {
      const key = [rec.unitKey, rec.modalityKey, rec.typeKey, rec.code, rec.rawUrl].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(rec);
    }

    return unique.sort((a, b) =>
      a.unitName.localeCompare(b.unitName, "pt-BR") ||
      a.processTitle.localeCompare(b.processTitle, "pt-BR") ||
      a.typeLabel.localeCompare(b.typeLabel, "pt-BR") ||
      a.code.localeCompare(b.code, "pt-BR")
    );
  };

  const buildQA = (records) => {
    const invalidUrls = records.filter((r) => !r.url).length;
    const emptyCode = records.filter((r) => !r.code).length;
    const duplicateCodes = (() => {
      const counter = new Map();
      for (const r of records) {
        const key = r.code || "<vazio>";
        counter.set(key, (counter.get(key) || 0) + 1);
      }
      return Array.from(counter.values()).filter((n) => n > 1).length;
    })();

    return { total: records.length, invalidUrls, emptyCode, duplicateCodes };
  };

  const debounce = (fn, ms) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  const buildOptions = (select, values, labels = {}) => {
    select.textContent = "";
    select.appendChild(new Option("Todos", "all"));
    for (const value of values) select.appendChild(new Option(labels[value] || value, value));
  };

  const createBadge = (text, variant) => {
    const span = document.createElement("span");
    span.className = `badge-chip badge-chip--${variant}`;
    span.textContent = text;
    return span;
  };

  const getToneClass = (unitName) => {
    const normalized = norm(unitName);
    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) hash += normalized.charCodeAt(i);
    return `unit-tone-${(hash % 8) + 1}`;
  };

  const renderRows = () => {
    dom.groups.textContent = "";
    const frag = document.createDocumentFragment();

    const visible = state.filtered.slice(0, state.renderCount);
    const grouped = new Map();

    for (const item of visible) {
      const key = item.unitName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }

    for (const [unitName, items] of grouped.entries()) {
      const card = document.createElement("article");
      card.className = `unit-group ${getToneClass(unitName)}`;

      const title = document.createElement("h2");
      title.className = "unit-group__title";
      title.textContent = unitName;
      card.appendChild(title);

      const list = document.createElement("div");
      list.className = "unit-group__list";

      for (const rec of items) {
        const row = document.createElement("div");
        row.className = "unit-row";

        const main = document.createElement("div");
        main.className = "unit-row__main";

        const titleLine = rec.url ? document.createElement("a") : document.createElement("div");
        titleLine.className = "process-link-title";
        if (rec.url) {
          titleLine.href = rec.url;
          titleLine.target = "_blank";
          titleLine.rel = "noopener noreferrer";
        }

        const code = document.createElement("span");
        code.className = "process-code";
        code.textContent = rec.code || "—";

        const label = document.createElement("span");
        label.className = "process-text";
        label.textContent = rec.processTitle;

        titleLine.appendChild(code);
        titleLine.appendChild(label);

        const meta = document.createElement("div");
        meta.className = "unit-row__meta";
        meta.appendChild(createBadge(rec.modalityLabel, "modality"));
        meta.appendChild(createBadge(rec.typeLabel, rec.typeKey === "matricula" ? "matricula" : "vestibular"));

        main.appendChild(titleLine);
        row.appendChild(main);
        row.appendChild(meta);
        list.appendChild(row);
      }

      card.appendChild(list);
      frag.appendChild(card);
    }

    dom.groups.appendChild(frag);
    dom.empty.hidden = state.filtered.length > 0;
    dom.loadMore.hidden = state.filtered.length <= state.renderCount;
  };

  const renderMeta = () => {
    dom.meta.textContent = `${state.filtered.length} de ${state.records.length} links exibidos. Fonte: ${state.sourceLabel}.`;
  };

  const renderQA = () => {
    if (!state.qa) return;
    dom.qaList.innerHTML = `
      <li>Total de links normalizados: <strong>${state.qa.total}</strong></li>
      <li>URLs inválidas (sem http/https): <strong>${state.qa.invalidUrls}</strong></li>
      <li>Códigos vazios: <strong>${state.qa.emptyCode}</strong></li>
      <li>Códigos repetidos: <strong>${state.qa.duplicateCodes}</strong></li>
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
    renderRows();
    renderMeta();
  };

  const toCSV = (rows) => {
    const header = ["unidade", "modalidade", "tipo", "codigo", "titulo", "url"];
    const lines = rows.map((r) => [r.unitName, r.modalityLabel, r.typeLabel, r.code, r.processTitle, r.url || r.rawUrl]);
    return [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(state.filtered)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `portal-links-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const bindEvents = () => {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;

      if (trigger.dataset.action === "load-more") {
        state.renderCount += CHUNK_SIZE;
        renderRows();
      }

      if (trigger.dataset.action === "reset-filters") {
        state.filters = { query: "", unit: "all", modality: "all", type: "all" };
        dom.query.value = "";
        dom.unit.value = "all";
        dom.modality.value = "all";
        dom.type.value = "all";
        applyFilters();
      }

      if (trigger.dataset.action === "export-csv") exportCSV();
    });

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

    dom.query.addEventListener(
      "input",
      debounce(() => {
        state.filters.query = dom.query.value;
        applyFilters();
      }, 150)
    );
  };

  const loadRecords = async () => {
    const fromWindow = dedupeAndSort(normalizeFromPortalLinks(window.PORTAL_LINKS));

    try {
      const res = await fetch(JSON_DATA_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao ler JSON bruto.");
      const payload = await res.json();
      const fromJson = dedupeAndSort(normalizeFromDataJson(payload));

      if (fromJson.length > fromWindow.length) {
        state.sourceLabel = `JSON bruto (${fromJson.length} registros)`;
        return fromJson;
      }
    } catch {
      // fallback silencioso para links-data.js
    }

    state.sourceLabel = `links-data.js (${fromWindow.length} registros)`;
    return fromWindow;
  };

  const init = async () => {
    state.records = await loadRecords();
    state.qa = buildQA(state.records);

    const units = [...new Set(state.records.map((r) => r.unitKey))];
    const modalities = [...new Set(state.records.map((r) => r.modalityKey))];
    const types = [...new Set(state.records.map((r) => r.typeKey))];

    buildOptions(dom.unit, units, Object.fromEntries(units.map((u) => [u, humanUnit(u)])));
    buildOptions(dom.modality, modalities, MODALITY_LABELS);
    buildOptions(dom.type, types, TYPE_LABELS);

    bindEvents();
    applyFilters();
    renderQA();
  };

  init();
})();
