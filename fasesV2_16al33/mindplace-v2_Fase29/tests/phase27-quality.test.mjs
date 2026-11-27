import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseCase, summarizeDiagnostics } from '../src/services/case-diagnostics.ts';

const node = (id, type, text) => ({ id, type, text, x: 0, y: 0, favorite: false, status: 'normal', locked: false, category: '', tags: [], author: '', dateText: '' });
const edge = (id, a, b, type) => ({ id, a, b, type, kind: type, direction: 'none', label: '' });
const base = { id: 'c1', title: 'Caso', description: '', status: 'abierto', category: '', marker: {x:0,y:0}, nodes: [], edges: [], history: [], activity: [], settings: {}, updatedAt: 1, createdAt: 1 };

test('detecta tarjetas huérfanas, conclusiones sin evidencia y evidencia sin contexto', () => {
  const c = {...base, nodes: [node('q','question','Pregunta'), node('e','evidence','Foto'), node('c','conclusion','Conclusión')]};
  const d = diagnoseCase(c);
  assert.ok(d.summary.byCode['orphan-node'] >= 3);
  assert.equal(d.summary.byCode['conclusion-without-evidence'], 1);
  assert.equal(d.summary.byCode['evidence-without-context'], 1);
});

test('detecta relaciones contradictorias y referencias rotas', () => {
  const c = {...base, nodes: [node('a','note','A'), node('b','note','B')], edges: [edge('s','a','b','supports'), edge('c','a','b','contradicts'), edge('broken','a','missing','related')]};
  const d = diagnoseCase(c);
  assert.equal(d.summary.byCode['contradictory-relationship'], 1);
  assert.equal(d.summary.byCode['broken-reference'], 1);
});

test('detecta tarjetas y personas duplicadas', () => {
  const c = {...base, nodes: [node('a','note','Misma nota'), node('b','note','Misma nota'), node('p1','person','Ana'), node('p2','person','ana')]};
  const d = diagnoseCase(c);
  assert.equal(d.summary.byCode['duplicate-node'], 1);
  assert.equal(d.summary.byCode['duplicate-person'], 1);
});

test('detecta adjuntos sin tarjeta asociada', () => {
  const c = {...base, nodes: [node('a','note','A')], attachments: [{ id:'att1', sourceId:'missing', caseId:'c1', type:'file', name:'x.pdf', mimeType:'application/pdf', size:1, createdAt:1, updatedAt:1 }]};
  const d = diagnoseCase(c);
  assert.equal(d.summary.byCode['orphan-attachment'], 1);
});

test('resume varios casos', () => {
  const a = diagnoseCase({...base, id:'a', nodes:[node('x','question','X')]});
  const b = diagnoseCase({...base, id:'b', nodes:[node('x','question','X')]});
  const s = summarizeDiagnostics([a,b]);
  assert.equal(s.total, a.summary.total+b.summary.total);
  assert.equal(s.byCode['orphan-node'], 2);
});
