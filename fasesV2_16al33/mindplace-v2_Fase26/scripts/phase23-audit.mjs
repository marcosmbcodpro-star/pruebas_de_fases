import fs from 'node:fs';
import assert from 'node:assert/strict';
const required = [
  ['js/core/save-state.js','gestor de estado y borradores'],
  ['tests/phase23-save-recovery.test.mjs','tests Fase 23'],
  ['js/app.js','integración del autosave y recuperación'],
  ['js/core/persistence.js','confirmación post-guardado'],
  ['css/20-phase23-save-recovery.css','indicador visual'],
  ['docs/FASE23_FINAL.md','documentación'],
  ['index_mejoras.html','estado visual de guardado']
];
for (const [file,label] of required) assert.ok(fs.existsSync(file), `${label}: ${file}`);
const app=fs.readFileSync('js/app.js','utf8');
const persistence=fs.readFileSync('js/core/persistence.js','utf8');
const css=fs.readFileSync('css/20-phase23-save-recovery.css','utf8');
assert.match(app,/visibilitychange/); assert.match(app,/pagehide/); assert.match(app,/beforeunload/);
assert.match(persistence,/confirmación de guardado/); assert.match(persistence,/onSaveStatus/);
assert.match(css,/save-status/);
console.log('FASE 23 AUDIT: PASS');
for (const [file] of required) console.log(`PASS ${file}`);
