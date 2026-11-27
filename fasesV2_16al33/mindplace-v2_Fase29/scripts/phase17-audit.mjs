import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

for (const rel of [
  'src/components/MobileExperience.vue',
  'src/domain/state.ts',
  'src/stores/ui.ts',
  'src/views/Phase17View.vue',
  'tests/phase17-mobile.test.mjs',
  'docs/FASE17_FINAL.md'
]) assert.ok(existsSync(path.join(ROOT, rel)), `Falta ${rel}`);

const vue = read('src/components/MobileExperience.vue');
assert.match(vue, /Casos/);
assert.match(vue, /Tablero/);
assert.match(vue, /Añadir/);
assert.match(vue, /Buscar/);
assert.match(vue, /Más/);
assert.match(vue, /@media \(max-width: 900px\)/);
assert.match(vue, /env\(safe-area-inset-bottom\)/);
assert.match(vue, /mobile-sheet/);

const ui = read('src/stores/ui.ts');
assert.match(ui, /setMobilePanel/);
assert.match(ui, /setMobileNavMode/);

const app = read('js/app.js');
assert.match(app, /mindplace:mobile-command/);
assert.doesNotMatch(app, /unsafe-inline/);

const packageJson = JSON.parse(read('package.json'));
assert.equal(packageJson.scripts['test:phase17'], 'node --test tests/phase17-mobile.test.mjs && node scripts/phase17-audit.mjs');
console.log('FASE 17 — AUDITORÍA PASS — puntos 209-220 implementados.');
