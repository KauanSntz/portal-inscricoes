/* assets/js/app.js */
(() => {
  const LINKS = window.PORTAL_LINKS;
  const COURSES = window.coursesData;

  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- helpers ----------
  const escapeHTML = (s = "") =>
    String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const normalize = (s = "") => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const getUnitAccent = (slug) => {
    const card = $(`.unidade.${slug}`);
    if (!card) return "#2563eb";
    return getComputedStyle(card).getPropertyValue("--accent").trim() || "#2563eb";
  };

  const iconSearch = () => `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor"
        d="M10 4a6 6 0 104.472 10.03l4.249 4.25a1 1 0 001.415-1.415l-4.25-4.249A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z"/>
    </svg>
  `;

  // ---------- build FRONT (links) ----------
  function flattenLinks(unit) {
    const groups = Array.isArray(unit.modalidades) ? unit.modalidades : [];
    return groups.flatMap((g) => Array.isArray(g.links) ? g.links : []);
  }

  function pickGroup(allLinks, kind) {
  const modNorm = (l) => normalize(l.modalidade || "");

  const is = {
    presencial: (l) => modNorm(l) === "presencial",
    hibrido: (l) => modNorm(l).includes("hibrido"),
    semipresencial: (l) => modNorm(l).includes("semipresencial") && !modNorm(l).includes("flex"),
    flex: (l) => modNorm(l).includes("flex"),
    ead: (l) => modNorm(l).includes("ead") || modNorm(l).includes("100%"),
  }[kind];

  const list = allLinks.filter(is);

  // garante vestibular + matrícula (quando existir)
  const byType = (rx) => list.find((x) => rx.test(normalize(x.tipo || "")));
  const vest = byType(/vestib/);
  const matr = byType(/matr/);

  const out = [];
  if (vest) out.push(vest);
  if (matr && matr !== vest) out.push(matr);

  // fallback (se faltar algum)
  for (const x of list) {
    if (out.length >= 2) break;
    if (!out.includes(x)) out.push(x);
  }

  return out;
}


  function renderUnit(unit) {
    const allLinks = flattenLinks(unit);

    const blocks = [
      { title: "Presencial", kind: "presencial" },
      { title: "Híbrido", kind: "hibrido" },
      { title: "Semipresencial", kind: "semipresencial" },
      { title: "Semipresencial Flex", kind: "flex" },
      { title: "EAD (100% Online)", kind: "ead" },
    ].map((b) => ({ ...b, links: pickGroup(allLinks, b.kind) }))
     .filter((b) => b.links.length);

    const blocksHTML = blocks.map((b) => {
      const btns = b.links.slice(0, 2).map((l) => `
        <a class="botao" target="_blank" rel="noopener" href="${escapeHTML(l.href)}">
          <span class="codigo">${escapeHTML(l.codigo)}</span>
          <span class="tipo">${escapeHTML(l.tipo)}</span>
          <span class="modalidade">${escapeHTML(l.modalidade)}</span>
        </a>
      `).join("");

      return `
        <h3 class="subtitulo-modalidade">${escapeHTML(b.title)}</h3>
        <div class="botoes">${btns}</div>
      `;
    }).join("");

    return `
      <section class="unidade ${escapeHTML(unit.slug)}" data-slug="${escapeHTML(unit.slug)}">
        <div class="unidade-header">
          <h2>${escapeHTML(unit.titulo)}</h2>
          <button class="btn-cursos" type="button" data-action="open-courses" data-slug="${escapeHTML(unit.slug)}">
            ${iconSearch()} <span>Pesquisar Cursos</span>
          </button>
        </div>
        ${blocksHTML}
      </section>
    `;
  }

  function renderApp() {
    const host = $("#app");
    if (!host) return;

    if (!Array.isArray(LINKS)) {
      host.innerHTML = `<p style="text-align:center;font-weight:800;color:#b91c1c">Erro: PORTAL_LINKS não encontrado (assets/js/links-data.js).</p>`;
      return;
    }

    host.innerHTML = LINKS.map(renderUnit).join("");
  }

  // ---------- COURSES modal (single instance + delegation) ----------
  function ensureModal() {
    let overlay = $("#coursesModal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "coursesModal";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Cursos">
        <div class="modal-header">
          <div class="modal-title" id="coursesModalTitle">Cursos</div>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button>
        </div>

        <div class="modal-tabs" role="tablist">
          <button class="tab-btn is-active" type="button" role="tab" data-tab="presencial">Presencial</button>
          <button class="tab-btn" type="button" role="tab" data-tab="hibrido">Híbrido</button>
          <button class="tab-btn" type="button" role="tab" data-tab="semipresencial">Semipresencial</button>
          <button class="tab-btn" type="button" role="tab" data-tab="ead">EAD</button>
        </div>

        <div class="modal-body" id="coursesModalBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // clique no fundo fecha
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    // ESC fecha
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    return overlay;
  }

  let currentUnitSlug = null;
  let currentTab = "presencial";
  let currentQuery = "";
  let currentTurno = "Todos";

  const TURNOS_ORDER = ["Matutino", "Vespertino", "Noturno", "Flex", "Online"];

  function groupCourses(items) {
    const map = new Map();
    for (const it of items || []) {
      const nome = (it?.nome || "").trim();
      const turno = (it?.turno || "").trim();
      if (!nome) continue;
      if (!map.has(nome)) map.set(nome, new Set());
      if (turno) map.get(nome).add(turno);
    }
    return [...map.entries()]
      .map(([nome, set]) => ({ nome, turnos: [...set].sort((a, b) => TURNOS_ORDER.indexOf(a) - TURNOS_ORDER.indexOf(b)) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function getTabItems() {
    const unit = COURSES?.[currentUnitSlug];
    const arr = unit?.[currentTab];
    return Array.isArray(arr) ? arr : [];
  }

  function renderCoursesBody() {
    const overlay = ensureModal();
    const body = $("#coursesModalBody", overlay);
    if (!body) return;

    const raw = getTabItems();
    if (!raw.length) {
      body.innerHTML = `
        <div class="empty-state">
          Conteúdo de ${escapeHTML(labelTab(currentTab))} ainda não cadastrado para ${escapeHTML(currentUnitSlug?.toUpperCase() || "")}.
        </div>
      `;
      return;
    }

    const grouped = groupCourses(raw);

    const allTurnos = [...new Set(raw.map((x) => x.turno).filter(Boolean))].sort(
      (a, b) => TURNOS_ORDER.indexOf(a) - TURNOS_ORDER.indexOf(b)
    );

    const chips = ["Todos", ...allTurnos];

    const q = normalize(currentQuery);
    const filtered = grouped.filter((c) => {
      const matchName = normalize(c.nome).includes(q);
      const matchTurno = currentTurno === "Todos" ? true : c.turnos.includes(currentTurno);
      return matchName && matchTurno;
    });

    body.innerHTML = `
      <div class="search-row">
        <input class="search-input" type="search" value="${escapeHTML(currentQuery)}"
          placeholder="Pesquisar curso em ${escapeHTML(labelTab(currentTab))} (ex.: Direito, Enfermagem, Psicologia...)"
          data-action="search" />
        <div class="chips">
          ${chips.map((t) => `
            <button type="button" class="chip ${t === currentTurno ? "is-active" : ""}" data-action="turno" data-turno="${escapeHTML(t)}">
              ${escapeHTML(t)}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="courses-meta">${filtered.length} curso(s) encontrado(s)</div>

      <div class="course-grid">
        ${filtered.map((c) => `
          <div class="course-card">
            <div class="course-name">${escapeHTML(c.nome)}</div>
            <div class="badges">
              ${c.turnos.map((t) => `<span class="badge">${escapeHTML(t)}</span>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    // input handler (sem depender de re-bind externo)
    const input = $(".search-input", body);
    if (input) {
      input.addEventListener("input", () => {
        currentQuery = input.value || "";
        renderCoursesBody();
      }, { passive: true });
    }
  }

  function labelTab(tab) {
    return { presencial: "Presencial", hibrido: "Híbrido", semipresencial: "Semipresencial", ead: "EAD" }[tab] || tab;
  }

  function setActiveTab(tab) {
    currentTab = tab;
    currentQuery = "";
    currentTurno = "Todos";

    const overlay = ensureModal();
    overlay.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === tab);
    });

    renderCoursesBody();
  }

  function openModal(slug) {
    currentUnitSlug = slug;
    currentTab = "presencial";
    currentQuery = "";
    currentTurno = "Todos";

    const overlay = ensureModal();
    overlay.style.setProperty("--accent", getUnitAccent(slug));
    $("#coursesModalTitle", overlay).textContent = `Cursos — ${String(slug).toUpperCase()}`;

    overlay.classList.add("is-open");
    setActiveTab("presencial");
  }

  function closeModal() {
    const overlay = $("#coursesModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
  }

  // ---------- Global click delegation (stable) ----------
  function bindGlobalClicks() {
    document.addEventListener("click", (e) => {
      const openBtn = e.target.closest('[data-action="open-courses"]');
      if (openBtn) {
        openModal(openBtn.dataset.slug);
        return;
      }

      const closeBtn = e.target.closest('[data-action="close-modal"]');
      if (closeBtn) {
        closeModal();
        return;
      }

      const tabBtn = e.target.closest(".tab-btn");
      if (tabBtn && $("#coursesModal")?.classList.contains("is-open")) {
        setActiveTab(tabBtn.dataset.tab);
        return;
      }

      const chip = e.target.closest('[data-action="turno"]');
      if (chip && $("#coursesModal")?.classList.contains("is-open")) {
        currentTurno = chip.dataset.turno || "Todos";
        renderCoursesBody();
        return;
      }
    });
  }

  // ---------- init ----------
  // remove overlays duplicados (se você já criou mais de 1 em tentativas anteriores)
  document.querySelectorAll(".modal-overlay").forEach((el, idx) => {
    if (idx > 0) el.remove();
  });

  renderApp();
  ensureModal();
  bindGlobalClicks();
})();
