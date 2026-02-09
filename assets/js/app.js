(function () {
  const root = document.getElementById("app");
  const linksData = window.PORTAL_LINKS;
  const coursesData = window.PORTAL_COURSES || {};

  if (!root) {
    console.error("Elemento #app não encontrado.");
    return;
  }
  if (!Array.isArray(linksData)) {
    console.error("PORTAL_LINKS não carregou. Verifique links-data.js.");
    return;
  }

  // cria o modal uma vez
  const modal = ensureCoursesModal();

  root.innerHTML = "";
  linksData.forEach((unidade) => root.appendChild(renderUnidade(unidade)));

  function renderUnidade(unidade) {
    const section = document.createElement("section");
    section.className = `unidade ${unidade.slug}`;

    // header row: h2 + botão à direita
    const headerRow = document.createElement("div");
    headerRow.className = "unidade-header";

    const h2 = document.createElement("h2");
    h2.textContent = unidade.titulo;

    headerRow.appendChild(h2);

    // Por enquanto: só SEDE tem botão
    if (unidade.slug === "sede") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-cursos";
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2"/>
          <path d="M16.3 16.3 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Pesquisar Cursos
      `;

      btn.addEventListener("click", () => openCoursesModal(section, unidade));
      headerRow.appendChild(btn);
    }

    section.appendChild(headerRow);

    // modalidades / links (igual antes)
    unidade.modalidades.forEach((mod) => {
      const h3 = document.createElement("h3");
      h3.className = "subtitulo-modalidade";
      h3.textContent = mod.titulo;
      section.appendChild(h3);

      const grid = document.createElement("div");
      grid.className = "botoes";

      mod.links.forEach((link) => grid.appendChild(renderBotao(link)));
      section.appendChild(grid);
    });

    return section;
  }

  function renderBotao(link) {
    const a = document.createElement("a");
    a.className = "botao";
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const codigo = document.createElement("span");
    codigo.className = "codigo";
    codigo.textContent = link.codigo;

    const tipo = document.createElement("span");
    tipo.className = "tipo";
    tipo.textContent = link.tipo;

    const modalidade = document.createElement("span");
    modalidade.className = "modalidade";
    modalidade.textContent = link.modalidade;

    a.append(codigo, tipo, modalidade);
    return a;
  }

  // ===== Modal =====
  function ensureCoursesModal() {
    let overlay = document.querySelector(".modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Pesquisar cursos">
        <div class="modal-header">
          <div class="modal-title" id="modalTitle">Cursos</div>
          <button class="modal-close" type="button" aria-label="Fechar">✕</button>
        </div>

        <div class="modal-tabs" id="modalTabs"></div>
        <div class="modal-body" id="modalBody"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // fechar clicando fora
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    // fechar no X
    overlay.querySelector(".modal-close").addEventListener("click", closeModal);

    // fechar no ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });

    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    // expõe para outras funções
    overlay._closeModal = closeModal;
    return overlay;
  }

  function openCoursesModal(sectionEl, unidade) {
    const computed = getComputedStyle(sectionEl);
    const accent = computed.getPropertyValue("--accent").trim() || "#2563eb";

    modal.style.setProperty("--accent", accent);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";

    const titleEl = modal.querySelector("#modalTitle");
    const tabsEl = modal.querySelector("#modalTabs");
    const bodyEl = modal.querySelector("#modalBody");

    titleEl.textContent = `Cursos — ${unidade.titulo}`;

    const tabs = [
      { key: "presencial", label: "Presencial" },
      { key: "hibrido", label: "Híbrido" },
      { key: "semipresencial", label: "Semipresencial" },
      { key: "ead", label: "EAD" }
    ];

    let activeTab = "presencial";

    tabsEl.innerHTML = "";
    tabs.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab-btn" + (t.key === activeTab ? " is-active" : "");
      b.textContent = t.label;
      b.addEventListener("click", () => {
        activeTab = t.key;
        [...tabsEl.querySelectorAll(".tab-btn")].forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        renderTab();
      });
      tabsEl.appendChild(b);
    });

    renderTab();

    function renderTab() {
  const unidadeCourses = (coursesData[unidade.slug] || {});
  const list = unidadeCourses[activeTab] || [];

  if (!list.length) {
    bodyEl.innerHTML = `
      <div class="empty-state">
        Conteúdo de <b>${tabLabel(activeTab)}</b> ainda não cadastrado para ${unidade.titulo}.
      </div>
    `;
    return;
  }

  const grouped = groupCoursesByName(list);

  bodyEl.innerHTML = `
    <div class="search-row">
      <input class="search-input" id="courseSearch" type="text"
        placeholder="Pesquisar curso em ${tabLabel(activeTab)} (ex.: Direito, Enfermagem, Psicologia...)" />
      <div class="chips" id="turnChips">
        <button class="chip is-active" data-turno="todos" type="button">Todos</button>
        <button class="chip" data-turno="Matutino" type="button">Matutino</button>
        <button class="chip" data-turno="Vespertino" type="button">Vespertino</button>
        <button class="chip" data-turno="Noturno" type="button">Noturno</button>
      </div>
    </div>

    <div class="courses-meta" id="coursesMeta"></div>
    <div class="course-grid" id="courseGrid"></div>
  `;

  const input = bodyEl.querySelector("#courseSearch");
  const chips = bodyEl.querySelector("#turnChips");
  const meta = bodyEl.querySelector("#coursesMeta");
  const grid = bodyEl.querySelector("#courseGrid");

  let currentTurn = "todos";

  function renderList() {
    const q = normalize(input.value || "");
    const filtered = grouped.filter((c) => {
      const matchName = !q || normalize(c.nome).includes(q);
      const matchTurn = (currentTurn === "todos") || c.turnos.includes(currentTurn);
      return matchName && matchTurn;
    });

    meta.textContent = `${filtered.length} curso(s) encontrado(s)`;

    grid.innerHTML = "";
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state">Nenhum curso encontrado com esse filtro.</div>`;
      return;
    }

    filtered.forEach((c) => {
      const card = document.createElement("div");
      card.className = "course-card";
      card.innerHTML = `
        <div class="course-name">${escapeHtml(c.nome)}</div>
        <div class="badges">
          ${c.turnos.map(t => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    currentTurn = btn.getAttribute("data-turno");

    [...chips.querySelectorAll(".chip")].forEach((x) => x.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderList();
  });

  input.addEventListener("input", renderList);

  setTimeout(() => input.focus(), 30);
  renderList();
}


    function tabLabel(key) {
      return ({ presencial:"Presencial", hibrido:"Híbrido", semipresencial:"Semipresencial", ead:"EAD" }[key] || key);
    }
  }

  function groupCoursesByName(list) {
    const map = new Map();
    (list || []).forEach((item) => {
      const nome = (item.nome || "").trim();
      const turno = (item.turno || "").trim();
      if (!nome) return;

      if (!map.has(nome)) map.set(nome, new Set());
      if (turno) map.get(nome).add(turno);
    });

    // ordena por nome
    return [...map.entries()]
      .map(([nome, set]) => ({ nome, turnos: [...set].sort(sortTurno) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function sortTurno(a, b) {
    const order = { Matutino: 1, Vespertino: 2, Noturno: 3 };
    return (order[a] || 99) - (order[b] || 99);
  }

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[m]));
  }
})();
