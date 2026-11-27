import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('191–194 — Vue/TypeScript/Vite foundation exists', () => {
  assert.ok(fs.existsSync(path.join(root, 'index.html')));
  assert.ok(fs.existsSync(path.join(root, 'src/main.ts')));
  assert.ok(fs.existsSync(path.join(root, 'src/App.vue')));
  assert.ok(fs.existsSync(path.join(root, 'vite.config.ts')) || fs.existsSync(path.join(root, 'vite.config.js')));
  assert.match(read('package.json'), /"vue"/);
  assert.match(read('package.json'), /"typescript"/);
  assert.match(read('package.json'), /"vite"/);
});

test('195–200 — typed domain and Pinia store exist', () => {
  const models = read('src/domain/models.ts');
  const store = read('src/stores/app.ts');
  assert.match(models, /interface CaseModel/);
  assert.match(models, /interface NodeModel/);
  assert.match(models, /interface EdgeModel/);
  assert.match(models, /interface Attachment/);
  assert.match(models, /interface HistoryEntry/);
  assert.match(models, /interface PreferencesModel/);
  assert.match(store, /defineStore\('app'/);
  assert.match(read('src/stores/global.ts'), /defineStore\('global'/);
  assert.match(read('src/stores/ui.ts'), /defineStore\('ui'/);
  assert.match(read('src/stores/case.ts'), /defineStore\('case'/);
});

test('201–204 — router and legacy compatibility boundary exist', () => {
  assert.match(read('src/router/index.ts'), /createRouter/);
  assert.ok(fs.existsSync(path.join(root, 'src/components/LegacyWorkspace.vue')));
  assert.ok(fs.existsSync(path.join(root, 'index_mejoras.html')));
  assert.match(read('src/components/LegacyWorkspace.vue'), /index_mejoras\.html/);
});

test('205–208 — TypeScript contracts, bridge and phase documentation exist', () => {
  assert.ok(fs.existsSync(path.join(root, 'tsconfig.json')));
  assert.ok(fs.existsSync(path.join(root, 'tsconfig.node.json')));
  assert.ok(fs.existsSync(path.join(root, 'src/core/legacy-bridge.ts')));
  assert.ok(fs.existsSync(path.join(root, 'docs/FASE16_FINAL.md')));
  assert.match(read('js/app.js'), /mindplace:legacy-ready/);
  assert.ok(fs.existsSync(path.join(root, 'src/services/storage.ts')));
  assert.ok(fs.existsSync(path.join(root, 'src/services/validation.ts')));
  assert.ok(fs.existsSync(path.join(root, 'src/services/data-transfer.ts')));
  assert.ok(fs.existsSync(path.join(root, 'src/services/history.ts')));
  assert.ok(fs.existsSync(path.join(root, 'src/core/migration.ts')));
});


test('accesibilidad — onboarding mueve el foco antes de aria-hidden', () => {
  const app = read('js/app.js');
  const block = app.match(/async function finishOnboarding\(\)\{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(block, /focusTarget/);
  assert.match(block, /focusTarget\.focus\(\{preventScroll:true\}\)/);
  assert.match(block, /setAttribute\('inert',''\)/);
  assert.match(block, /setAttribute\('aria-hidden','true'\)/);
  assert.ok(block.indexOf('focusTarget.focus') < block.indexOf("setAttribute('aria-hidden','true')"));
});

test('CSP — no se debilita script-src con unsafe-inline', () => {
  const html = read('index.html');
  const csp = html.match(/Content-Security-Policy[^>]+content=\"([^\"]+)/)?.[1] || '';
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.match(csp, /sha256-vvt4KWwuNr51XfE5m\+hzeNEGhiOfZzG97ccfqGsPwvE=/);
});
