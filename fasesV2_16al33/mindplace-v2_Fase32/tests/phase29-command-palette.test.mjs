import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;

test('Fase 29: comandos 352–362 cubiertos', () => {
  const source = readFileSync(new URL('../src/services/command-palette.ts', import.meta.url), 'utf8');
  for (const id of ['search','new-note','new-connection','focus','new-case','switch-case','export','backup','settings']) assert.match(source, new RegExp(`id: ['\\\"]${id}`));
  assert.match(source, /filterCommands/);
  assert.match(readFileSync(new URL('../src/components/CommandPalette.vue', import.meta.url), 'utf8'), /Ctrl K/);
});

test('Fase 29: integración global y router', () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8');
  const legacy = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /CommandPalette/);
  assert.match(app, /ctrlKey \|\| event.metaKey/);
  assert.match(router, /fase-29/);
  assert.match(legacy, /mindplace:phase29-command/);
  assert.match(legacy, /phase29-export/);
});
