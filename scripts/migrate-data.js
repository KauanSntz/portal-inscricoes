/**
 * Script de Migração: JSON/JS local → Google Sheets
 * 
 * Cria 3 novas abas na planilha:
 * - cursos_oferta (cursos por unidade/modalidade/turno)
 * - precos_cursos (preços por unidade/modalidade/plano)
 * - cursos_tecnicos (cursos técnicos por unidade/turno/valor)
 * 
 * Uso: node scripts/migrate-data.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';

async function getAuthClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './assets/credentials/sheets-creds.json';
  const keyPath = path.resolve(credentialsPath);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Credentials file not found: ${keyPath}`);
  }
  const key = require(keyPath);
  const auth = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'],
    null
  );
  await auth.authorize();
  return auth;
}

async function createSheetIfNotExists(sheets, auth, title) {
  const resp = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, auth });
  const exists = resp.data.sheets.some(s => s.properties.title === title);
  if (exists) {
    console.log(`  Aba "${title}" já existe, limpando dados...`);
    // Limpa tudo exceto header (vamos reescrever tudo)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A:Z`,
      auth
    });
    return;
  }
  console.log(`  Criando aba "${title}"...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    auth,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  });
}

async function writeData(sheets, auth, sheetTitle, headers, rows) {
  const values = [headers, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A1`,
    valueInputOption: 'RAW',
    auth,
    requestBody: { values }
  });
  console.log(`  ✅ ${rows.length} linhas escritas em "${sheetTitle}"`);
}

// =============================================
// 1. MIGRAR courses-data.js → cursos_oferta
// =============================================
function buildCursosOferta() {
  console.log('\n📦 Processando courses-data.js...');
  
  // Simular as funções do courses-data.js
  const expandTurnosMap = (turnosMap) =>
    Object.entries(turnosMap).flatMap(([nome, turnos]) =>
      (turnos || []).map(turno => ({ nome, turno }))
    );
  const expandFixedTurnos = (names, turnos) =>
    (names || []).flatMap(nome =>
      (turnos || []).map(turno => ({ nome, turno }))
    );

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
        ["Administração", "Biomedicina", "Engenharia Ambiental", "Engenharia Civil",
         "Engenharia de Produção", "Engenharia Elétrica", "Engenharia Mecânica",
         "Farmácia", "Fisioterapia", "Fonoaudiologia", "Nutrição"],
        ["Matutino", "Noturno"]
      ),
      semipresencial: ["Nutrição", "Farmácia", "Análise e Desenvolvimento de Sistemas",
        "Ciências Contábeis", "Biomedicina", "Fisioterapia", "Pedagogia",
        "Educação Física Bacharelado", "Administração", "Educação Física Licenciatura",
        "Engenharia Civil", "Engenharia Elétrica", "Letras", "Psicopedagogia",
        "Serviço Social", "Logística", "Engenharia de Software", "Estética e Cosmética"],
      ead: ["Administração", "Ciências Contábeis", "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Tecnologia da Informação", "Tecnologia em Gestão de Recursos Humanos",
        "Tecnologia em Gestão de Segurança Privada", "Tecnologia em Gestão Financeira",
        "Tecnologia em Gestão Pública", "Tecnologia em Logística", "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública", "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão da Qualidade"],
    },
    leste: {
      presencial: expandFixedTurnos(
        ["Administração", "Análise e Desenvolvimento de Sistemas", "Biomedicina",
         "Ciências Contábeis", "Direito", "Educação Física Bacharelado",
         "Educação Física Licenciatura", "Enfermagem", "Engenharia Ambiental e Energias Renováveis",
         "Engenharia Civil", "Engenharia de Produção", "Engenharia Elétrica", "Farmácia",
         "Fisioterapia", "Jornalismo", "Nutrição", "Pedagogia", "Psicologia",
         "Serviço Social", "Sistemas de Informação", "Tecnologia em Design Gráfico",
         "Tecnologia em Estética e Cosmética", "Tecnologia em Gastronomia",
         "Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão de Recursos Humanos",
         "Tecnologia em Logística", "Tecnologia em Marketing",
         "Tecnologia em Radiologia", "Tecnologia em Segurança no Trabalho"],
        ["Matutino", "Noturno"]
      ),
      hibrido: expandFixedTurnos(
        ["Administração", "Biomedicina", "Engenharia Ambiental", "Engenharia Civil",
         "Engenharia de Produção", "Engenharia Elétrica", "Engenharia Mecânica",
         "Farmácia", "Fisioterapia", "Nutrição"],
        ["Matutino", "Noturno"]
      ),
      semipresencial: ["Administração", "Análise e Desenvolvimento de Sistemas", "Biomedicina",
        "Ciências Contábeis", "Educação Física Bacharelado", "Educação Física Licenciatura",
        "Engenharia de Software", "Estética e Cosmética", "Fisioterapia", "Letras",
        "Logística", "Nutrição", "Pedagogia", "Psicopedagogia", "Serviço Social"],
      ead: ["Administração", "Ciências Contábeis", "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira", "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública", "Tecnologia em Logística", "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública"],
    },
    sul: {
      presencial: expandTurnosMap({
        "Administração": ["Matutino", "Noturno"], "Análise e Desenvolvimento de Sistemas": ["Matutino", "Noturno"],
        "Biomedicina": ["Matutino", "Noturno"], "Ciências Contábeis": ["Matutino", "Noturno"],
        "Direito": ["Matutino", "Noturno"], "Educação Física Bacharelado": ["Matutino", "Noturno"],
        "Educação Física Licenciatura": ["Matutino", "Noturno"], "Enfermagem": ["Matutino", "Noturno"],
        "Engenharia Civil": ["Matutino", "Noturno"], "Engenharia de Produção": ["Matutino", "Noturno"],
        "Engenharia Elétrica": ["Matutino", "Noturno"], "Engenharia Mecânica": ["Matutino", "Noturno"],
        "Engenharia de Software": ["Noturno"], "Farmácia": ["Matutino", "Noturno"],
        "Fisioterapia": ["Matutino", "Noturno"], "Nutrição": ["Matutino", "Noturno"],
        "Pedagogia": ["Matutino", "Noturno"], "Psicologia": ["Matutino", "Noturno"],
        "Serviço Social": ["Noturno"], "Sistemas de Informação": ["Matutino", "Noturno"],
        "Tecnologia em Design Gráfico": ["Noturno"], "Tecnologia em Estética e Cosmética": ["Matutino", "Noturno"],
        "Tecnologia em Gestão da Qualidade": ["Matutino", "Noturno"],
        "Tecnologia em Gestão de Recursos Humanos": ["Matutino", "Noturno"],
        "Tecnologia em Logística": ["Matutino", "Noturno"], "Tecnologia em Marketing": ["Matutino", "Noturno"],
        "Tecnologia em Radiologia": ["Noturno"], "Tecnologia em Segurança no Trabalho": ["Noturno"],
        "Terapia Ocupacional": ["Noturno"],
      }),
      hibrido: expandFixedTurnos(
        ["Administração", "Biomedicina", "Engenharia Ambiental", "Engenharia Civil",
         "Engenharia de Produção", "Engenharia Elétrica", "Engenharia Mecânica",
         "Farmácia", "Fisioterapia", "Fonoaudiologia", "Logística", "Nutrição"],
        ["Matutino", "Noturno"]
      ),
      semipresencial: ["Administração", "Análise e Desenvolvimento de Sistemas", "Biomedicina",
        "Ciências Contábeis", "Educação Física Bacharelado", "Educação Física Licenciatura",
        "Engenharia de Software", "Estética e Cosmética", "Fisioterapia", "Letras",
        "Nutrição", "Pedagogia", "Psicopedagogia", "Serviço Social", "Tecnologia em Logística"],
      ead: ["Administração", "Ciências Contábeis", "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira", "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública", "Tecnologia em Logística", "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública"],
    },
    norte: {
      presencial: expandFixedTurnos(
        ["Administração", "Biomedicina", "Ciências Contábeis", "Direito",
         "Educação Física Bacharelado", "Enfermagem", "Engenharia da Computação",
         "Farmácia", "Fisioterapia", "Nutrição", "Pedagogia", "Psicologia",
         "Tecnologia em Análise e Desenvolvimento de Sistemas",
         "Tecnologia em Estética e Cosmética", "Tecnologia em Gestão da Qualidade",
         "Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Logística",
         "Tecnologia em Marketing"],
        ["Matutino", "Noturno"]
      ),
      hibrido: expandFixedTurnos(
        ["Administração", "Biomedicina", "Engenharia Ambiental", "Engenharia Civil",
         "Engenharia de Produção", "Engenharia Elétrica", "Engenharia Mecânica",
         "Farmácia", "Fisioterapia", "Fonoaudiologia", "Nutrição"],
        ["Matutino", "Noturno"]
      ),
      semipresencial: ["Administração", "Biomedicina", "Ciências Contábeis",
        "Educação Física Bacharelado", "Educação Física Licenciatura",
        "Engenharia de Software", "Fisioterapia", "Letras", "Nutrição",
        "Pedagogia", "Psicopedagogia", "Serviço Social",
        "Tecnologia em Análise e Desenvolvimento de Sistemas",
        "Tecnologia em Estética e Cosmética", "Tecnologia em Logística"],
      ead: ["Administração", "Ciências Contábeis", "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira", "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública", "Tecnologia em Logística", "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública"],
    },
    compensa: {
      presencial: expandTurnosMap({
        "Administração": ["Matutino", "Noturno"], "Biomedicina": ["Matutino", "Noturno"],
        "Ciências Contábeis": ["Matutino", "Noturno"], "Direito": ["Matutino", "Noturno"],
        "Enfermagem": ["Matutino", "Noturno"], "Estética e Cosmética": ["Matutino", "Noturno"],
        "Farmácia": ["Matutino", "Noturno"], "Logística": ["Matutino", "Noturno"],
        "Marketing": ["Matutino", "Noturno"], "Nutrição": ["Matutino", "Noturno"],
        "Pedagogia": ["Matutino", "Noturno"], "Psicologia": ["Matutino", "Noturno"],
        "Recursos Humanos": ["Matutino", "Noturno"],
      }),
      hibrido: [],
      semipresencial: ["Administração", "Ciências Contábeis", "Pedagogia",
        "Educação Física Bacharelado", "Educação Física Licenciatura",
        "Letras", "Psicopedagogia", "Serviço Social", "Logística",
        "Engenharia de Software"],
      ead: ["Administração", "Ciências Contábeis", "Engenharia de Software",
        "Tecnologia em Análise e Desenvolvimento de Sistemas", "Tecnologia em Gestão Comercial",
        "Tecnologia em Gestão da Qualidade", "Tecnologia em Gestão da Tecnologia da Informação",
        "Tecnologia em Gestão de Recursos Humanos", "Tecnologia em Gestão de Segurança Privada",
        "Tecnologia em Gestão Financeira", "Tecnologia em Gestão Portuária",
        "Tecnologia em Gestão Pública", "Tecnologia em Logística", "Tecnologia em Marketing",
        "Tecnologia em Segurança Pública"],
    },
  };

  const rows = [];
  for (const [unitKey, unitObj] of Object.entries(RAW_OFFERS)) {
    for (const [modKey, list] of Object.entries(unitObj)) {
      const isSemi = modKey === 'semipresencial';
      const isEad = modKey === 'ead';

      const items = Array.isArray(list) ? list : [];
      for (const item of items) {
        if (typeof item === 'string') {
          // Semipresencial: Noturno + Flex, EAD: Online
          const turnos = isSemi ? ['Noturno', 'Flex'] : isEad ? ['Online'] : [''];
          for (const turno of turnos) {
            rows.push([unitKey, modKey, item, turno]);
          }
        } else if (item && typeof item === 'object') {
          rows.push([unitKey, modKey, item.nome, item.turno || '']);
        }
      }
    }
  }

  console.log(`  ${rows.length} registros de cursos_oferta`);
  return rows;
}

// =============================================
// 2. MIGRAR course_prices → precos_cursos
// =============================================
function buildPrecosCursos() {
  console.log('\n💰 Processando course_prices_2026_1_data.js...');
  
  // Ler o arquivo e extrair o JSON
  const content = fs.readFileSync(
    path.resolve(__dirname, '../assets/data/course_prices_2026_1_data.js'), 'utf-8'
  );
  
  // Extrair o objeto entre "window.COURSE_PRICES_2026_1 = " e o final ";"
  const match = content.match(/window\.COURSE_PRICES_2026_1\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) throw new Error('Não foi possível extrair dados de course_prices');
  
  // Usar eval com cuidado (só para migração local)
  const data = eval('(' + match[1] + ')');
  
  const rows = [];
  for (const record of data.records) {
    rows.push([
      record.unitKey || '',
      record.modalityKey || '',
      record.planKey || '',
      record.courseId || '',
      record.courseName || '',
      String(record.integralCents || ''),
      String(record.bolsaCents || ''),
      String(record.bolsaPontualidadeCents?.p10 || ''),
      String(record.bolsaPontualidadeCents?.p15 || ''),
      record.meta?.note || ''
    ]);
  }

  console.log(`  ${rows.length} registros de precos_cursos`);
  return rows;
}

// =============================================
// 3. MIGRAR cursos_tecnicos.json → cursos_tecnicos
// =============================================
function buildCursosTecnicos() {
  console.log('\n🔧 Processando cursos_tecnicos.json...');
  
  const data = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../assets/data/cursos_tecnicos.json'), 'utf-8')
  );
  
  const rows = [];
  for (const unidade of data) {
    for (const curso of unidade.cursos) {
      for (const turno of curso.turnos) {
        const valor = curso.valores?.[turno] || '';
        rows.push([
          unidade.unidade || '',
          unidade.endereco || '',
          curso.nome || '',
          curso.duracao || '',
          turno,
          String(valor),
          String(curso.primeiraMensalidade || '')
        ]);
      }
    }
  }

  console.log(`  ${rows.length} registros de cursos_tecnicos`);
  return rows;
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('🚀 Iniciando migração de dados para Google Sheets...\n');
  
  const auth = await getAuthClient();
  const sheets = google.sheets('v4');
  
  // 1. cursos_oferta
  const cursosOfertaRows = buildCursosOferta();
  await createSheetIfNotExists(sheets, auth, 'cursos_oferta');
  await writeData(sheets, auth, 'cursos_oferta',
    ['unidade_id', 'modalidade', 'curso', 'turno'],
    cursosOfertaRows
  );
  
  // 2. precos_cursos
  const precosCursosRows = buildPrecosCursos();
  await createSheetIfNotExists(sheets, auth, 'precos_cursos');
  await writeData(sheets, auth, 'precos_cursos',
    ['unidade_id', 'modalidade', 'plano', 'curso_id', 'curso_nome', 'integral_centavos', 'bolsa_centavos', 'bolsa_p10_centavos', 'bolsa_p15_centavos', 'observacao'],
    precosCursosRows
  );
  
  // 3. cursos_tecnicos
  const cursosTecnicosRows = buildCursosTecnicos();
  await createSheetIfNotExists(sheets, auth, 'cursos_tecnicos');
  await writeData(sheets, auth, 'cursos_tecnicos',
    ['unidade', 'endereco', 'curso', 'duracao', 'turno', 'valor', 'primeira_mensalidade'],
    cursosTecnicosRows
  );
  
  console.log('\n✅ Migração concluída com sucesso!');
  console.log('Verifique a planilha no Google Sheets para confirmar os dados.');
}

main().catch(err => {
  console.error('❌ Erro na migração:', err.message);
  process.exit(1);
});
