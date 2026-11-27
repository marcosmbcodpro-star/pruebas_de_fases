import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

test('275-279: modo investigación y creación rápida', () => {
  const mobile = read('src/components/MobileExperience.vue');
  const app = read('js/app.js');
  assert.match(mobile, /Modo investigación móvil/);
  assert.match(mobile, /Nueva evidencia/);
  assert.match(mobile, /Nueva nota/);
  assert.match(mobile, /Nueva persona/);
  assert.match(mobile, /Nueva conexión/);
  assert.match(app, /research-quick/);
});

test('280-282: fotografía y escaneo/adjunto de documento', () => {
  const mobile = read('src/components/MobileExperience.vue');
  const app = read('js/app.js');
  assert.match(mobile, /Fotografía/);
  assert.match(mobile, /Escanear documento/);
  assert.match(app, /research-photo/);
  assert.match(app, /research-document/);
  const files = read('js/mobile/mobile-files.js');
  assert.match(files, /capture/);
});

test('283: captura con pocos pasos y contexto seleccionado', () => {
  const controller = read('js/mobile/mobile-research.js');
  assert.match(controller, /captureContext/);
  assert.match(controller, /selectedCardId/);
  assert.match(controller, /quickAction/);
});

test('284-285: retorno rápido y conservación del tablero', () => {
  const controller = read('js/mobile/mobile-research.js');
  const navigation = read('js/board/board-navigation.js');
  const app = read('js/app.js');
  assert.match(controller, /returnToContext/);
  assert.match(controller, /caseId/);
  assert.match(controller, /navigation/);
  assert.match(navigation, /rememberNavigation/);
  assert.match(app, /return-research-context/);
  assert.match(app, /research-state/);
});

test('286: vista móvil centrada en captura rápida', () => {
  const mobile = read('src/components/MobileExperience.vue');
  const css = read('css/19-phase22-mobile-research.css');
  assert.match(mobile, /mobile-research/);
  assert.match(mobile, /mobile-research__grid/);
  assert.match(css, /mobile-research/);
  assert.match(css, /research-action/);
});

test('Fase 22: integración, documentación y estilos', () => {
  assert.ok(existsSync(path.join(ROOT, 'js/mobile/mobile-research.js')));
  assert.ok(existsSync(path.join(ROOT, 'css/19-phase22-mobile-research.css')));
  assert.ok(existsSync(path.join(ROOT, 'docs/FASE22_FINAL.md')));
  assert.ok(existsSync(path.join(ROOT, 'scripts/phase22-audit.mjs')));
  assert.ok(existsSync(path.join(ROOT, 'src/views/Phase22View.vue')));
  assert.match(read('css/styles.css'), /19-phase22-mobile-research/);
  assert.match(read('src/router/index.ts'), /Phase22View/);
});
