import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applySelectedChanges, compareCaseVersions } from '../js/core/case-version-diff.js';

function makeVersion(id, nodes = [], edges = [], meta = {}) {
  return {
    id, number: Number(id.replace(/\D/g, '') || 1), label: id,
    case: {
      id: 'c1', title: 'Caso', description: '', status: meta.status || 'abierto', category: meta.category || '',
      nodes, edges, marker: { x: 0, y: 0 }, attachments: [], updatedAt: 1
    }
  };
}
function node(id, text, extra = {}) { return { id, type: 'note', text, x: 0, y: 0, status: 'normal', category: '', attachments: [], ...extra }; }
function edge(id, a, b, extra = {}) { return { id, a, b, type: 'default', kind: 'default', direction: 'none', label: '', ...extra }; }
function attachment(id, name) { return { id, name, mimeType: 'text/plain', size: 1 }; }

test('306-313: compara tarjetas, conexiones, estado/categoría y adjuntos', () => {
  const v1 = makeVersion('v1', [node('n1', 'A'), node('n2', 'B'), node('n4', 'D', { category: 'vieja' })], [edge('e1', 'n1', 'n2')], { status: 'abierto', category: 'base' });
  v1.case.nodes[0].attachments = [attachment('a1', 'foto.png')];
  const v2 = makeVersion('v2', [node('n1', 'A modificada', { status: 'validated', category: 'prueba' }), node('n3', 'C'), node('n4', 'D', { category: 'nueva' })], [edge('e2', 'n1', 'n3', { type: 'supports', label: 'apoya' })], { status: 'resuelto', category: 'final' });
  v2.case.nodes[0].attachments = [attachment('a2', 'otro.png')];
  const diff = compareCaseVersions(v1, v2);
  assert.equal(diff.identical, false);
  assert.ok(diff.changes.some(c => c.kind === 'node' && c.status === 'modified' && c.nodeId === 'n1'));
  assert.ok(diff.changes.some(c => c.kind === 'node' && c.status === 'deleted' && c.nodeId === 'n2'));
  assert.ok(diff.changes.some(c => c.kind === 'node' && c.status === 'added' && c.nodeId === 'n3'));
  assert.ok(diff.changes.some(c => c.kind === 'edge' && c.status === 'deleted' && c.edgeId === 'e1'));
  assert.ok(diff.changes.some(c => c.kind === 'edge' && c.status === 'added' && c.edgeId === 'e2'));
  assert.ok(diff.changes.some(c => c.kind === 'case-meta' && c.field === 'status'));
  assert.ok(diff.changes.some(c => c.kind === 'case-meta' && c.field === 'category'));
  assert.ok(diff.changes.some(c => c.kind === 'attachment'));
  assert.ok(diff.summary.total >= 8);
});

test('309-311: informa campos modificados y separa cambios de estado/categoría', () => {
  const v1 = makeVersion('v1', [node('n1', 'A', { status: 'normal', category: 'uno' })]);
  const v2 = makeVersion('v2', [node('n1', 'B', { status: 'validated', category: 'dos' })]);
  const diff = compareCaseVersions(v1, v2);
  const card = diff.changes.find(c => c.kind === 'node' && c.nodeId === 'n1');
  assert.deepEqual(card.changedFields, ['text']);
  assert.ok(diff.changes.some(c => c.kind === 'node-meta' && c.nodeId === 'n1' && c.field === 'status'));
  assert.ok(diff.changes.some(c => c.kind === 'node-meta' && c.nodeId === 'n1' && c.field === 'category'));
});

test('314: restaura selectivamente solo los cambios elegidos desde la versión de referencia', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A'), node('n2', 'B')], [edge('e1', 'n1', 'n2')], { status: 'abierto', category: 'base' });
  const v2 = makeVersion('v2', [node('n1', 'A2'), node('n3', 'C')], [edge('e2', 'n1', 'n3')], { status: 'resuelto', category: 'final' });
  const diff = compareCaseVersions(v1, v2);
  const selected = new Set(diff.changes.filter(c => c.kind === 'node' && c.nodeId === 'n1').map(c => c.id));
  const current = structuredClone(v2.case);
  const result = await applySelectedChanges(current, diff, selected, { attachmentExists: async () => true });
  assert.equal(result.changed, true);
  assert.equal(result.case.nodes.find(n => n.id === 'n1').text, 'A');
  assert.ok(result.case.nodes.some(n => n.id === 'n3'));
});


