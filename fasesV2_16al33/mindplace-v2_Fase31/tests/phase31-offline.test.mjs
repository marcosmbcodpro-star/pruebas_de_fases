import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

test('373-376: almacenamiento offline y adjuntos locales', () => {
  const storage = read('js/core/storage.js');
  const attachments = read('js/core/attachments.js');
  assert.match(storage, /const DB_VERSION = 3/);
  assert.match(storage, /offline-sync-queue/);
  assert.match(attachments, /objectStore/);
});

test('377-378: cola offline persistente', () => {
  const offline = read('js/core/offline.js');
  assert.match(offline, /enqueueStoreChange/);
  assert.match(offline, /offline-sync-queue/);
  assert.match(offline, /MAX_QUEUE_ITEMS/);
  assert.match(read('js/app.js'), /createOfflineManager/);
  assert.match(read('js/core/persistence.js'), /enqueueStoreChange/);
});

test('379-381: recuperación de conexión y tratamiento de errores', () => {
  const offline = read('js/core/offline.js');
  assert.match(offline, /addEventListener\('online'/);
  assert.match(offline, /addEventListener\('offline'/);
  assert.match(offline, /syncing/);
  assert.match(offline, /lastError/);
  assert.match(offline, /flushQueue/);
});

test('382: persistencia local independiente del servidor', () => {
  const view = read('src/views/Phase31View.vue');
  const sw = read('public/sw.js');
  assert.match(view, /IndexedDB/);
  assert.match(view, /Fase 32/);
  assert.match(sw, /mindplace-offline-sync/);
});


test('development mode does not register production service worker and Vite HMR is explicit', () => {
  const pwa = read('src/services/pwa.ts');
  const vite = read('vite.config.js');
  assert.match(pwa, /import\.meta\.env\.DEV/);
  assert.match(pwa, /getRegistrations/);
  assert.match(vite, /hmr:\s*\{/);
  assert.match(vite, /protocol:\s*'ws'/);
  assert.match(vite, /clientPort:\s*5173/);
});
