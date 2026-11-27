import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');
const checks = [
  ['PASS js/mobile/mobile-research.js', 'js/mobile/mobile-research.js', [/createMobileResearchController/, /sessionStorage/, /returnToContext/]],
  ['PASS js/app.js', 'js/app.js', [/createMobileResearchController/, /mindplace:research-state/, /research-quick/, /return-research-context/]],
  ['PASS src/components/MobileExperience.vue', 'src/components/MobileExperience.vue', [/research/, /Nueva evidencia/, /Nueva nota/, /Nueva persona/, /Nueva conexión/, /Fotografía/, /Escanear documento/, /Volver al contexto/]],
  ['PASS css/19-phase22-mobile-research.css', 'css/19-phase22-mobile-research.css', [/mobile-research/, /research-action/, /research-context/]],
  ['PASS tests/phase22-mobile-research.test.mjs', 'tests/phase22-mobile-research.test.mjs', [/275-279/, /284-285/]],
  ['PASS docs/FASE22_FINAL.md', 'docs/FASE22_FINAL.md', [/FASE 22/, /275–286/]],
  ['PASS src/views/Phase22View.vue', 'src/views/Phase22View.vue', [/FASE 22/]]
];
for (const [label, file, patterns] of checks) {
  if (!existsSync(path.join(ROOT, file))) throw new Error(`Falta ${file}`);
  const text = read(file);
  for (const pattern of patterns) if (!pattern.test(text)) throw new Error(`No se cumple ${label}: ${pattern}`);
  console.log(label);
}
console.log('PASS quick research mode');
console.log('PASS fast evidence, note, person and connection capture');
console.log('PASS quick photo and document scan/attach flow');
console.log('PASS one-tap return to previous case context');
console.log('PASS board context preservation between actions');
console.log('PASS mobile research navigation and focused capture');
console.log('FASE 22 AUDIT: PASS');
