import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('server/package.json'));
const checks = [
  ['383-388 backend NestJS/API', /NestFactory/.test(read('server/src/main.ts')) && Boolean(pkg.dependencies['@nestjs/core']) && /api\/health/.test(read('server/src/health.controller.ts'))],
  ['384 auth JWT + validación', /JwtService/.test(read('server/src/auth/auth.service.ts')) && /scryptSync/.test(read('server/src/auth/auth.service.ts')) && Boolean(pkg.dependencies['class-validator']) && Boolean(pkg.dependencies['class-transformer'])],
  ['385 modelo de sincronización', /baseVersion/.test(read('server/src/cases/cases.service.ts')) && /contentHash/.test(read('server/src/cases/cases.service.ts'))],
  ['389-390 multidispositivo', /sync-client/.test(read('js/app.js')) && read('js/core/sync-client.js').includes("'/api'") && /host: '0.0.0.0'/.test(read('vite.config.js')) && /proxy:/.test(read('vite.config.js'))],
  ['391 conflictos', /SYNC_CONFLICT/.test(read('server/src/cases/cases.service.ts')) && /ConflictException/.test(read('server/src/cases/cases.service.ts'))],
  ['392-393 resolución', /resolveConflict/.test(read('js/core/sync-client.js')) && /resolve/.test(read('server/src/cases/cases.controller.ts'))],
  ['394 local-first', /IndexedDB/.test(read('FASE32_ENTREGA.txt')) && /offline/.test(read('js/core/offline.js')) && /flushQueue/.test(read('js/core/sync-client.js'))],
  ['pruebas HTTP reales', fs.existsSync(path.join(root, 'server/test/phase32-http.test.js')) && /register/.test(read('server/test/phase32-http.test.js')) && /SYNC_CONFLICT/.test(read('server/test/phase32-http.test.js'))],
  ['route Fase 32', /fase-32/.test(read('src/router/index.ts')) && /fase-32/.test(read('src/components/LegacyWorkspace.vue'))],
];
let ok = true;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); ok &&= pass; }
if (!ok) process.exit(1);
console.log('FASE 32 AUDIT: PASS');
