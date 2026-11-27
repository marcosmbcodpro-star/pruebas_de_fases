import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'js/core/case-version-diff.js',
  'tests/phase25-version-compare.test.mjs',
  'docs/FASE25_FINAL.md',
  'css/22-phase25-version-compare.css',
  'src/views/Phase25View.vue',
  'src/router/index.ts'
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Fase 25 AUDIT: faltan artefactos: ${missing.join(', ')}`);
const code = fs.readFileSync(path.join(root, 'js/core/case-version-diff.js'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/router/index.ts'), 'utf8');
const view = fs.readFileSync(path.join(root, 'src/views/Phase25View.vue'), 'utf8');
const checks = [
  ['version comparator', /compareCaseVersions/.test(code)],
  ['added cards', /diffNodes/.test(code) && /status === 'added'/.test(code)],
  ['deleted cards', /status === 'deleted'/.test(code)],
  ['modified cards', /status === 'modified'/.test(code) && /changedFields/.test(code)],
  ['edge diff', /diffEdges/.test(code)],
  ['category and status diff', /diffCaseMeta/.test(code) && /status.*category/.test(code)],
  ['attachment diff', /diffAttachments/.test(code)],
  ['selective restore', /applySelectedChanges/.test(code)],
  ['safe attachment restore', /attachmentExists/.test(code) && /attachment-binary-missing/.test(code)],
  ['Vue route', /path: '\/fase-25'/.test(router) && /FASE 25/.test(view)]
];
for (const [name, ok] of checks) if (!ok) throw new Error(`Fase 25 AUDIT: ${name} no está implementado.`);
for (const [name] of checks) console.log(`PASS ${name}`);
console.log('FASE 25 AUDIT: PASS');
