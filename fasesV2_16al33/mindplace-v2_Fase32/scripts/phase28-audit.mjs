import fs from 'node:fs';
const checks = [
  ['src/services/advanced-search.ts', /parseAdvancedQuery|searchCase|SavedSearch/],
  ['src/views/Phase28View.vue', /AND|OR|NOT|Búsquedas guardadas|typeFilter|dateFrom/],
  ['src/router/index.ts', /fase-28/],
  ['src/components/MobileExperience.vue', /router\.push\('\/fase-28'\)/],
  ['src/components/LegacyWorkspace.vue', /fase-28/],
  ['tests/phase28-advanced-search.test.mjs', /AND combina criterios|NOT excluye/]
];
let ok=true;
for (const [file, pattern] of checks) { const exists=fs.existsSync(file); const content=exists?fs.readFileSync(file,'utf8'):''; const pass=exists && pattern.test(content); console.log(`${pass?'PASS':'FAIL'} ${file}`); if(!pass) ok=false; }
console.log(`FASE 28 AUDIT: ${ok?'PASS':'FAIL'}`);
if(!ok) process.exit(1);
