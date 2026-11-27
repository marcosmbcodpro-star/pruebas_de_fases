import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraphModel, collectBranch } from '../src/services/graph.ts';

function node(id, text, extra = {}) { return { id, type: 'note', text, x: 0, y: 0, status: 'normal', category: '', tags: [], ...extra }; }
function edge(id, a, b, type = 'default') { return { id, a, b, type, kind: type, direction: 'none', label: '' }; }
function makeCase() { return { id: 'c1', title: 'Caso', description: '', status: 'abierto', category: '', marker: {x:0,y:0}, nodes: [node('a','A',{tags:['uno']}),node('b','B',{tags:['uno']}),node('c','C',{status:'validated'}),node('d','D')], edges: [edge('e1','a','b','supports'), edge('e2','a','c','contradicts')], history: [], activity: [], settings: {}, updatedAt: 1, createdAt: 1 }; }

test('315-317: construye una representación de grafo alternativa al tablero', () => { const graph = buildGraphModel(makeCase()); assert.equal(graph.nodes.length,4); assert.equal(graph.edges.length,2); assert.ok(graph.clusters.length >= 2); });
test('318-319: permite centrar/navegar conceptualmente por nodos conectados', () => { const c = makeCase(); assert.deepEqual(new Set(collectBranch(c,'a',1)), new Set(['a','b','c'])); });
test('320-322: filtra relaciones, etiquetas y estados', () => { const c = makeCase(); assert.equal(buildGraphModel(c,{relationTypes:['supports'],tags:[],statuses:[]}).edges.length,1); assert.equal(buildGraphModel(c,{relationTypes:[],tags:['uno'],statuses:[]}).nodes.length,2); assert.equal(buildGraphModel(c,{relationTypes:[],tags:[],statuses:['validated']}).nodes.length,1); });
test('323: muestra una rama limitada a dos niveles', () => { const c = makeCase(); c.edges.push(edge('e3','c','d')); assert.deepEqual(new Set(collectBranch(c,'a',2)), new Set(['a','b','c','d'])); });
test('324-326: detecta hubs, aislados y agrupaciones', () => { const graph = buildGraphModel(makeCase()); assert.ok(graph.hubs.includes('a')); assert.ok(graph.isolated.includes('d')); assert.ok(graph.clusters.length >= 2); });
