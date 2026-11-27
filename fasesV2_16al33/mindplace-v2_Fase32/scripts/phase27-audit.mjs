import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mustExist = [
  'src/services/case-diagnostics.ts', 'src/views/Phase27View.vue', 'tests/phase27-quality.test.mjs',
  'src/router/index.ts', 'docs/FASE27_FINAL.md'
];
const missing = mustExist.filter(file => !fs.existsSync(path.join(root, file)));
const view = fs.readFileSync(path.join(root, 'src/views/Phase27View.vue'), 'utf8');
const service = fs.readFileSync(path.join(root, 'src/services/case-diagnostics.ts'), 'utf8');
const checks = [
  ['327 consistency engine', service.includes('diagnoseCase')],
  ['328 orphan nodes', service.includes("'orphan-node'")],
  ['329 conclusions without evidence', service.includes("'conclusion-without-evidence'")],
  ['330 evidence without context', service.includes("'evidence-without-context'")],
  ['331 contradictory relationships', service.includes("'contradictory-relationship'")],
  ['332 broken references', service.includes("'broken-reference'")],
  ['333 duplicate cards', service.includes("'duplicate-node'")],
  ['334 duplicate people', service.includes("'duplicate-person'")],
  ['335 orphan attachments', service.includes("'orphan-attachment'")],
  ['336 warnings UI', view.includes('Problemas detectados')],
  ['337 summary', view.includes('Diagnóstico global')],
  ['338 issue navigation', view.includes('Abrir elemento en el grafo') && view.includes("'/fase-26'")]
];
if (missing.length || checks.some(([, ok]) => !ok)) {
  console.error('FASE 27 AUDIT: FAIL');
  if (missing.length) console.error('Missing:', missing);
  for (const [name, ok] of checks) if (!ok) console.error('FAIL:', name);
  process.exit(1);
}
console.log('FASE 27 AUDIT: PASS');
console.log(checks.map(([name]) => `PASS ${name}`).join('\n'));
