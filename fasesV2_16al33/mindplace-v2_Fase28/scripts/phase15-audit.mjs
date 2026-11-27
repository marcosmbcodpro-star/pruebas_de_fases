import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md','index_mejoras.html','favicon.svg','package.json','.gitignore',
  'js/app.js','js/core/state.js','js/core/storage.js','js/core/persistence.js','js/core/security.js','js/core/attachments.js',
  'js/models/models.js','js/models/validators.js','tests/phase14-core.test.mjs','tests/phase15-final.test.mjs','scripts/phase14-browser.mjs'
];
for (const rel of required) assert.ok(existsSync(path.join(ROOT, rel)), `Falta ${rel}`);

const html = readFileSync(path.join(ROOT,'index_mejoras.html'),'utf8');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup = ids.filter((id,i)=>ids.indexOf(id)!==i);
assert.deepEqual([...new Set(dup)], [], 'Hay IDs HTML duplicados');
assert.match(html, /Content-Security-Policy/);
assert.match(html, /script-src 'self'/);
assert.doesNotMatch(html, /script-src[^;]*unsafe-inline/);
assert.doesNotMatch(html, /script-src[^;]*unsafe-eval/);
assert.match(html, /rel=["']icon["']/);
assert.match(html, /src=["']\.\/js\/app\.js["']/);

const ignore = readFileSync(path.join(ROOT,'.gitignore'),'utf8');
assert.match(ignore, /\.phase14-browser-profile-/);

const jsFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir,{withFileTypes:true})) {
    const full = path.join(dir,entry.name);
    if (entry.name === 'docs' || entry.name === 'node_modules' || entry.name === 'archive') continue;
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.js')) jsFiles.push(full);
  }
}
walk(path.join(ROOT,'js'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,`Fallo de sintaxis: ${path.relative(ROOT,file)}\n${result.stderr}`);
}

const rootTemporaryProfiles = readdirSync(ROOT).filter(name => /^\.phase\d+-browser-profile-/.test(name));
assert.deepEqual(rootTemporaryProfiles, [], 'Hay perfiles temporales del navegador en la raíz');

const readme = readFileSync(path.join(ROOT,'README.md'),'utf8');
assert.match(readme, /Fase 14[^\n]*COMPLETADA/i);
assert.match(readme, /Fase 15[^\n]*Auditoría final/i);

console.log(`PASS phase15 audit: ${jsFiles.length} módulos JS, estructura, CSP, IDs, temporales y documentación OK`);
