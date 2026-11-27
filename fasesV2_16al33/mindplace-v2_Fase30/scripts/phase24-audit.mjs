import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'js/core/case-versions.js',
  'tests/phase24-case-versions.test.mjs',
  'docs/FASE24_FINAL.md',
  'src/views/Phase24View.vue',
  'css/21-phase24-case-versions.css'
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Fase 24 AUDIT: faltan artefactos: ${missing.join(', ')}`);

const code = fs.readFileSync(path.join(root, 'js/core/case-versions.js'), 'utf8');
const checks = [
  ['persistent versions', /CASE_VERSION_KEY_PREFIX/.test(code)],
  ['automatic points', /maybeCreateAuto/.test(code)],
  ['manual version', /createManual/.test(code)],
  ['version history metadata', /createdAt[\s\S]*description/.test(code)],
  ['restore', /async function restore/.test(code)],
  ['protected deletion', /if \(target\.protected\)/.test(code)],
  ['separate source manual/auto', /source === 'auto'/.test(code)]
];
for (const [name, ok] of checks) if (!ok) throw new Error(`Fase 24 AUDIT: ${name} no está implementado.`);
console.log('PASS js/core/case-versions.js');
for (const [name] of checks) console.log(`PASS ${name}`);
console.log('FASE 24 AUDIT: PASS');