test('314: restaura también altas y bajas de tarjetas y conexiones', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A'), node('n2', 'B')], [edge('e1', 'n1', 'n2')]);
  const v2 = makeVersion('v2', [node('n1', 'A'), node('n3', 'C')], [edge('e2', 'n1', 'n3')]);
  const diff = compareCaseVersions(v1, v2);
  const selected = new Set(diff.changes.filter(c => c.kind === 'node' || c.kind === 'edge').map(c => c.id));
  const result = await applySelectedChanges(v2.case, diff, selected);
  assert.ok(result.case.nodes.some(n => n.id === 'n2'));
  assert.ok(!result.case.nodes.some(n => n.id === 'n3'));
  assert.ok(result.case.edges.some(e => e.id === 'e1'));
  assert.ok(!result.case.edges.some(e => e.id === 'e2'));
});

test('314: no restaura un adjunto si el binario ya no existe', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A')]);
  v1.case.nodes[0].attachments = [attachment('a1', 'foto.png')];
  const v2 = makeVersion('v2', [node('n1', 'A')]);
  const diff = compareCaseVersions(v1, v2);
  const attachmentChange = diff.changes.find(c => c.kind === 'attachment' && c.status === 'deleted');
  const result = await applySelectedChanges(v2.case, diff, [attachmentChange.id], { attachmentExists: async () => false });
  assert.equal(result.applied.length, 0);
  assert.equal(result.skipped[0].reason, 'attachment-binary-missing');
});




test('314: restauración de una tarjeta no sobrescribe estado ni categoría no seleccionados', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A', { status: 'normal', category: 'uno', priority: 'baja' })]);
  const v2 = makeVersion('v2', [node('n1', 'B', { status: 'validated', category: 'dos', priority: 'alta' })]);
  const diff = compareCaseVersions(v1, v2);
  const nodeChange = diff.changes.find(c => c.kind === 'node' && c.nodeId === 'n1');
  const current = structuredClone(v2.case);
  const result = await applySelectedChanges(current, diff, [nodeChange.id]);
  const restored = result.case.nodes[0];
  assert.equal(restored.text, 'A');
  assert.equal(restored.priority, 'baja');
  assert.equal(restored.status, 'validated');
  assert.equal(restored.category, 'dos');
});



test('314: restaurar un adjunto añadido solo elimina su referencia, sin exigir el binario', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A')]);
  const v2 = makeVersion('v2', [node('n1', 'A')]);
  v2.case.nodes[0].attachments = [attachment('a2', 'nuevo.txt')];
  const diff = compareCaseVersions(v1, v2);
  const change = diff.changes.find(c => c.kind === 'attachment' && c.status === 'added');
  const result = await applySelectedChanges(structuredClone(v2.case), diff, [change.id], { attachmentExists: async () => false });
  assert.equal(result.changed, true);
  assert.equal(result.applied.length, 1);
  assert.equal(result.case.nodes[0].attachments.length, 0);
});

test('312-314: restaurar una tarjeta no pisa sus adjuntos salvo que se seleccione el cambio de adjunto', async () => {
  const v1 = makeVersion('v1', [node('n1', 'A')]);
  v1.case.nodes[0].attachments = [attachment('a1', 'viejo.txt')];
  const v2 = makeVersion('v2', [node('n1', 'B')]);
  v2.case.nodes[0].attachments = [attachment('a2', 'nuevo.txt')];
  const diff = compareCaseVersions(v1, v2);
  const nodeChange = diff.changes.find(c => c.kind === 'node' && c.nodeId === 'n1');
  const current = structuredClone(v2.case);
  const result = await applySelectedChanges(current, diff, [nodeChange.id]);
  assert.equal(result.case.nodes[0].text, 'A');
  assert.equal(result.case.nodes[0].attachments[0].id, 'a2');
});

test('accesibilidad: paneles de búsqueda, filtros y estructura no conservan foco al ocultarse', () => {
  const html = fs.readFileSync(new URL('../index_mejoras.html', import.meta.url), 'utf8');
  for (const id of ['caseSearchPanel', 'caseFilterPanel', 'caseStructurePanel']) {
    const block = html.match(new RegExp(`<div id="${id}"[\\s\\S]*?<\\/div>`))?.[0] || '';
    assert.match(block, /inert/);
    assert.match(block, /aria-hidden="true"/);
  }
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.indexOf("hideAccessibleRegion(caseSearchPanel, caseSearchToggle);") < app.indexOf("caseSearchPanel.classList.add('hidden');"));
  assert.ok(app.includes("caseSearchPanel.removeAttribute('inert');"));
  assert.ok(app.includes("caseFilterPanel.removeAttribute('inert');"));
  assert.ok(app.includes("caseStructurePanel.removeAttribute('inert');"));
});

