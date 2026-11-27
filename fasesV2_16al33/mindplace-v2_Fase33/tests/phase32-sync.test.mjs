import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Fase 32 — backend NestJS, salud y autenticación', () => {
  const pkg = JSON.parse(read('server/package.json'));
  assert.match(pkg.dependencies['@nestjs/core'], /\^11/);
  assert.match(pkg.dependencies['class-validator'], /\^0\.15/);
  assert.match(pkg.dependencies['class-transformer'], /\^0\.5/);
  assert.match(read('server/src/main.ts'), /ValidationPipe/);
  assert.match(read('server/src/health.controller.ts'), /api\/health/);
  assert.match(read('server/src/auth/auth.service.ts'), /JwtService/);
  assert.match(read('server/src/auth/auth.service.ts'), /scryptSync/);
});

test('Fase 32 — API de casos y sincronización', () => {
  assert.match(read('server/src/cases/cases.controller.ts'), /api\/cases/);
  assert.match(read('server/src/cases/sync.controller.ts'), /api\/sync/);
  assert.match(read('server/src/cases/cases.service.ts'), /SYNC_CONFLICT/);
  assert.match(read('server/src/cases/cases.service.ts'), /baseVersion/);
});

test('Fase 32 — cliente y local-first', () => {
  const c = read('js/core/sync-client.js'), o = read('js/core/offline.js'), p = read('js/core/persistence.js');
  assert.match(c, /pushChange/);
  assert.match(c, /resolveConflict/);
  assert.match(c, /\/api/);
  assert.match(c, /flushQueue/);
  assert.match(c, /pullAll/);
  assert.match(o, /setSyncHandler/);
  assert.match(o, /sync-conflicts/);
  assert.match(p, /queueOnlineSync/);
});

test('Fase 32 — LAN, CSP y documentación', () => {
  assert.match(read('vite.config.js'), /0\.0\.0\.0/);
  assert.match(read('vite.config.js'), /proxy/);
  assert.match(read('index.html'), /connect-src 'self' ws: wss:/);
  assert.match(read('FASE32_ENTREGA.txt'), /383/);
  assert.match(read('docs/FASE32_FINAL.md'), /COMPLETADA/);
});

test('Fase 32 — prueba HTTP real incluida', () => {
  const t = read('server/test/phase32-http.test.js');
  assert.match(t, /\/api\/health/);
  assert.match(t, /SYNC_CONFLICT/);
  assert.match(t, /resolve/);
});
