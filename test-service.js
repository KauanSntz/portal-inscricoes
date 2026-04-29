const sheetsCrud = require('./services/sheetsCrudService');

async function test() {
  try {
    console.log('1. Testing findRowByField...');
    const existing = await sheetsCrud.findRowByField('unidades', 'unidade_id', 'sede');
    console.log('Found:', existing);
    
    console.log('2. Testing appendRow...');
    const result = await sheetsCrud.appendRow('unidades', {
      unidade_id: 'teste_debug',
      nome: 'TESTE DEBUG',
      tipo: 'polo',
      ordem: '99',
      ativo: 'SIM',
      deleted_at: ''
    });
    console.log('Result:', result);
    
    console.log('SUCCESS!');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
}

test();