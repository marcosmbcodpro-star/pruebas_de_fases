import { readFileSync } from 'node:fs';
const files = {
  manifest: readFileSync('public/manifest.webmanifest','utf8'),
  sw: readFileSync('public/sw.js','utf8'),
  pwa: readFileSync('src/services/pwa.ts','utf8'),
  app: readFileSync('src/App.vue','utf8'),
  main: readFileSync('src/main.ts','utf8'),
  router: readFileSync('src/router/index.ts','utf8'),
  view: readFileSync('src/views/Phase30View.vue','utf8'),
  index: readFileSync('index.html','utf8')
};
const text = Object.values(files).join('\n');
const checks = [
  ['363 manifest', /manifest\.webmanifest/],
  ['364 icons', /icon-192\.png.*icon-512\.png/s],
  ['365 service worker', /navigator\.serviceWorker\.register.*sw\.js/s],
  ['366 cache strategy', /SHELL_CACHE.*RUNTIME_CACHE/s],
  ['367 install', /beforeinstallprompt/],
  ['368 standalone', /standalone/],
  ['369 loading shell', /pwa-loading/],
  ['370 updates', /registration\.update/],
  ['370 activation on demand', /mindplace:pwa-skip-waiting/],
  ['371 update notice', /nueva versión|updateReady/],
  ['371 waiting worker', /registration\?\.waiting/],
  ['372 preserve local data', /IndexedDB|datos persistentes/]
];
let ok = true;
for (const [name, re] of checks) { const pass = re.test(text); console.log(`${name}: ${pass?'PASS':'FAIL'}`); ok &&= pass; }
console.log(ok ? 'FASE 30 AUDIT: PASS' : 'FASE 30 AUDIT: FAIL');
process.exitCode = ok ? 0 : 1;
