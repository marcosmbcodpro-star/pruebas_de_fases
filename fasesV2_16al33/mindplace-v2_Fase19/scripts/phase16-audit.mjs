import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

const required = [
  'index.html','index_mejoras.html','vite.config.ts','tsconfig.json','package.json',
  'src/main.ts','src/App.vue','src/domain/models.ts','src/domain/state.ts',
  'src/services/storage.ts','src/services/validation.ts','src/services/data-transfer.ts','src/services/history.ts',
  'src/stores/global.ts','src/stores/ui.ts','src/stores/case.ts','src/stores/app.ts','src/router/index.ts',
  'src/core/migration.ts','src/core/legacy-bridge.ts','tests/phase16-architecture.test.mjs','docs/FASE16_FINAL.md'
];
for (const rel of required) assert.ok(existsSync(path.join(ROOT, rel)), `Falta ${rel}`);

for (const htmlFile of ['index.html','index_mejoras.html']) {
  const html = read(htmlFile);
  const csp = html.match(/Content-Security-Policy[^>]+content="([^"]+)/)?.[1] ?? '';
  assert.match(csp, /script-src 'self'/, `${htmlFile}: CSP sin script-src self`);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/, `${htmlFile}: script-src no puede usar unsafe-inline`);
  assert.doesNotMatch(html, /<(?:script|img|iframe)[^>]+\son[a-z]+=/i, `${htmlFile}: handler inline detectado`);
  assert.match(html, /sha256-vvt4KWwuNr51XfE5m\+hzeNEGhiOfZzG97ccfqGsPwvE=/, `${htmlFile}: hash de compatibilidad CSP ausente`);
}

const textFiles = ['src/domain/models.ts','src/services/storage.ts','src/services/validation.ts','src/services/data-transfer.ts','src/services/history.ts'];
for (const rel of textFiles) assert.doesNotMatch(read(rel), /: any\b/, `${rel}: no se permite any explícito`);

assert.match(read('src/stores/global.ts'), /defineStore\('global'/);
assert.match(read('src/stores/ui.ts'), /defineStore\('ui'/);
assert.match(read('src/stores/case.ts'), /defineStore\('case'/);
assert.match(read('src/router/index.ts'), /createRouter/);
assert.match(read('src/core/migration.ts'), /IndexedDB|readStore|writeStore/);
assert.match(read('src/services/data-transfer.ts'), /exportStore|importStore/);
assert.match(read('src/services/history.ts'), /class UndoRedoManager/);

console.log('PASS phase16 audit: CSP, TypeScript contracts, persistence, transfer, history, Pinia stores, router y compatibilidad legacy OK');
