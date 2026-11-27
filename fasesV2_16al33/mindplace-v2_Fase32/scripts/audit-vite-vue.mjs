import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const config = path.join(root, 'vite.config.js');
const oldConfig = path.join(root, 'vite.config.ts');
const pluginPkg = path.join(root, 'node_modules', '@vitejs', 'plugin-vue', 'package.json');
const app = path.join(root, 'src', 'App.vue');

const checks = [
  ['vite.config.js existe', fs.existsSync(config)],
  ['vite.config.ts eliminado para evitar duplicidad', !fs.existsSync(oldConfig)],
  ['@vitejs/plugin-vue instalado', fs.existsSync(pluginPkg)],
  ['App.vue existe', fs.existsSync(app)],
];
const text = fs.readFileSync(config, 'utf8');
checks.push(['vite.config.js registra plugin-vue', text.includes("import vue from '@vitejs/plugin-vue'") && text.includes('plugins: [vue()]')]);

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
