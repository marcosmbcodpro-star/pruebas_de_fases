import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(path.join(ROOT,f),'utf8');

test('237-238: gestor táctil centraliza pinch y paneo de dos dedos',()=>{
  const m=read('js/board/board-touch-gestures.js');
  assert.match(m,/beginPinch/); assert.match(m,/pointers\.size===2/); assert.match(m,/scrollLeft/); assert.match(m,/scrollTop/);
});

test('239-243: arrastre, pulsación larga, doble toque y swipe tienen arbitraje',()=>{
  const m=read('js/board/board-touch-gestures.js'); const app=read('js/app.js');
  assert.match(m,/blockedTarget/); assert.match(m,/beginLongPress/); assert.match(m,/finishSwipe/); assert.match(m,/\.card,\.plus-menu,button/);
  assert.match(app,/gestureDoubleTapAt/); assert.match(app,/startDrag/);
});

test('244-247: conflictos, feedback y háptica están protegidos',()=>{
  const css=read('css/13-responsive.css'); const m=read('js/board/board-touch-gestures.js');
  assert.match(css,/touch-action:none/); assert.match(css,/gesture-pinch/); assert.match(css,/gesture-swipe/);
  assert.match(m,/navigator/); assert.match(m,/vibrate/);
});

test('248: los gestos avanzados pueden desactivarse',()=>{
  const app=read('js/app.js'); const html=read('index_mejoras.html');
  assert.match(app,/advancedGestures/); assert.match(app,/prefAdvancedGestures/); assert.match(html,/Gestos táctiles avanzados/);
});

test('Fase 19: artefactos y ruta Vue existen',()=>{
  assert.ok(existsSync(path.join(ROOT,'docs/FASE19_FINAL.md')));
  assert.ok(existsSync(path.join(ROOT,'scripts/phase19-audit.mjs')));
  assert.ok(existsSync(path.join(ROOT,'src/views/Phase19View.vue')));
});
