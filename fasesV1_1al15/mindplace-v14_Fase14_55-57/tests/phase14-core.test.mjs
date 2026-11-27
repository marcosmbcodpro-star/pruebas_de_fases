
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CASE_STATUS, NODE_STATUS, NODE_TYPE, EDGE_TYPE, EDGE_DIRECTION,
  QUESTION_RESOLUTION, CONCLUSION_CONFIDENCE, HISTORY_ACTION,
  createCase, createNode, createEdge, createHistory, createPreferences
} from '../js/models/models.js';
import {
  validateCase, validateNode, validateEdge, validateHistory, validatePreferences
} from '../js/models/validators.js';
import {
  FILTER_CONNECTION_MODES, hasCaseFilters, serializeCaseFilters,
  deserializeCaseFilters, getCaseFilterActiveCount
} from '../js/cases/case-filters.js';
import { normalizeSearchQuery, searchNodeText, searchTermsMatch } from '../js/cases/case-search.js';
import { sortCases, caseMatchesCategory, normalizeCaseCategoryList } from '../js/cases/case-archive.js';
import { deepCloneData, makeEmptyStore, validateStoreStructure } from '../js/core/storage.js';
import { SECURITY_LIMITS } from '../js/core/security.js';
import { createEmptyBoardState, normalizeBoardState } from '../js/core/state.js';

test('158/159 — creación y edición de casos', () => {
  const c = createCase({ id: 'case-a', title: 'Caso A' });
  assert.equal(c.id, 'case-a');
  assert.equal(validateCase(c).valid, true);
  assert.equal(validateCase({ ...c, title: 'Caso A editado' }).normalized.title, 'Caso A editado');
});

test('160 — eliminación y restauración', () => {
  const c = createCase({ id: 'case-trash', nodes: [createNode({id:'n1'})] });
  assert.equal(validateCase({ ...c, nodes: [], edges: [] }).valid, true);
  assert.equal(validateCase(c).normalized.nodes.length, 1);
});

test('161 — tarjetas', () => {
  const n = createNode({
    id:'n-q', type:NODE_TYPE.QUESTION, status:NODE_STATUS.PENDING,
    questionResolution:QUESTION_RESOLUTION.ANSWERED, text:'¿Qué pasó?'
  });
  assert.equal(validateNode(n).valid, true);
  assert.equal(validateNode(n).normalized.type, NODE_TYPE.QUESTION);
});

test('162 — conexiones', () => {
  const e = createEdge({id:'e1', a:'n1', b:'n2', type:EDGE_TYPE.SUPPORTS, direction:EDGE_DIRECTION.FORWARD, label:'apoya'});
  const r = validateEdge(e);
  assert.equal(r.valid, true);
  assert.equal(r.normalized.type, EDGE_TYPE.SUPPORTS);
  assert.equal(r.normalized.direction, EDGE_DIRECTION.FORWARD);
  assert.equal(r.normalized.label, 'apoya');
});

test('163 — categorías y favoritos', () => {
  assert.deepEqual(normalizeCaseCategoryList([' A ', 'A', '', 'B']), ['A', 'B']);
  assert.equal(caseMatchesCategory({category:'A'}, ['A']), true);
  assert.equal(caseMatchesCategory({category:''}, ['__uncategorized__']), true);
});

test('164 — estados', () => {
  for (const status of Object.values(NODE_STATUS)) {
    assert.equal(validateNode(createNode({id:`n-${status}`, status})).valid, true);
  }
  assert.equal(CONCLUSION_CONFIDENCE.HIGH, 'high');
});

test('165 — búsqueda', () => {
  assert.equal(normalizeSearchQuery('  Peluquería  '), 'peluqueria');
  const text = searchNodeText({text:'Peluquería cerrada', tags:['robo','evidencia']});
  assert.equal(searchTermsMatch(text, 'peluqueria evidencia'), true);
  assert.equal(searchTermsMatch(text, 'piscina'), false);
});

test('166 — filtros', () => {
  const types = new Set(['question','conclusion']);
  const states = new Set(['validated']);
  assert.equal(hasCaseFilters(types, states, true, false, FILTER_CONNECTION_MODES.ONLY), true);
  assert.equal(getCaseFilterActiveCount(types, states, true, false, FILTER_CONNECTION_MODES.ONLY), 5);
  const restored = deserializeCaseFilters(
    serializeCaseFilters({types, states, favorites:true, connectionMode:FILTER_CONNECTION_MODES.ONLY})
  );
  assert.deepEqual([...restored.types], ['question','conclusion']);
  assert.deepEqual([...restored.states], ['validated']);
  assert.equal(restored.favorites, true);
});

test('167 — Undo/Redo e historial separados', () => {
  const history = createHistory({caseId:'case-a', action:HISTORY_ACTION.UPDATE_CASE});
  const c = createCase({id:'case-a', history:[history], activity:[{id:'act1', action:'edit'}]});
  assert.equal(validateHistory(history).valid, true);
  assert.equal(validateCase(c).valid, true);
  assert.ok(Array.isArray(c.history));
  assert.ok(Array.isArray(c.activity));
});

test('168 — importación/exportación por snapshot', () => {
  const store = makeEmptyStore();
  const exportCase = createCase({id:'export-1', title:'Exportable'});
  store.cases[exportCase.id] = exportCase;
  store.index.push({id: exportCase.id, title: exportCase.title, updatedAt: exportCase.updatedAt});
  const cloned = deepCloneData(store);
  cloned.cases['export-1'].title = 'Importado';
  assert.equal(store.cases['export-1'].title, 'Exportable');
  assert.equal(validateStoreStructure(store), true);
  assert.equal(cloned.cases['export-1'].title, 'Importado');
});

test('169 — backups/restauración', () => {
  const store = makeEmptyStore();
  const backup = deepCloneData(store);
  assert.equal(validateStoreStructure(store), true);
  assert.deepEqual(Object.keys(backup).sort(), Object.keys(store).sort());
});

test('170 — validación y límites', () => {
  const invalid = {id:'x', title:'X', nodes:new Array(SECURITY_LIMITS.maxNodesPerCase + 1).fill({}), edges:[]};
  const result = validateCase(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /límite/.test(e)));
  const normalized = normalizeBoardState({nodes:'nope', edges:'nope'});
  assert.ok(Array.isArray(normalized.nodes));
  assert.ok(Array.isArray(normalized.edges));
});

test('171 — preferencias/temas', () => {
  const p = createPreferences({theme:'futuristic', reducedMotion:true, compactMode:true});
  assert.equal(validatePreferences(p).valid, true);
});

test('172 — responsive no altera el modelo', () => {
  const board = createEmptyBoardState();
  assert.deepEqual(normalizeBoardState(board), normalizeBoardState(board));
});

test('173 — regresión en orden de casos', () => {
  const list = [
    createCase({id:'a', title:'A', createdAt:1, updatedAt:10}),
    createCase({id:'b', title:'B', createdAt:2, updatedAt:20}),
    createCase({id:'c', title:'C', createdAt:3, updatedAt:15})
  ];
  assert.deepEqual(sortCases(list,'updated-desc').map(x=>x.id), ['b','c','a']);
});
