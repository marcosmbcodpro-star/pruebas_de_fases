import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=['js/board/board-touch-gestures.js','tests/phase19-touch-gestures.test.mjs','docs/FASE19_FINAL.md','src/views/Phase19View.vue'];
let failed=0;
for(const rel of files){const ok=existsSync(path.join(root,rel));console.log(`${ok?'PASS':'FAIL'} ${rel}`);if(!ok)failed++;}
const m=readFileSync(path.join(root,'js/board/board-touch-gestures.js'),'utf8');
const app=readFileSync(path.join(root,'js/app.js'),'utf8');
const css=readFileSync(path.join(root,'css/13-responsive.css'),'utf8');
for(const [name,ok] of [
 ['pinch',/beginPinch/.test(m)&&/pointers.size===2/.test(m)],
 ['two finger pan',/scrollLeft/.test(m)&&/scrollTop/.test(m)],
 ['long press',/beginLongPress/.test(m)],
 ['swipe navigation',/finishSwipe/.test(m)&&/moveConnected/.test(m)],
 ['gesture setting',/advancedGestures/.test(app)&&/prefAdvancedGestures/.test(app)],
 ['visual feedback',/gesture-pinch/.test(css)&&/gesture-swipe/.test(css)]
]){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);console.log('FASE 19 AUDIT: PASS');
