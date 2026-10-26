const { google } = require('googleapis');
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';

let authClient = null;

async function getAuthClient() {
  if (authClient) return authClient;

  let key;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    key = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './assets/credentials/sheets-creds.json';
    const keyPath = path.resolve(credentialsPath);
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Credentials file not found: ${keyPath}`);
    }
    key = require(keyPath);
  }
  
  authClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'],
    null
  );

  await authClient.authorize();
  console.log('[CRUD] Google Sheets auth OK');
  return authClient;
}

async function getSheet(sheetTitle) {
  const auth = await getAuthClient();
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    auth
  });

  const sheet = response.data.sheets.find(s => s.properties.title === sheetTitle);
  if (!sheet) {
    throw new Error(`Sheet "${sheetTitle}" not found`);
  }

  return sheet.properties;
}

async function getAllRows(sheetTitle) {
  const auth = await getAuthClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A:Z`,
    auth
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });

  return data;
}

/**
 * Lê a aba inteira em uma única chamada.
 * Cada linha recebe `_row` (número da linha na planilha) para permitir atualizações pontuais.
 */
async function getSheetData(sheetTitle) {
  const auth = await getAuthClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A:Z`,
    auth
  });

  const values = response.data.values || [];
  const headers = (values[0] || []).map(h => String(h).trim().toLowerCase());
  const rows = values.slice(1).map((row, i) => {
    const obj = { _row: i + 2 };
    headers.forEach((h, j) => {
      obj[h] = row[j] !== undefined && row[j] !== null ? String(row[j]) : '';
    });
    return obj;
  });

  return { headers, rows };
}

// 0 -> A, 25 -> Z, 26 -> AA
function columnLetter(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Garante que as colunas existam no cabeçalho (ex: deleted_at).
 * Sem isso, campos fora do cabeçalho são descartados silenciosamente na escrita.
 */
async function ensureHeaders(sheetTitle, headers, required) {
  const missing = required.filter(h => !headers.includes(h));
  if (missing.length === 0) return headers;

  const auth = await getAuthClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!${columnLetter(headers.length)}1`,
    valueInputOption: 'RAW',
    auth,
    requestBody: { values: [missing] }
  });

  console.log(`[CRUD] Colunas adicionadas em ${sheetTitle}: ${missing.join(', ')}`);
  return [...headers, ...missing];
}

/**
 * Atualiza células específicas em uma única requisição.
 * @param {Array<{row: number, field: string, value: string}>} changes
 */
async function updateCells(sheetTitle, headers, changes) {
  if (changes.length === 0) return;
  const auth = await getAuthClient();

  const data = changes.map(c => {
    const col = headers.indexOf(c.field);
    if (col < 0) throw new Error(`Coluna "${c.field}" não existe em ${sheetTitle}`);
    return {
      range: `${sheetTitle}!${columnLetter(col)}${c.row}`,
      values: [[c.value === undefined || c.value === null ? '' : String(c.value)]]
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    auth,
    requestBody: { valueInputOption: 'RAW', data }
  });

  console.log(`[CRUD] ${changes.length} célula(s) atualizada(s) em ${sheetTitle}`);
}

/**
 * Adiciona várias linhas no fim da aba em uma única requisição.
 */
async function appendRows(sheetTitle, headers, items) {
  if (items.length === 0) return;
  const auth = await getAuthClient();

  const values = items.map(item =>
    headers.map(h => (item[h] !== undefined && item[h] !== null ? String(item[h]) : ''))
  );

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    auth,
    requestBody: { values }
  });

  console.log(`[CRUD] ${items.length} linha(s) adicionada(s) em ${sheetTitle}`);
}

async function findRowByField(sheetTitle, field, value) {
  const rows = await getAllRows(sheetTitle);
  return rows.find(row => String(row[field]) === String(value));
}

async function findRowIndex(sheetTitle, field, value) {
  const rows = await getAllRows(sheetTitle);
  const idx = rows.findIndex(row => String(row[field]) === String(value));
  return idx >= 0 ? idx + 2 : -1;
}

async function appendRow(sheetTitle, data) {
  const auth = await getAuthClient();
  
  const headers = await getHeaders(sheetTitle);
  const rows = await getAllRows(sheetTitle);
  const nextRow = rows.length + 2;

  const values = headers.map(h => data[h] || '');
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A${nextRow}`,
    valueInputOption: 'RAW',
    auth,
    requestBody: {
      values: [values]
    }
  });

  console.log(`[CRUD] Added row ${nextRow} in ${sheetTitle}`);
  return { row: nextRow, data };
}

async function updateRow(sheetTitle, field, fieldValue, data) {
  const auth = await getAuthClient();
  
  const headers = await getHeaders(sheetTitle);
  const rows = await getAllRows(sheetTitle);
  const idx = rows.findIndex(row => String(row[field]) === String(fieldValue));
  
  if (idx < 0) {
    return null;
  }

  const rowIndex = idx + 2; // +1 for header, +1 for 1-indexed
  const existing = rows[idx];

  // Merge: existing data + new data (new data wins)
  const merged = { ...existing, ...data };
  const values = headers.map(h => merged[h] !== undefined && merged[h] !== null ? String(merged[h]) : '');
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A${rowIndex}`,
    valueInputOption: 'RAW',
    auth,
    requestBody: {
      values: [values]
    }
  });

  console.log(`[CRUD] Updated row ${rowIndex} in ${sheetTitle}`);
  return { row: rowIndex, data: merged };
}

async function deleteRow(sheetTitle, field, fieldValue) {
  // Soft delete: preserva todos os dados existentes e apenas marca deleted_at.
  // A coluna precisa existir no cabeçalho, senão o valor é descartado e nada acontece.
  await ensureHeaders(sheetTitle, await getHeaders(sheetTitle), ['deleted_at']);
  return updateRow(sheetTitle, field, fieldValue, {
    deleted_at: new Date().toISOString()
  });
}

async function getHeaders(sheetTitle) {
  const auth = await getAuthClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!1:1`,
    auth
  });

  return ((response.data.values && response.data.values[0]) || []).map(h => String(h).trim().toLowerCase());
}

module.exports = {
  getAllRows,
  getSheetData,
  findRowByField,
  findRowIndex,
  appendRow,
  appendRows,
  updateRow,
  updateCells,
  deleteRow,
  ensureHeaders,
  getHeaders,
  SPREADSHEET_ID
};