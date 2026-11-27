import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['js/mobile/mobile-editing.js','js/cases/case-editor.js','js/app.js','js/board/board-render.js','css/17-phase20-mobile-editing.css','tests/phase20-mobile-editing.test.mjs','docs/FASE20_FINAL.md','src/views/Phase20View.vue'];
let failed=0;
for(const rel of required){const ok=existsSync(path.join(root,rel)); console.log(`${ok?'PASS':'FAIL'} ${rel}`); if(!ok) failed++;}
const m=readFileSync(path.join(root,'js/mobile/mobile-editing.js'),'utf8');
const app=readFileSync(path.join(root,'js/app.js'),'utf8');
const editor=readFileSync(path.join(root,'js/cases/case-editor.js'),'utf8');
const render=readFileSync(path.join(root,'js/board/board-render.js'),'utf8');
const css=readFileSync(path.join(root,'css/17-phase20-mobile-editing.css'),'utf8');
for(const [name,ok] of [
 ['keyboard viewport',/visualViewport/.test(m)&&/scrollIntoView/.test(m)&&/keyboard-inset/.test(css)],
 ['mobile form steps',/mobileStep/.test(editor)&&/mobile-form-step-actions/.test(css)],
 ['quick card editing',/addMobileQuickEditButtons/.test(app)&&/addMobileQuickEditButtons/.test(render)],
 ['quick relation editing',/edgeLabelEdit/.test(app)&&/updateSelectedEdge/.test(app)],
 ['quick element creation',/quickCreate/.test(m)&&/addNodeFrom/.test(app)],
 ['paste handling',/clipboardData/.test(m)&&/text\/plain/.test(m)],
 ['autosave',/scheduleSave\(\)/.test(m)&&/saveInFlight/.test(app)],
 ['orientation recovery',/orientationchange/.test(m)&&/pagehide/.test(m)&&/sessionStorage/.test(m)],
 ['touch text selection',/-webkit-user-select:text/.test(css)&&/touch-action:manipulation/.test(css)]
]){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++;}
if(failed) process.exit(1);
console.log('FASE 20 AUDIT: PASS');
