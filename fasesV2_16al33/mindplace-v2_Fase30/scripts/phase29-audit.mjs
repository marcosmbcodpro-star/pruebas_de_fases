import { readFileSync } from 'node:fs';
const files = {
  service: readFileSync('src/services/command-palette.ts','utf8'),
  app: readFileSync('src/App.vue','utf8'),
  router: readFileSync('src/router/index.ts','utf8'),
  view: readFileSync('src/views/Phase29View.vue','utf8'),
  legacy: readFileSync('js/app.js','utf8')
};
const checks = [
 ['352 palette', /PHASE29_COMMANDS/],
 ['353 Ctrl K', /Ctrl K|ctrlKey \|\| event\.metaKey/],
 ['354 mobile', /max-width:620px/],
 ['355 actions', /type: 'legacy'/],
 ['356 search', /type: 'search'/],
 ['357 contexts', /contexts:/],
 ['358 create card', /id: 'new-note'/],
 ['359 connections', /id: 'new-connection'/],
 ['360 focus', /id: 'focus'/],
 ['361 switch case', /id: 'switch-case'/],
 ['362 admin/export', /id: 'export'/],
 ['legacy bridge', /mindplace:phase29-command/]
];
let ok=true; for (const [name,re] of checks){ const text=Object.values(files).join('\n'); const pass=re.test(text); console.log(`${name}: ${pass?'PASS':'FAIL'}`); ok &&= pass; }
console.log(ok ? 'FASE 29 AUDIT: PASS' : 'FASE 29 AUDIT: FAIL');
process.exitCode=ok?0:1;
