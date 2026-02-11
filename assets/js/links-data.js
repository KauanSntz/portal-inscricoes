/* assets/js/links-data.js */
(() => {
  "use strict";

  /**
   * Estrutura:
   * window.PORTAL_LINKS = [
   *  {
   *    key: "sede",
   *    title: "SEDE",
   *    theme: "sede",
   *    coursesKey: "sede",
   *    blocks: {
   *      presencial: { title, links:[{code,type,modality,href},{...}] },
   *      ...
   *    }
   *  }
   * ]
   */

  const makeLink = (code, type, modality, href) => ({ code, type, modality, href });

  window.PORTAL_LINKS = [
    {
      key: "sede",
      title: "SEDE",
      theme: "sede",
      coursesKey: "sede",
      blocks: {
        presencial: {
          title: "Presencial",
          links: [
            makeLink("3115", "Vestibular Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3115#/es/inscricoeswizard"),
            makeLink("3120", "Matrícula Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3120#/es/inscricoeswizard"),
          ],
        },
        hibrido: {
          title: "Híbrido",
          links: [
            makeLink("3118", "Vestibular Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3118#/es/inscricoeswizard"),
            makeLink("3123", "Matrícula Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3123#/es/inscricoeswizard"),
          ],
        },
        semipresencial: {
          title: "Semipresencial",
          links: [
            makeLink("3117", "Vestibular Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3117#/es/inscricoeswizard"),
            makeLink("3122", "Matrícula Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3122#/es/inscricoeswizard"),
          ],
        },
        flex: {
          title: "Semipresencial Flex",
          links: [
            makeLink("3119", "Vestibular Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3119#/es/inscricoeswizard"),
            makeLink("3124", "Matrícula Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3124#/es/inscricoeswizard"),
          ],
        },
        ead: {
          title: "EAD (100% Online)",
          links: [
            makeLink("3116", "Vestibular Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3116#/es/inscricoeswizard"),
            makeLink("3121", "Matrícula Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3121#/es/inscricoeswizard"),
          ],
        },
      },
    },

    {
      key: "leste",
      title: "LESTE",
      theme: "leste",
      coursesKey: "leste",
      blocks: {
        presencial: {
          title: "Presencial",
          links: [
            makeLink("3125", "Vestibular Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3125#/es/inscricoeswizard"),
            makeLink("3131", "Matrícula Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3131#/es/inscricoeswizard"),
          ],
        },
        hibrido: {
          title: "Híbrido",
          links: [
            makeLink("3128", "Vestibular Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3128#/es/inscricoeswizard"),
            makeLink("3134", "Matrícula Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3134#/es/inscricoeswizard"),
          ],
        },
        semipresencial: {
          title: "Semipresencial",
          links: [
            makeLink("3127", "Vestibular Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3127#/es/inscricoeswizard"),
            makeLink("3133", "Matrícula Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3133#/es/inscricoeswizard"),
          ],
        },
        flex: {
          title: "Semipresencial Flex",
          links: [
            makeLink("3130", "Vestibular Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3130#/es/inscricoeswizard"),
            makeLink("3135", "Matrícula Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3135#/es/inscricoeswizard"),
          ],
        },
        ead: {
          title: "EAD (100% Online)",
          links: [
            makeLink("3126", "Vestibular Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3126#/es/inscricoeswizard"),
            makeLink("3132", "Matrícula Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3132#/es/inscricoeswizard"),
          ],
        },
      },
    },

    {
      key: "sul",
      title: "SUL",
      theme: "sul",
      coursesKey: "sul",
      blocks: {
        presencial: {
          title: "Presencial",
          links: [
            makeLink("3136", "Vestibular Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3136#/es/inscricoeswizard"),
            makeLink("3141", "Matrícula Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3141#/es/inscricoeswizard"),
          ],
        },
        hibrido: {
          title: "Híbrido",
          links: [
            makeLink("3139", "Vestibular Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3139#/es/inscricoeswizard"),
            makeLink("3144", "Matrícula Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3144#/es/inscricoeswizard"),
          ],
        },
        semipresencial: {
          title: "Semipresencial",
          links: [
            makeLink("3138", "Vestibular Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3138#/es/inscricoeswizard"),
            makeLink("3143", "Matrícula Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3143#/es/inscricoeswizard"),
          ],
        },
        flex: {
          title: "Semipresencial Flex",
          links: [
            makeLink("3140", "Vestibular Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3140#/es/inscricoeswizard"),
            makeLink("3145", "Matrícula Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3145#/es/inscricoeswizard"),
          ],
        },
        ead: {
          title: "EAD (100% Online)",
          links: [
            makeLink("3137", "Vestibular Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3137#/es/inscricoeswizard"),
            makeLink("3142", "Matrícula Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3142#/es/inscricoeswizard"),
          ],
        },
      },
    },

    {
      key: "norte",
      title: "NORTE",
      theme: "norte",
      coursesKey: "norte",
      blocks: {
        presencial: {
          title: "Presencial",
          links: [
            makeLink("326", "Vestibular Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=3&f=1&ps=326#/es/inscricoeswizard/dados-basicos"),
            makeLink("325", "Matrícula Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=3&f=1&ps=325#/es/inscricoeswizard/dados-basicos"),
          ],
        },
        hibrido: {
          title: "Híbrido",
          links: [
            makeLink("3148", "Vestibular Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3148#/es/inscricoeswizard"),
            makeLink("3152", "Matrícula Online", "Híbrido", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3152#/es/inscricoeswizard"),
          ],
        },
        semipresencial: {
          title: "Semipresencial",
          links: [
            makeLink("3147", "Vestibular Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3147#/es/inscricoeswizard"),
            makeLink("3151", "Matrícula Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3151#/es/inscricoeswizard"),
          ],
        },
        flex: {
          title: "Semipresencial Flex",
          links: [
            makeLink("3149", "Vestibular Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3149#/es/inscricoeswizard"),
            makeLink("3153", "Matrícula Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3153#/es/inscricoeswizard"),
          ],
        },
        ead: {
          title: "EAD (100% Online)",
          links: [
            makeLink("3146", "Vestibular Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3146#/es/inscricoeswizard"),
            makeLink("3150", "Matrícula Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3150#/es/inscricoeswizard"),
          ],
        },
      },
    },

    // FRONT = OESTE, BACK = COMPENSA
    {
      key: "oeste",
      title: "OESTE — COMPENSA",
      theme: "oeste",
      coursesKey: "compensa",
      blocks: {
        presencial: {
          title: "Presencial",
          links: [
            makeLink("331", "Vestibular Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=3&f=6&ps=331#/es/inscricoeswizard/dados-basicos"),
            makeLink("332", "Matrícula Online", "Presencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=3&f=6&ps=332#/es/inscricoeswizard/dados-basicos"),
          ],
        },
        hibrido: { title: "Híbrido", links: [] }, // Compensa não oferece híbrido
        semipresencial: {
          title: "Semipresencial",
          links: [
            makeLink("3117", "Vestibular Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3117#/es/inscricoeswizard"),
            makeLink("3122", "Matrícula Online", "Semipresencial", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3122#/es/inscricoeswizard"),
          ],
        },
        flex: {
          title: "Semipresencial Flex",
          links: [
            makeLink("3119", "Vestibular Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3119#/es/inscricoeswizard"),
            makeLink("3124", "Matrícula Online", "Semi Flex", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3124#/es/inscricoeswizard"),
          ],
        },
        ead: {
          title: "EAD (100% Online)",
          links: [
            makeLink("3116", "Vestibular Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3116#/es/inscricoeswizard"),
            makeLink("3121", "Matrícula Online", "100% EAD", "https://inscricao.fametro.edu.br/FrameHTML/web/app/Edu/PortalProcessoSeletivo/?c=1&f=1&ps=3121#/es/inscricoeswizard"),
          ],
        },
      },
    },
  ];
})();
