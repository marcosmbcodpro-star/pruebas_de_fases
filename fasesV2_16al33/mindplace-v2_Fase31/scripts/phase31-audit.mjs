import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [
  ['373-376 offline storage', /DB_VERSION = 3/.test(read('js/core/storage.js')) && /createAttachmentRepository/.test(read('js/core/attachments.js'))],
  ['377-378 sync queue', /offline-sync-queue/.test(read('js/core/offline.js')) && /enqueueStoreChange/.test(read('js/core/persistence.js'))],
  ['379 connection recovery', /addEventListener\('online'/.test(read('js/core/offline.js')) && /addEventListener\('offline'/.test(read('js/core/offline.js'))],
  ['380 sync processing', /flushQueue/.test(read('js/core/offline.js')) && /syncHandler/.test(read('js/core/offline.js'))],
  ['381 sync errors', /lastError/.test(read('js/core/offline.js')) && /catch \(error\)/.test(read('js/core/offline.js'))],
  ['382 local independence', /IndexedDB/.test(read('src/views/Phase31View.vue')) && /Local-first/.test(read('src/views/Phase31View.vue'))],
  ['PWA background sync hook', /mindplace-offline-sync/.test(read('public/sw.js'))],
  ['Phase 31 route', /fase-31/.test(read('src/router/index.ts'))]
];
for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`${name}: PASS`); }
console.log('FASE 31 AUDIT: PASS');
