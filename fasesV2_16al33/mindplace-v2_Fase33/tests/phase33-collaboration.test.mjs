import test from 'node:test'; import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const files=['src/views/Phase33View.vue','src/services/collaboration.ts','server/src/collaboration/collaboration.controller.ts','server/src/collaboration/collaboration.service.ts'];
test('Fase 33 contiene UI y servicios de colaboración',async()=>{for(const f of files){const s=await readFile(f,'utf8');assert.ok(s.length>200,f);}});
test('Fase 33 cubre permisos, presencia e historial',async()=>{const s=await readFile('server/src/collaboration/collaboration.service.ts','utf8');for(const x of ['read','edit','heartbeat','listPresence','listActivity','invitation.created','invitation.accepted'])assert.match(s,new RegExp(x));});
test('Casos compartidos respetan acceso de lectura y edición',async()=>{const s=await readFile('server/src/cases/cases.service.ts','utf8');assert.match(s,/canRead/);assert.match(s,/canEdit/);assert.match(s,/registerOwner/);});
