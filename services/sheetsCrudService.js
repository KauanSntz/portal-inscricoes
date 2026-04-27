const { google } = require('googleapis');
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';

let authClient = null;

async function getAuthClient() {
  if (authClient) return authClient;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/sheets-creds.json';
  
  const keyPath = path.resolve(credentialsPath);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Credentials file not found: ${keyPath}`);
  }
  
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  const key = JSON.parse(keyContent);
  
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

async function findRowByField(sheetTitle, field, value) {
  const rows = await getAllRows(sheetTitle);
  return rows.find(row => row[field] === value);
}

async function findRowIndex(sheetTitle, field, value) {
  const rows = await getAllRows(sheetTitle);
  const idx = rows.findIndex(row => row[field] === value);
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
  const rowIndex = await findRowIndex(sheetTitle, field, fieldValue);
  
  if (rowIndex < 0) {
    return null;
  }

  const values = headers.map(h => data[h] || '');
  
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
  return { row: rowIndex, data };
}

async function deleteRow(sheetTitle, field, fieldValue) {
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

  return (response.data.values[0] || []).map(h => h.trim().toLowerCase());
}

module.exports = {
  getAllRows,
  findRowByField,
  findRowIndex,
  appendRow,
  updateRow,
  deleteRow,
  getHeaders,
  SPREADSHEET_ID
};