const https = require('https');
const BASE = 'https://opensheet.elk.sh/1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';
const abas = ['Pós Ao vivo', 'Pós Ao Vivo', 'pós ao vivo', 'pos ao vivo', 'Pos Ao Vivo'];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
    }).on('error', reject);
  });
}

(async () => {
  for (const aba of abas) {
    const url = BASE + '/' + encodeURIComponent(aba);
    const data = await fetchJson(url);
    if (Array.isArray(data) && data.length > 0) {
      console.log('ENCONTRADO:', aba, '- Registros:', data.length);
      console.log('Colunas:', Object.keys(data[0]));
      console.log('Primeiro:', JSON.stringify(data[0]));
    } else {
      console.log('ERRO/VAZIO:', aba);
    }
  }
})();
