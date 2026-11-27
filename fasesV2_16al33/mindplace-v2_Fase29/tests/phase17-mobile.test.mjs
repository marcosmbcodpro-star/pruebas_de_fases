import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

test('209-220: existe una capa móvil específica en Vue', () => {
  assert.ok(existsSync(path.join(ROOT, 'src/components/MobileExperience.vue')));
  const vue = read('src/components/MobileExperience.vue');
  assert.match(vue, /mobile-bottom-nav/);
  assert.match(vue, /mobile-sheet/);
  assert.match(vue, /@media \(max-width: 900px\)/);
});

test('211-219: navegación y acciones principales están definidas', () => {
  const vue = read('src/components/MobileExperience.vue');
  for (const key of ['Casos', 'Tablero', 'Añadir', 'Buscar', 'Más', 'Nueva evidencia', 'Nueva nota', 'Nueva persona', 'Nueva conexión', 'Fotografía']) {
    assert.match(vue, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const state = read('src/domain/state.ts');
  assert.match(state, /MobilePanel/);
  assert.match(state, /mobilePanel/);
});

test('214-216: paneles deslizables y adaptación a pantallas pequeñas', () => {
  const vue = read('src/components/MobileExperience.vue');
  assert.match(vue, /position: fixed/);
  assert.match(vue, /bottom: calc\(68px/);
  assert.match(vue, /env\(safe-area-inset-bottom\)/);
  assert.match(vue, /max-height: min\(78dvh/);
});

test('217-218: acciones rápidas reducen pasos', () => {
  const vue = read('src/components/MobileExperience.vue');
  const app = read('js/app.js');
  assert.match(vue, /execute\('new-note'\)/);
  assert.match(vue, /execute\('new-person'\)/);
  assert.match(vue, /execute\('new-evidence'\)/);
  assert.match(vue, /execute\('new-photo'\)/);
  assert.match(vue, /execute\('new-connection'\)/);
  assert.match(app, /mindplace:mobile-command/);
  assert.match(app, /addNodeFrom\('note'/);
  assert.match(app, /addNodeFrom\('person'/);
});

test('220: escritorio mantiene la interfaz y la capa móvil se oculta fuera del breakpoint', () => {
  const css = read('src/components/MobileExperience.vue');
  assert.match(css, /\.mobile-experience \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 900px\)/);
});
