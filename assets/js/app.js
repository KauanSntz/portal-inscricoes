// assets/js/app.js
(() => {
  const LINKS = window.PORTAL_LINKS;
  const COURSES = window.coursesData || {};

  const app = document.getElementById("app");
  if (!app) return;

  if (!Array.isArray(LINKS) || !LINKS.length) {
    app.innerHTML = `<p style="font-weight:800;color:#111827;text-align:center">
      Erro: PORTAL_LINKS não encontrado (assets/js/links-data.js).
    </p>`;
    return;
  }

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const modalityKeyFromLink = (link) => {
    const m = norm(link.modalidade);
    if (m.includes("presencial")) return "presencial";
    if (m.includes("hibrido") || m.includes("híbrido")) return "hibrido";
    if (m.includes("semi flex") || m.includes("flex")) return "semiflex";
    if (m.includes("semipresencial")) return "semipresencial";
    if (m.includes("ead") || m.includes("100%")) return "ead";
    return "outros";
  };

  const modalityTitle = {
    presencial: "Presencial",
    hibrido: "Híbrido",
    semipresencial: "Semipresencial",
    semiflex: "Semipresencial Flex",
    ead: "EAD (100% Online)"
  };

  const modalityOrder = ["presencial", "hibrido", "semipresencial", "semiflex", "ead"];

  function groupLinksByModality(unit) {
    const allLinks = (unit.modalidades || []).flatMap((m) => (m.links || []));
    const grouped = { presencial: [], hibrido: [], semipresencial: [], semiflex: [], ead: [] };

    for (const link of allLinks) {
      const k = modalityKeyFromLink(link);
      if (grouped[k]) grouped[k].push(link);
    }

    // vestibular primeiro
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => {
        const av = norm(a.tipo).includes("vestibular") ? 0 : 1;
        const bv = norm(b.tipo).includes("vestibular") ? 0 : 1;
        return av - bv;
      });
    }

    return grouped;
  }

  function iconSearchSvg() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2"/>
        <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }

  function renderUnit(unit) {
    const grouped = groupLinksByModality(unit);

    const blocks = modalityOrder
      .filter((k) => grouped[k] && grouped[k].length)
      .map((k) => {
        const links = grouped[k].slice(0, 2); // 2 links por modalidade
        return `
          <h3 class="subtitulo-modalidade ${k === "semiflex" ? "is-flex" : ""}">${escapeHtml(modalityTitle[k])}</h3>
          <div class="botoes">
            ${links
              .map(
                (l) => `
              <a class="botao" target="_blank" rel="noopener" href="${escapeHtml(l.href)}">
                <span class="codigo">${escapeHtml(l.codigo)}</span>
                <span class="tipo">${escapeHtml(l.tipo)}</span>
                <span class="modalidade">${escapeHtml(l.modalidade)}</span>
              </a>`
              )
              .join("")}
          </div>
        `;
      })
      .join("");

    return `
      <section class="unidade ${escapeHtml(unit.slug)}" data-slug="${escapeHtml(unit.slug)}">
        <div class="unidade-header">
          <h2>${escapeHtml(unit.titulo)}</h2>

          <button type="button" class="btn-cursos" data-open-cursos="${escapeHtml(unit.slug)}">
            ${iconSearchSvg()}
            <span>Pesquisar Cursos</span>
          </button>
        </div>

        ${blocks}
      </section>
    `;
  }

  function renderPortal() {
    app.innerHTML = LINKS.map(renderUnit).join("");
  }

  // ========= MODAL =========
  let overlay = null;
  const state = { slug: null, tab: "presencial", q: "", turno: "Todos" };

  function ensureModal() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title"></div>
          <button type="button" class="modal-close" aria-label="Fechar">×</button>
        </div>
        <div class="modal-tabs"></div>
        <div class="modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector(".modal-close").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });

    overlay.querySelector(".modal-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn) return;
      state.tab = btn.dataset.tab;
      state.q = "";
      state.turno = "Todos";
      renderModal();
    });

    overlay.querySelector(".modal-body").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-turno]");
      if (!chip) return;
      state.turno = chip.dataset.turno;
      renderModal();
    });

    overlay.querySelector(".modal-body").addEventListener("input", (e) => {
      if (e.target.matches(".search-input")) {
        state.q = e.target.value || "";
        renderModal();
      }
    });

    return overlay;
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    state.slug = null;
    state.tab = "presencial";
    state.q = "";
    state.turno = "Todos";
    overlay.querySelector(".modal-title").textContent = "";
    overlay.querySelector(".modal-tabs").innerHTML = "";
    overlay.querySelector(".modal-body").innerHTML = "";
  }

  function openModal(slug) {
    ensureModal();

    const unitEl = document.querySelector(`.unidade[data-slug="${slug}"]`);
    const accent = unitEl ? getComputedStyle(unitEl).getPropertyValue("--accent").trim() : "#2563eb";
    overlay.style.setProperty("--accent", accent);

    state.slug = slug;
    state.tab = "presencial";
    state.q = "";
    state.turno = "Todos";

    overlay.classList.add("is-open");
    renderModal();
  }

  function groupCourses(list) {
    const map = new Map();
    for (const item of list) {
      const name = String(item.nome || "").trim();
      const turno = String(item.turno || "").trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, new Set());
      if (turno) map.get(name).add(turno);
    }
    return [...map.entries()]
      .map(([nome, set]) => ({ nome, turnos: [...set] }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function renderModal() {
    if (!overlay || !state.slug) return;

    const unit = LINKS.find((u) => u.slug === state.slug);
    overlay.querySelector(".modal-title").textContent = `Cursos — ${unit ? unit.titulo : state.slug.toUpperCase()}`;

    const tabs = [
      { k: "presencial", t: "Presencial" },
      { k: "hibrido", t: "Híbrido" },
      { k: "semipresencial", t: "Semipresencial" },
      { k: "ead", t: "EAD" }
    ];

    overlay.querySelector(".modal-tabs").innerHTML = tabs
      .map(
        ({ k, t }) => `
        <button type="button" class="tab-btn ${state.tab === k ? "is-active" : ""}" data-tab="${k}">
          ${t}
        </button>`
      )
      .join("");

    const raw = (COURSES[state.slug] && COURSES[state.slug][state.tab]) || [];
    const grouped = groupCourses(raw);

    const turnosSet = new Set();
    grouped.forEach((c) => c.turnos.forEach((t) => turnosSet.add(t)));
    const turnosOrder = ["Matutino", "Vespertino", "Noturno", "Flex", "Online"];
    const turnos = ["Todos", ...turnosOrder.filter((t) => turnosSet.has(t))];

    const qn = norm(state.q);
    const filtered = grouped.filter((c) => {
      const okQ = !qn || norm(c.nome).includes(qn);
      const okT = state.turno === "Todos" || c.turnos.some((t) => norm(t) === norm(state.turno));
      return okQ && okT;
    });

    const body = overlay.querySelector(".modal-body");
    if (!raw.length) {
      body.innerHTML = `
        <div class="empty-state">Conteúdo de ${tabs.find(x=>x.k===state.tab)?.t || state.tab} ainda não cadastrado para ${unit ? unit.titulo : state.slug}.</div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="search-row">
        <input class="search-input" value="${escapeHtml(state.q)}"
          placeholder="Pesquisar curso em ${tabs.find(x=>x.k===state.tab)?.t || state.tab} (ex.: Direito, Enfermagem...)" />
        <div class="chips">
          ${turnos
            .map(
              (t) => `<button type="button" class="chip ${state.turno === t ? "is-active" : ""}" data-turno="${t}">${t}</button>`
            )
            .join("")}
        </div>
      </div>

      <div class="courses-meta">${filtered.length} curso(s) encontrado(s)</div>

      ${
        filtered.length
          ? `<div class="course-grid">
              ${filtered
                .map(
                  (c) => `
                <div class="course-card">
                  <div class="course-name">${escapeHtml(c.nome)}</div>
                  <div class="badges">
                    ${c.turnos.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
                  </div>
                </div>`
                )
                .join("")}
            </div>`
          : `<div class="empty-state">Nenhum curso encontrado com esse filtro.</div>`
      }
    `;
  }

  // ========= INIT =========
  renderPortal();

  app.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-cursos]");
    if (!btn) return;
    openModal(btn.dataset.openCursos);
  });
})();
