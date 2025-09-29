#!/usr/bin/env node

/**
 * Script per verificare che il deployment in produzione abbia le correzioni più recenti
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifica deployment...\n');

// Verifica che TabellaFile.tsx abbia la correzione
const tabellaFile = fs.readFileSync(path.join(__dirname, '../src/components/TabellaFile.tsx'), 'utf8');

if (tabellaFile.includes('getOrderUrl(riga: RigaFile)')) {
  console.log('✅ TabellaFile.tsx: Correzione URL parameters presente');
} else {
  console.log('❌ TabellaFile.tsx: Correzione URL parameters MANCANTE');
}

if (tabellaFile.includes('URLSearchParams')) {
  console.log('✅ TabellaFile.tsx: URLSearchParams implementato');
} else {
  console.log('❌ TabellaFile.tsx: URLSearchParams MANCANTE');
}

// Verifica che CreateOrderContent abbia il debug logging
const createOrderPage = fs.readFileSync(path.join(__dirname, '../src/app/dashboard/orders/create/page.tsx'), 'utf8');

if (createOrderPage.includes('CreateOrderContent: URL parameters received')) {
  console.log('✅ CreateOrderPage: Debug logging presente');
} else {
  console.log('❌ CreateOrderPage: Debug logging MANCANTE');
}

if (createOrderPage.includes('1.0.1-fix-order-params')) {
  console.log('✅ CreateOrderPage: Versione corretta presente');
} else {
  console.log('❌ CreateOrderPage: Versione corretta MANCANTE');
}

console.log('\n📋 Istruzioni per il deployment:');
console.log('1. Esegui: npm run build');
console.log('2. Verifica che non ci siano errori di build');
console.log('3. Deploya in produzione');
console.log('4. Apri DevTools Console in produzione');
console.log('5. Cerca i log "CreateOrderContent:" e "TabellaFile:" per verificare il funzionamento');
console.log('6. Se i log non appaiono, il browser sta usando una versione cached');

console.log('\n🚀 Per forzare il refresh della cache:');
console.log('- Hard refresh: Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)');
console.log('- Oppure apri DevTools > Network > Disable cache > Refresh');
