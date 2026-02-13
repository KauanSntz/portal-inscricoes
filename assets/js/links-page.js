/* assets/js/links-page.js */
(() => {
  "use strict";

  if (!location.pathname.endsWith("links.html") && location.pathname !== "/links") return;

  const CHUNK_SIZE = 120;
  const JSON_DATA_PATH = "./assets/data/portal_links_2026_1.json";
  const FIXED_HASH = "#/es/inscricoeswizard/dados-basicos";

  const TYPE_LABELS = Object.freeze({
    vestibular: "Vestibular",
    matricula: "Matrícula",
    outro: "Outro",
  });

  const MODALITY_LABELS = Object.freeze({
    presencial: "Presencial",
    hibrido: "Híbrido",
    semipresencial: "Semipresencial",
    flex: "Flex",
    ead: "EAD",
    outro: "Outro",
  });

  const UNIT_ALIAS = Object.freeze({
    oeste: "compensa",
    "oeste compensa": "compensa",
    compensa: "compensa",
  });

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

  const parseType = (txt) => {
    const t = norm(txt);
    if (t.includes("vestib")) return "vestibular";
    if (t.includes("matric")) return "matricula";
    return "outro";
  };

  const parseModality = (txt) => {
    const t = norm(txt);
    if (t.includes("flex")) return "flex";
    if (t.includes("semi")) return "semipresencial";
    if (t.includes("hibrid")) return "hibrido";
    if (t.includes("ead") || t.includes("online")) return "ead";
    if (t.includes("presencial")) return "presencial";
    return "outro";
  };

  const unitKeyFromName = (unitName) => {
    const key = norm(unitName).replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
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

  const splitTitle = (fullTitle) => {
    const raw = String(fullTitle || "").trim();
    const code = String(raw.split(" ")[0] || "").replace(/\D/g, "");
    const withoutCode = code ? raw.replace(new RegExp(`^${code}\\s*`), "") : raw;

    const parts = withoutCode.split(" - ").map((x) => x.trim()).filter(Boolean);
    const processPrefix = parts[0] || "Processo";
    const unitAndMode = parts[1] || "";

    const modePatterns = [
      /\s+100%\s*EAD$/i,
      /\s+SEMIPRESENCIAL\s+FLEX$/i,
      /\s+SEMIPRESENCIAL$/i,
      /\s+H[ÍI]BRIDO$/i,
      /\s+PRESENCIAL$/i,
      /\s+EAD$/i,
      /\s+FLEX$/i,
    ];

    let unitName = unitAndMode || parts[2] || "OUTROS";
    for (const rgx of modePatterns) unitName = unitName.replace(rgx, "").trim();
    if (!unitName) unitName = "OUTROS";

    const processTitle = withoutCode;
    return { code, unitName, processTitle, processPrefix };
  };

  const normalizeFromDataJson = (payload) => {
    const out = [];
    for (const sheet of payload?.sheets || []) {
      for (const entry of sheet.entries || []) {
        if (entry.type !== "link") continue;

        const title = String(entry.title || "");
        const split = splitTitle(title);
        const unitKey = unitKeyFromName(split.unitName);
        const unitName = humanUnit(unitKey) === unitKey.toUpperCase() ? split.unitName.toUpperCase() : humanUnit(unitKey);
        const modalityKey = parseModality(title);
        const typeKey = parseType(title);
        const url = normalizeWizardUrl(entry.url);

        out.push({
          unitKey,
          unitName,
          code: split.code || String(entry.params?.ps || ""),
          processTitle: split.processTitle,
          modalityKey,
          modalityLabel: MODALITY_LABELS[modalityKey] || MODALITY_LABELS.outro,
          typeKey,
          typeLabel: TYPE_LABELS[typeKey] || TYPE_LABELS.outro,
          url,
          rawUrl: String(entry.url || ""),
          searchable: norm([split.unitName, split.processTitle, sheet.name, entry.url].join(" ")),
        });
      }
    }
    return out;
  };

  const normalizeFromPortalLinks = (units) => {
    const out = [];
    for (const unit of Array.isArray(units) ? units : []) {
      const unitKey = unitKeyFromName(unit.coursesKey || unit.key || unit.title);
      const unitName = humanUnit(unitKey);
      for (const [blockKey, block] of Object.entries(unit.blocks || {})) {
        for (const item of block.links || []) {
          const typeKey = parseType(item.type);
          const modalityKey = parseModality(`${item.modality || ""} ${blockKey}`);
          const typeLabel = item.type || TYPE_LABELS[typeKey] || TYPE_LABELS.outro;
          const modalityLabel = MODALITY_LABELS[modalityKey] || MODALITY_LABELS.outro;
          const processTitle = `${typeLabel.toUpperCase()} - ${unitName} ${modalityLabel.toUpperCase()} - 2026/1`;
          out.push({
            unitKey,
            unitName,
            code: String(item.code || "").trim(),
            processTitle,
            modalityKey,
            modalityLabel,
            typeKey,
            typeLabel: TYPE_LABELS[typeKey] || typeLabel,
            url: normalizeWizardUrl(item.href),
            rawUrl: String(item.href || ""),
            searchable: norm([unitName, processTitle, item.code, item.href].join(" ")),
          });
        }
      }
    }
    return out;
  };

  const dedupeAndSort = (records) => {
    const seen = new Set();
    const unique = [];
    for (const rec of records) {
      const key = [rec.unitKey, rec.code, rec.typeKey, rec.url].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(rec);
    }
    return unique.sort((a, b) =>
      a.unitName.localeCompare(b.unitName, "pt-BR") ||
      a.code.localeCompare(b.code, "pt-BR") ||
      a.typeLabel.localeCompare(b.typeLabel, "pt-BR")
    );
  };

  const buildQA = (records) => {
    const invalidUrls = records.filter((x) => !x.url || !x.url.endsWith(FIXED_HASH)).length;
    const emptyCodes = records.filter((x) => !x.code).length;
    return { total: records.length, invalidUrls, emptyCodes };
  };

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

  const unitTone = (unitKey) => {
    const tones = ["tone-red-1", "tone-red-2", "tone-red-3", "tone-blue-1", "tone-blue-2"];
    let h = 0;
    for (const ch of unitKey) h += ch.charCodeAt(0);
    return tones[h % tones.length];
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
    const grouped = new Map();

    for (const rec of visible) {
      if (!grouped.has(rec.unitKey)) grouped.set(rec.unitKey, { unitName: rec.unitName, items: [] });
      grouped.get(rec.unitKey).items.push(rec);
    }

    const frag = document.createDocumentFragment();
    for (const [unitKey, group] of grouped.entries()) {
      const card = document.createElement("article");
      card.className = `unit-group ${unitTone(unitKey)}`;

      const h2 = document.createElement("h2");
      h2.className = "unit-group__title";
      h2.textContent = group.unitName;
      card.appendChild(h2);

      const list = document.createElement("div");
      list.className = "unit-group__list";

      for (const rec of group.items) {
        const row = document.createElement("div");
        row.className = "unit-row";

        const main = document.createElement(rec.url ? "a" : "div");
        main.className = "process-link-title";
        if (rec.url) {
          main.href = rec.url;
          main.target = "_blank";
          main.rel = "noopener noreferrer";
        }

        const code = document.createElement("span");
        code.className = "process-code";
        code.textContent = rec.code || "—";

        const text = document.createElement("span");
        text.className = "process-text";
        text.textContent = rec.processTitle;

        const meta = document.createElement("div");
        meta.className = "unit-row__meta";
        meta.appendChild(createBadge(rec.modalityLabel, "modality"));
        meta.appendChild(createBadge(rec.typeLabel, rec.typeKey === "matricula" ? "matricula" : "vestibular"));

        main.appendChild(code);
        main.appendChild(text);
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
      <li>Links inválidos ou fora do padrão wizard: <strong>${state.qa.invalidUrls}</strong></li>
      <li>Códigos vazios: <strong>${state.qa.emptyCodes}</strong></li>
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
    const head = ["unidade", "modalidade", "tipo", "codigo", "titulo", "url"];
    const lines = rows.map((r) => [r.unitName, r.modalityLabel, r.typeLabel, r.code, r.processTitle, r.url || r.rawUrl]);
    return [head, ...lines]
      .map((line) => line.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
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
    const fallback = dedupeAndSort(normalizeFromPortalLinks(window.PORTAL_LINKS));
    try {
      const res = await fetch(JSON_DATA_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("json fail");
      const payload = await res.json();
      const fromJson = dedupeAndSort(normalizeFromDataJson(payload));
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

    buildOptions(dom.unit, [...new Set(state.records.map((r) => r.unitKey))], Object.fromEntries(state.records.map((r) => [r.unitKey, r.unitName])));
    buildOptions(dom.modality, [...new Set(state.records.map((r) => r.modalityKey))], MODALITY_LABELS);
    buildOptions(dom.type, [...new Set(state.records.map((r) => r.typeKey))], TYPE_LABELS);

    bindEvents();
    applyFilters();
    renderQA();
  };

  init();
})();
