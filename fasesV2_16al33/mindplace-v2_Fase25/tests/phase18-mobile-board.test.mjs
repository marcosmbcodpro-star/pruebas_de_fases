import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

test('221-226: el tablero móvil tiene modos de enfoque y navegación por ramas', () => {
  const vue = read('src/components/MobileExperience.vue');
  const app = read('js/app.js');
  assert.match(vue, /mobile-board-controls/);
  assert.match(vue, /board-zoom-in/);
  assert.match(vue, /board-focus/);
  assert.match(vue, /board-branch/);
  assert.match(app, /window\.__mindplaceMobileBoardCommand/);
  assert.match(app, /centerBranch/);
});

test('222-223: tarjetas y controles se adaptan al tacto', () => {
  const css = read('css/13-responsive.css');
  assert.match(css, /\.card\{/);
  assert.match(css, /min-width: 190px/);
  assert.match(css, /touch-action: none/);
  assert.match(css, /min-height: 132px/);
});

test('224-228: enfoque sobre tarjeta y rama está implementado', () => {
  const css = read('css/13-responsive.css');
  const app = read('js/app.js');
  assert.match(css, /mobile-board-focus/);
  assert.match(css, /mobile-board-branch/);
  assert.match(app, /\'board-focus\': \(\) => centerSelected/);
  assert.match(app, /\'board-branch\': \(\) => centerBranch/);
});

test('229-230: minimapa móvil y herramientas no bloquean el área principal', () => {
  const css = read('css/13-responsive.css');
  assert.match(css, /#miniMap\{/);
  assert.match(css, /bottom: calc\(78px/);
  assert.match(css, /#miniMap\.mobile-open/);
  assert.match(css, /--mp-mobile-board-bottom/);
});

test('231-235: selección contextual, edición táctil y conexiones mantienen accesos directos', () => {
  const vue = read('src/components/MobileExperience.vue');
  const app = read('js/app.js');
  assert.match(vue, /mobile-context-bar/);
  assert.match(vue, /Enfocar/);
  assert.match(vue, /Rama/);
  assert.match(vue, /Conectar/);
  assert.match(app, /new-connection/);
  assert.match(app, /notifyMobileBoardState/);
});

test('236: el desplazamiento móvil conserva paneo y optimización táctil existentes', () => {
  const app = read('js/app.js');
  const css = read('css/13-responsive.css');
  assert.match(app, /boardEl\.addEventListener\('pointermove'/);
  assert.match(app, /boardPanning/);
  assert.match(app, /pinch/);
  assert.match(css, /overscroll-behavior: none/);
});

test('Fase 18: documentación y auditoría existen', () => {
  assert.ok(existsSync(path.join(ROOT, 'docs/FASE18_FINAL.md')));
  assert.ok(existsSync(path.join(ROOT, 'scripts/phase18-audit.mjs')));
});
