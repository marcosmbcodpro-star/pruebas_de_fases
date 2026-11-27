import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(path.join(ROOT,f),'utf8');

test('249-252: teclado virtual y foco visible',()=>{
  const m=read('js/mobile/mobile-editing.js'); const css=read('css/17-phase20-mobile-editing.css');
  assert.match(m,/visualViewport/); assert.match(m,/scrollIntoView/); assert.match(m,/--mp-keyboard-inset/);
  assert.match(css,/font-size:16px/); assert.match(css,/max-height:48vh/);
});

test('253: formularios complejos se dividen en pasos móviles',()=>{
  const m=read('js/cases/case-editor.js'); const css=read('css/17-phase20-mobile-editing.css');
  assert.match(m,/mobileStep/); assert.match(m,/setMobileStep/); assert.match(m,/mobileStepActions/);
  assert.match(css,/mobile-form-step-actions/); assert.match(css,/mobile-step-hidden/);
});

test('254-256: edición y creación rápida en móvil',()=>{
  const app=read('js/app.js'); const render=read('js/board/board-render.js'); const m=read('js/mobile/mobile-editing.js');
  assert.match(app,/addMobileQuickEditButtons/); assert.match(render,/addMobileQuickEditButtons/);
  assert.match(app,/mobile-quick-edit-btn/); assert.match(app,/mobile-quick-create-btn/);
  assert.match(m,/quickCreate/); assert.match(m,/\+ Nota/);
});

test('255: relaciones tienen edición rápida y teclado adecuado',()=>{
  const app=read('js/app.js');
  assert.match(app,/edgeLabelEdit/); assert.match(app,/data-mobile-draft-key=\"edge-label\"/); assert.match(app,/addEventListener\('input',e=>updateSelectedEdge/);
});

test('257-258: pegado y edición de texto táctil',()=>{
  const m=read('js/mobile/mobile-editing.js'); const css=read('css/17-phase20-mobile-editing.css');
  assert.match(m,/clipboardData/); assert.match(m,/text\/plain/); assert.match(m,/setRangeText/); assert.match(m,/insertText/);
  assert.match(css,/-webkit-user-select:text/); assert.match(css,/touch-action:manipulation/);
});

test('259-260: autosave, orientación y recuperación temporal',()=>{
  const m=read('js/mobile/mobile-editing.js'); const app=read('js/app.js');
  assert.match(m,/scheduleSave\(\)/); assert.match(m,/pagehide/); assert.match(m,/visibilitychange/); assert.match(m,/orientationchange/); assert.match(m,/sessionStorage/);
  assert.match(app,/scheduleSave/); assert.match(app,/saveInFlight/);
});

test('Fase 20: artefactos y ruta Vue existen',()=>{
  assert.ok(existsSync(path.join(ROOT,'docs/FASE20_FINAL.md')));
  assert.ok(existsSync(path.join(ROOT,'scripts/phase20-audit.mjs')));
  assert.ok(existsSync(path.join(ROOT,'src/views/Phase20View.vue')));
});
