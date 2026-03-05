/* assets/js/courses-data.js */
(() => {
  "use strict";

  // ---------- Helpers (puros) ----------
  const normalizeKey = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  const toId = (canonicalName) =>
    normalizeKey(canonicalName)
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");

  const uniq = (arr) => Array.from(new Set(arr));

  // Canonical map: variações -> nome canônico
  // Regra: se for tecnólogo, fica "Tecnologia em ..."
  const CANON = (() => {
    const map = new Map();

    const set = (raw, canonical) => map.set(normalizeKey(raw), canonical);

    // Tec (base)
    set("Análise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");
    set("Analise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");
    set("Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Análise e Desenvolvimento de Sistemas");

    set("Logística", "Tecnologia em Logística");
    set("Tecnologia em Logística", "Tecnologia em Logística");

    set("Marketing", "Tecnologia em Marketing");
    set("Tecnologia em Marketing", "Tecnologia em Marketing");

    set("Gestão da Qualidade", "Tecnologia em Gestão da Qualidade");
    set("Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Qualidade");

    set("Gestão de Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");
    set("Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");
    set("Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Recursos Humanos");

    set("Radiologia", "Tecnologia em Radiologia");
    set("Tecnologia em Radiologia", "Tecnologia em Radiologia");

    set("Segurança no Trabalho", "Tecnologia em Segurança no Trabalho");
    set("Tecnologia em Segurança no Trabalho", "Tecnologia em Segurança no Trabalho");

    set("Design Gráfico", "Tecnologia em Design Gráfico");
    set("Tecnologia em Design Gráfico", "Tecnologia em Design Gráfico");

    set("Estética e Cosmética", "Tecnologia em Estética e Cosmética");
    set("Tecnologia em Estética e Cosmética", "Tecnologia em Estética e Cosmética");

    set("Gastronomia", "Tecnologia em Gastronomia");
    set("Tecnologia em Gastronomia", "Tecnologia em Gastronomia");

    set("Fullstack", "Tecnologia em Desenvolvimento Full Stack");
    set("Tecnologia em Desenvolvimento Full Stack", "Tecnologia em Desenvolvimento Full Stack");

    set("Big Data e Inteligência Analítica", "Tecnologia em Big Data e Inteligência Analítica");
    set("Tecnologia em Big Data e Inteligência Analítica", "Tecnologia em Big Data e Inteligência Analítica");

    set("Ciências de Dados", "Tecnologia em Ciência de Dados");
    set("Tecnologia em Ciência de Dados", "Tecnologia em Ciência de Dados");

    set("Inteligência Artificial", "Tecnologia em Inteligência Artificial");
    set("Tecnologia em Inteligência Artificial", "Tecnologia em Inteligência Artificial");

    set("Internet das Coisas (IoT)", "Tecnologia em Internet das Coisas (IoT)");
    set("Tecnologia em Internet das Coisas (IoT)", "Tecnologia em Internet das Coisas (IoT)");

    set("Jogos Digitais", "Tecnologia em Jogos Digitais");
    set("Tecnologia em Jogos Digitais", "Tecnologia em Jogos Digitais");

    set("Gestão da Segurança e Defesa Cibernética", "Tecnologia em Gestão da Segurança e Defesa Cibernética");
    set("Tecnologia em Gestão da Segurança e Defesa Cibernética", "Tecnologia em Gestão da Segurança e Defesa Cibernética");

    set("Gestão de Serviços Jurídicos e Notariais", "Tecnologia em Gestão de Serviços Jurídicos e Notariais");
    set("Tecnologia em Gestão de Serviços Jurídicos e Notariais", "Tecnologia em Gestão de Serviços Jurídicos e Notariais");

    // variações comuns
    set("Redes de Computadores", "Redes de Computadores");
    set("Rede de Computadores", "Redes de Computadores");

    set("Engenharia Ambiental", "Engenharia Ambiental e Energias Renováveis");
    set("Engenharia Ambiental e Energias Renováveis", "Engenharia Ambiental e Energias Renováveis");

    return map;
  })();

  const canonicalizeName = (rawName) => {
    const key = normalizeKey(rawName);
    if (!key) return "";
    return CANON.get(key) || String(rawName).trim();
  };

  const expandTurnosMap = (turnosMap) =>
    Object.entries(turnosMap).flatMap(([nome, turnos]) =>
      (turnos || []).map((turno) => ({ nome, turno }))
    );

  const expandFixedTurnos = (names, turnos) =>
    (names || []).flatMap((nome) =>
      (turnos || []).map((turno) => ({ nome, turno }))
    );

  // ---------- RAW OFFERS (fonte única) ----------
  // Você edita aqui futuramente, e o builder cuida de:
  // - padronizar nomes
  // - agrupar turnos
  // - gerar IDs e catálogo
  const RAW_OFFERS = {
    sede: {
      presencial: expandTurnosMap({
        "Administração": ["Matutino", "Noturno"],
        "Arquitetura e Urbanismo": ["Matutino", "Noturno"],
        "Big Data e Inteligência Analítica": ["Matutino", "Noturno"],
        "Biomedicina": ["Matutino", "Noturno"],
        "Ciência da Computação": ["Matutino", "Noturno"],
        "Ciências Contábeis": ["Matutino", "Noturno"],
        "Ciências de Dados": ["Matutino", "Noturno"],
        "Ciências Econômicas": ["Matutino", "Noturno"],
        "Direito": ["Matutino", "Noturno", "Vespertino"],
        "Educação Física Bacharelado": ["Matutino", "Noturno"],
        "Educação Física Licenciatura": ["Matutino", "Noturno"],
        "Enfermagem": ["Matutino", "Noturno", "Vespertino"],
        "Engenharia Ambiental": ["Matutino", "Noturno"],
        "Engenharia Civil": ["Matutino", "Noturno"],
        "Engenharia da Computação": ["Matutino", "Noturno"],
        "Engenharia de Produção": ["Matutino", "Noturno"],
        "Engenharia de Software": ["Matutino", "Noturno"],
        "Engenharia Elétrica": ["Matutino", "Noturno"],
        "Engenharia Mecânica": ["Matutino", "Noturno"],
        "Farmácia": ["Matutino", "Noturno"],
        "Fisioterapia": ["Matutino", "Noturno", "Vespertino"],
        "Fonoaudiologia": ["Matutino", "Noturno"],
        "Fullstack": ["Matutino", "Noturno"],
        "Gestão da Segurança e Defesa Cibernética": ["Matutino", "Noturno"],
        "Gestão de Serviços Jurídicos e Notariais": ["Matutino", "Noturno"],
        "Inteligência Artificial": ["Matutino", "Noturno"],
        "Internet das Coisas (IoT)": ["Matutino", "Noturno"],
        "Jogos Digitais": ["Matutino", "Noturno"],
        "Jornalismo": ["Matutino", "Noturno"],
        "Medicina Veterinária": ["Matutino", "Noturno"],
        "Nutrição": ["Matutino", "Noturno"],
        "Odontologia": ["Matutino", "Noturno"],
        "Pedagogia": ["Matutino", "Noturno"],
        "Psicologia": ["Matutino", "Noturno"],
        "Publicidade e Propaganda": ["Matutino", "Noturno"],
        "Quiropraxia": ["Matutino", "Noturno"],
        "Redes de Computadores": ["Matutino", "Noturno"],
        "Serviço Social": ["Noturno"],
        "Sistemas de Informação": ["Matutino", "Noturno"],
        "Tecnologia em Análise e Desenvolvimento de Sistemas": ["Matutino", "Noturno"],
        "Tecnologia em Design Gráfico": ["Matutino", "Noturno"],
        "Tecnologia em Estética e Cosmética": ["Matutino", "Noturno"],
        "Tecnologia em Gastronomia": ["Matutino", "Noturno"],
        "Tecnologia em Gestão da Qualidade": ["Matutino", "Noturno"],
        "Tecnologia em Gestão de Recursos Humanos": ["Matutino", "Noturno"],
        "Tecnologia em Logística": ["Matutino", "Noturno"],
        "Tecnologia em Marketing": ["Matutino", "Noturno"],
        "Tecnologia em Radiologia": ["Matutino", "Noturno"],
        "Tecnologia em Segurança no Trabalho": ["Noturno"],
        "Turismo": ["Noturno"],
      }),

      hibrido: expandFixedTurnos(
        [
          "Administração",
          "Biomedicina",
          "Engenharia Ambiental",
          "Engenharia Civil",
          "Engenharia de Produção",
          "Engenharia Elétrica",
          "Engenharia Mecânica",
          "Farmácia",
          "Fisioterapia",
          "Fonoaudiologia",
          "Nutrição",
        ],
        ["Matutino", "Noturno"]
      ),

      // Semipresencial (modal) = Noturno + Flex (sempre)
      semipresencial: [
        "Nutrição",
        "Farmácia",
        "Análise e Desenvolvimento de Sistemas",
        "Ciências Contábeis",
        "Biomedicina",
        "Fisioterapia",
        "Pedagogia",
        "Educação Física Bacharelado",
        "Administração",
        "Educação Física Licenciatura",
        "Engenharia Civil",
        "Engenharia Elétrica",
        "Letras",
        "Psicopedagogia",
        "Serviço Social",
        "Logística",
        "Engenharia de Software",
        "Estética e Cosmética",
      ],

      ead: [
        "Administração",
        "Ciências Contábeis",
        "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Pública",
        "Tecnologia em Logística",
        "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública",
        "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão da Qualidade",
      ],
    },

    leste: {
      presencial: expandFixedTurnos(
        [
          "Administração",
          "Análise e Desenvolvimento de Sistemas",
          "Biomedicina",
          "Ciências Contábeis",
          "Direito",
          "Educação Física Bacharelado",
          "Educação Física Licenciatura",
          "Enfermagem",
          "Engenharia Ambiental e Energias Renováveis",
          "Engenharia Civil",
          "Engenharia de Produção",
          "Engenharia Elétrica",
          "Farmácia",
          "Fisioterapia",
          "Jornalismo",
          "Nutrição",
          "Pedagogia",
          "Psicologia",
          "Serviço Social",
          "Sistemas de Informação",
          "Tecnologia em Design Gráfico",
          "Tecnologia em Estética e Cosmética",
          "Tecnologia em Gastronomia",
          "Tecnologia em Gestão da Qualidade",
          "Tecnologia em Gestão de Recursos Humanos",
          "Tecnologia em Logística",
          "Tecnologia em Marketing",
          "Tecnologia em Radiologia",
          "Tecnologia em Segurança no Trabalho",
        ],
        ["Matutino", "Noturno"]
      ),

      hibrido: expandFixedTurnos(
        [
          "Administração",
          "Biomedicina",
          "Engenharia Ambiental",
          "Engenharia Civil",
          "Engenharia de Produção",
          "Engenharia Elétrica",
          "Engenharia Mecânica",
          "Farmácia",
          "Fisioterapia",
          "Nutrição",
        ],
        ["Matutino", "Noturno"]
      ),

      semipresencial: [
        "Administração",
        "Análise e Desenvolvimento de Sistemas",
        "Biomedicina",
        "Ciências Contábeis",
        "Educação Física Bacharelado",
        "Educação Física Licenciatura",
        "Engenharia de Software",
        "Estética e Cosmética",
        "Fisioterapia",
        "Letras",
        "Logística",
        "Nutrição",
        "Pedagogia",
        "Psicopedagogia",
        "Serviço Social",
      ],

      ead: [
        "Administração",
        "Ciências Contábeis",
        "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade",
        "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública",
        "Tecnologia em Logística",
        "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública",
      ],
    },

    sul: {
      presencial: expandTurnosMap({
        "Administração": ["Matutino", "Noturno"],
        "Análise e Desenvolvimento de Sistemas": ["Matutino", "Noturno"],
        "Biomedicina": ["Matutino", "Noturno"],
        "Ciências Contábeis": ["Matutino", "Noturno"],
        "Direito": ["Matutino", "Noturno"],
        "Educação Física Bacharelado": ["Matutino", "Noturno"],
        "Educação Física Licenciatura": ["Matutino", "Noturno"],
        "Enfermagem": ["Matutino", "Noturno"],
        "Engenharia Civil": ["Matutino", "Noturno"],
        "Engenharia de Produção": ["Matutino", "Noturno"],
        "Engenharia Elétrica": ["Matutino", "Noturno"],
        "Engenharia Mecânica": ["Matutino", "Noturno"],
        "Engenharia de Software": ["Noturno"],
        "Farmácia": ["Matutino", "Noturno"],
        "Fisioterapia": ["Matutino", "Noturno"],
        "Nutrição": ["Matutino", "Noturno"],
        "Pedagogia": ["Matutino", "Noturno"],
        "Psicologia": ["Matutino", "Noturno"],
        "Serviço Social": ["Noturno"],
        "Sistemas de Informação": ["Matutino", "Noturno"],
        "Tecnologia em Design Gráfico": ["Noturno"],
        "Tecnologia em Estética e Cosmética": ["Matutino", "Noturno"],
        "Tecnologia em Gestão da Qualidade": ["Matutino", "Noturno"],
        "Tecnologia em Gestão de Recursos Humanos": ["Matutino", "Noturno"],
        "Tecnologia em Logística": ["Matutino", "Noturno"],
        "Tecnologia em Marketing": ["Matutino", "Noturno"],
        "Tecnologia em Radiologia": ["Noturno"],
        "Tecnologia em Segurança no Trabalho": ["Noturno"],
        "Terapia Ocupacional": ["Noturno"],
      }),

      hibrido: expandFixedTurnos(
        [
          "Administração",
          "Biomedicina",
          "Engenharia Ambiental",
          "Engenharia Civil",
          "Engenharia de Produção",
          "Engenharia Elétrica",
          "Engenharia Mecânica",
          "Farmácia",
          "Fisioterapia",
          "Fonoaudiologia",
          "Logística",
          "Nutrição",
        ],
        ["Matutino", "Noturno"]
      ),

      semipresencial: [
        "Administração",
        "Análise e Desenvolvimento de Sistemas",
        "Biomedicina",
        "Ciências Contábeis",
        "Educação Física Bacharelado",
        "Educação Física Licenciatura",
        "Engenharia de Software",
        "Estética e Cosmética",
        "Fisioterapia",
        "Letras",
        "Nutrição",
        "Pedagogia",
        "Psicopedagogia",
        "Serviço Social",
        "Tecnologia em Logística",
      ],

      ead: [
        "Administração",
        "Ciências Contábeis",
        "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade",
        "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública",
        "Tecnologia em Logística",
        "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública",
      ],
    },

    norte: {
      presencial: expandFixedTurnos(
        [
          "Administração",
          "Biomedicina",
          "Ciências Contábeis",
          "Direito",
          "Educação Física Bacharelado",
          "Enfermagem",
          "Engenharia da Computação",
          "Farmácia",
          "Fisioterapia",
          "Nutrição",
          "Pedagogia",
          "Psicologia",
          "Tecnologia em Análise e Desenvolvimento de Sistemas",
          "Tecnologia em Estética e Cosmética",
          "Tecnologia em Gestão da Qualidade",
          "Tecnologia em Gestão de Recursos Humanos",
          "Tecnologia em Logística",
          "Tecnologia em Marketing",
        ],
        ["Matutino", "Noturno"]
      ),

      hibrido: expandFixedTurnos(
        [
          "Administração",
          "Biomedicina",
          "Engenharia Ambiental",
          "Engenharia Civil",
          "Engenharia de Produção",
          "Engenharia Elétrica",
          "Engenharia Mecânica",
          "Farmácia",
          "Fisioterapia",
          "Fonoaudiologia",
          "Nutrição",
        ],
        ["Matutino", "Noturno"]
      ),

      semipresencial: [
        "Administração",
        "Biomedicina",
        "Ciências Contábeis",
        "Educação Física Bacharelado",
        "Educação Física Licenciatura",
        "Engenharia de Software",
        "Fisioterapia",
        "Letras",
        "Nutrição",
        "Pedagogia",
        "Psicopedagogia",
        "Serviço Social",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Estética e Cosmética",
        "Tecnologia em Logística",
      ],

      ead: [
        "Administração",
        "Ciências Contábeis",
        "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade",
        "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública",
        "Tecnologia em Logística",
        "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública",
      ],
    },

    // BACK ONLY (Oeste no front aponta pra cá)
    compensa: {
      presencial: expandTurnosMap({
        "Administração": ["Matutino", "Noturno"],
        "Biomedicina": ["Matutino", "Noturno"],
        "Ciências Contábeis": ["Matutino", "Noturno"],
        "Direito": ["Matutino", "Noturno"],
        "Enfermagem": ["Matutino", "Noturno"],
        "Estética e Cosmética": ["Matutino", "Noturno"],
        "Farmácia": ["Matutino", "Noturno"],
        "Logística": ["Matutino", "Noturno"],
        "Marketing": ["Matutino", "Noturno"],
        "Nutrição": ["Matutino", "Noturno"],
        "Pedagogia": ["Matutino", "Noturno"],
        "Psicologia": ["Matutino", "Noturno"],
        "Recursos Humanos": ["Matutino", "Noturno"],
      }),

      hibrido: [], // não oferece

      semipresencial: [
        "Administração",
        "Ciências Contábeis",
        "Pedagogia",
        "Educação Física Bacharelado",
        "Educação Física Licenciatura",
        "Letras",
        "Psicopedagogia",
        "Serviço Social",
        "Logística",
        "Engenharia de Software",
      ],

      ead: [
        "Administração",
        "Ciências Contábeis",
        "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade",
        "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública",
        "Tecnologia em Logística",
        "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública",
      ],
    },
  };

  // ---------- Builder (catalog + offers) ----------
  const build = (raw) => {
    const catalog = Object.create(null);
    const offers = Object.create(null);

    const ensureCourse = (canonicalName) => {
      const name = canonicalizeName(canonicalName);
      const id = toId(name);
      if (!catalog[id]) {
        catalog[id] = {
          id,
          name,
          degree: name.toLowerCase().startsWith("tecnologia em ") ? "tecnologo" : "nao_definido",
          // futuro: duration, price, etc.
        };
      }
      return id;
    };

    const addOffer = (unitKey, modalityKey, courseId, turnos) => {
      offers[unitKey] ||= Object.create(null);
      offers[unitKey][modalityKey] ||= Object.create(null); // map id -> {id, turnos[]}
      const slot = offers[unitKey][modalityKey];

      if (!slot[courseId]) slot[courseId] = { id: courseId, turnos: [] };
      slot[courseId].turnos = uniq(slot[courseId].turnos.concat(turnos));
    };

    for (const [unitKey, unitObj] of Object.entries(raw)) {
      for (const [modalityKey, list] of Object.entries(unitObj)) {
        const isSemi = modalityKey === "semipresencial";
        const isEad = modalityKey === "ead";

        const forceTurnos = isSemi ? ["Noturno", "Flex"] : isEad ? ["Online"] : null;

        const items = Array.isArray(list) ? list : [];
        for (const item of items) {
          if (typeof item === "string") {
            const id = ensureCourse(item);
            addOffer(unitKey, modalityKey, id, forceTurnos || []);
            continue;
          }
          if (item && typeof item === "object") {
            const id = ensureCourse(item.nome);
            const t = forceTurnos || (item.turno ? [String(item.turno)] : []);
            addOffer(unitKey, modalityKey, id, t);
          }
        }
      }
    }

    // Transform maps -> arrays sorted alphabetically
    const offersFinal = Object.create(null);
    for (const [unitKey, unitObj] of Object.entries(offers)) {
      offersFinal[unitKey] = Object.create(null);
      for (const [modalityKey, map] of Object.entries(unitObj)) {
        const arr = Object.values(map)
          .map((x) => ({ id: x.id, turnos: uniq(x.turnos) }))
          .sort((a, b) => catalog[a.id].name.localeCompare(catalog[b.id].name, "pt-BR"));
        offersFinal[unitKey][modalityKey] = arr;
      }
    }

    return {
      catalog,
      offers: offersFinal,
      canonicalizeName,
      toId,
    };
  };

  window.COURSES = build(RAW_OFFERS);
})();
