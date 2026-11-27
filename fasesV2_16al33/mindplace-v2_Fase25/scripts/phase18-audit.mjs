import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['MobileExperience', 'src/components/MobileExperience.vue'],
  ['Responsive board', 'css/13-responsive.css'],
  ['Board navigation', 'js/board/board-navigation.js'],
  ['Mobile bridge', 'js/app.js'],
  ['Tests', 'tests/phase18-mobile-board.test.mjs']
];
let failed = 0;
for (const [name, rel] of checks) {
  const ok = existsSync(path.join(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${rel}`);
  if (!ok) failed++;
}
const css = readFileSync(path.join(root, 'css/13-responsive.css'), 'utf8');
const app = readFileSync(path.join(root, 'js/app.js'), 'utf8');
for (const [name, ok] of [
  ['mobile focus', /mobile-board-focus/.test(css) && /board-focus/.test(app)],
  ['mobile branch', /mobile-board-branch/.test(css) && /board-branch/.test(app)],
  ['mobile minimap', /mobile-open/.test(css) && /board-minimap/.test(app)],
  ['touch board', /touch-action: none/.test(css) && /pointerdown/.test(app)]
]) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('FASE 18 AUDIT: PASS');
