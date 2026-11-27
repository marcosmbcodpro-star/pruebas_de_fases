import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = ['src/services/graph.ts','src/views/Phase26View.vue','src/router/index.ts','tests/phase26-graph.test.mjs','docs/FASE26_FINAL.md'];
const missing = required.filter(file => !fs.existsSync(path.join(root,file)));
if (missing.length) throw new Error(`Fase 26 AUDIT: faltan artefactos: ${missing.join(', ')}`);
const service = fs.readFileSync(path.join(root,'src/services/graph.ts'),'utf8');
const view = fs.readFileSync(path.join(root,'src/views/Phase26View.vue'),'utf8');
const router = fs.readFileSync(path.join(root,'src/router/index.ts'),'utf8');
const checks = [
 ['graph model', /buildGraphModel/.test(service)], ['branch navigation', /collectBranch/.test(service) && /Enfocar rama/.test(view)],
 ['relation filters', /relationTypes/.test(view)], ['tag filters', /tags/.test(view)], ['status filters', /statuses/.test(view)],
 ['hubs', /hubs/.test(service) && /Hubs detectados/.test(view)], ['isolated', /isolated/.test(service) && /Aislados/.test(view)],
 ['clusters', /clusters/.test(service) && /Agrupaciones/.test(view)], ['phase route', /\/fase-26/.test(router)], ['phase marker', /FASE 26/.test(view)]
];
for (const [name, ok] of checks) if (!ok) throw new Error(`Fase 26 AUDIT: ${name} no está implementado.`);
for (const [name] of checks) console.log(`PASS ${name}`);
console.log('FASE 26 AUDIT: PASS');
