import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAdvancedQuery, searchCase } from '../src/services/advanced-search.ts';

const base = { id:'c1', title:'Caso Delta', description:'Investigación sobre una persona', status:'abierto', category:'investigación', marker:{x:0,y:0}, updatedAt:Date.parse('2026-08-01'), createdAt:Date.parse('2026-07-01'), edges:[{id:'e1',a:'n1',b:'n2',type:'supports',kind:'supports',direction:'forward',label:'apoya'}], history:[], activity:[], settings:{} };
const caseModel = { ...base, nodes:[
  {id:'n1',type:'person',text:'Ana principal',x:0,y:0,favorite:false,status:'validated',locked:false,category:'personas',tags:['urgente','rojo'],author:'',dateText:'',createdAt:Date.parse('2026-08-02'),updatedAt:Date.parse('2026-08-02')},
  {id:'n2',type:'evidence',text:'Documento rojo',x:0,y:0,favorite:false,status:'pending',locked:false,category:'documentos',tags:['rojo'],author:'',dateText:'',createdAt:Date.parse('2026-08-03'),updatedAt:Date.parse('2026-08-03')},
  {id:'n3',type:'note',text:'Nota archivada',x:0,y:0,favorite:false,status:'discarded',locked:false,category:'notas',tags:['archivo'],author:'',dateText:'',createdAt:Date.parse('2026-07-01'),updatedAt:Date.parse('2026-07-01')},
] };

test('Fase 28: parsea operadores y campos', () => { const q=parseAdvancedQuery('persona AND tag:urgente NOT status:discarded'); assert.equal(q.groups.length,2); assert.equal(q.groups[0].terms.length,1); assert.equal(q.groups[1].terms.length,2); });
test('Fase 28: AND combina criterios', () => { const r=searchCase(caseModel,'type:person AND tag:urgente'); assert.deepEqual(r.filter(x=>x.kind==='node').map(x=>x.id),['n1']); });
test('Fase 28: OR devuelve cualquiera', () => { const r=searchCase(caseModel,'Ana OR Documento'); const ids=r.filter(x=>x.kind==='node').map(x=>x.id); assert.deepEqual(new Set(ids),new Set(['n1','n2'])); });
test('Fase 28: NOT excluye resultados', () => { const r=searchCase(caseModel,'tag:rojo NOT status:discarded'); assert.deepEqual(new Set(r.filter(x=>x.kind==='node').map(x=>x.id)),new Set(['n1','n2'])); });
test('Fase 28: NOT conserva precedencia frente a OR', () => { const r=searchCase(caseModel,'Ana OR Documento NOT status:discarded'); assert.deepEqual(new Set(r.filter(x=>x.kind==='node').map(x=>x.id)),new Set(['n1','n2'])); });
test('Fase 28: fecha y relaciones', () => { const a=searchCase(caseModel,'date:>=2026-08-02'); assert.ok(a.some(x=>x.id==='n1')); const b=searchCase(caseModel,'related:supports'); assert.ok(b.some(x=>x.id==='n1')); });
