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
    tbody: document.getElementById("links-tbody"),
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
          out.push({
            unitKey,
            unitName,
            modalityKey: parseModality(merged),
            modalityLabel: item.modality || block.title || blockKey,
            typeKey: parseType(item.type),
            typeLabel: item.type || TYPE_LABELS.outro,
            code: String(item.code || "").trim(),
            url,
            rawUrl: String(item.href || "").trim(),
            searchable: norm([unitName, block.title, item.modality, item.type, item.code, item.href].join(" ")),
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
        const title = String(entry.title || "");
        const code = String(entry.params?.ps || title.split(" ")[0] || "").trim();
        const typeKey = parseType(title);
        const modalityKey = parseModality(title);
        const unitKey = extractUnitFromTitle(title);
        const unitName = humanUnit(unitKey);
        const url = safeUrl(entry.url);

        out.push({
          unitKey,
          unitName,
          modalityKey,
          modalityLabel: title,
          typeKey,
          typeLabel: TYPE_LABELS[typeKey] || TYPE_LABELS.outro,
          code,
          url,
          rawUrl: String(entry.url || "").trim(),
          searchable: norm([unitName, sheet.name, title, code, entry.url].join(" ")),
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
      a.modalityLabel.localeCompare(b.modalityLabel, "pt-BR") ||
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

  const createPill = (text) => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = text;
    return span;
  };

  const appendCell = (row, childOrText) => {
    const td = document.createElement("td");
    if (typeof childOrText === "string") td.textContent = childOrText;
    else td.appendChild(childOrText);
    row.appendChild(td);
  };

  const renderRows = () => {
    dom.tbody.textContent = "";
    const frag = document.createDocumentFragment();

    for (const rec of state.filtered.slice(0, state.renderCount)) {
      const tr = document.createElement("tr");

      const processCell = document.createElement("td");
      processCell.className = "process-cell";
      const unit = document.createElement("div");
      unit.className = "process-unit";
      unit.textContent = rec.unitName;

      const process = document.createElement("div");
      process.className = "process-title";
      process.textContent = rec.modalityLabel;

      const processLink = document.createElement("a");
      processLink.className = "process-link";
      processLink.href = rec.url || "#";
      processLink.target = "_blank";
      processLink.rel = "noopener noreferrer";
      processLink.textContent = rec.url || rec.rawUrl || "URL inválida";
      if (!rec.url) {
        processLink.removeAttribute("href");
        processLink.setAttribute("aria-disabled", "true");
      }

      processCell.appendChild(unit);
      processCell.appendChild(process);
      processCell.appendChild(processLink);
      tr.appendChild(processCell);

      appendCell(tr, createPill(rec.modalityKey === "outro" ? rec.modalityLabel : rec.modalityKey));
      appendCell(tr, createPill(rec.typeLabel));

      const strong = document.createElement("strong");
      strong.textContent = rec.code || "—";
      appendCell(tr, strong);

      const actions = document.createElement("div");
      actions.className = "links-copy-actions";

      const copyCode = document.createElement("button");
      copyCode.className = "btn";
      copyCode.type = "button";
      copyCode.dataset.action = "copy-code";
      copyCode.dataset.value = rec.code;
      copyCode.textContent = "Código";
      actions.appendChild(copyCode);

      const copyUrl = document.createElement("button");
      copyUrl.className = "btn";
      copyUrl.type = "button";
      copyUrl.dataset.action = "copy-url";
      copyUrl.dataset.value = rec.url || rec.rawUrl;
      copyUrl.textContent = "Link";
      actions.appendChild(copyUrl);

      if (rec.url) {
        const open = document.createElement("a");
        open.className = "btn";
        open.href = rec.url;
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        open.textContent = "Abrir";
        actions.appendChild(open);
      }

      appendCell(tr, actions);
      frag.appendChild(tr);
    }

    dom.tbody.appendChild(frag);
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

  const copyToClipboard = async (value) => {
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand("copy");
      temp.remove();
      return ok;
    }
  };

  const toCSV = (rows) => {
    const header = ["unidade", "modalidade", "tipo", "codigo", "url"];
    const lines = rows.map((r) => [r.unitName, r.modalityLabel, r.typeLabel, r.code, r.url || r.rawUrl]);
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
    document.addEventListener("click", async (event) => {
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

      if (trigger.dataset.action === "copy-code" || trigger.dataset.action === "copy-url") {
        const ok = await copyToClipboard(trigger.dataset.value || "");
        const original = trigger.dataset.action === "copy-code" ? "Copiar código" : "Copiar link";
        trigger.textContent = ok ? "Copiado!" : "Falhou";
        setTimeout(() => {
          trigger.textContent = original;
        }, 900);
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
    buildOptions(dom.modality, modalities, {
      presencial: "Presencial",
      hibrido: "Híbrido",
      semipresencial: "Semipresencial",
      flex: "Flex",
      ead: "EAD",
      outro: "Outro",
    });
    buildOptions(dom.type, types, TYPE_LABELS);

    bindEvents();
    applyFilters();
    renderQA();
  };

  init();
})();
