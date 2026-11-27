import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaseVersionManager } from '../js/core/case-versions.js';

function makeStorage() {
  const map = new Map();
  return {
    async get(key) { return map.has(key) ? { key, value: map.get(key) } : null; },
    async set(key, value) { map.set(key, String(value)); return { key, value: String(value) }; },
    async delete(key) { map.delete(key); return { key, deleted: true }; }
  };
}

function makeCase(text = 'Caso') {
  return {
    id: 'c1', title: text, description: '', status: 'abierto', category: '',
    marker: { x: 100, y: 100 }, nodes: [{ id: 'n1', type: 'note', text, x: 0, y: 0, favorite: false, status: 'normal', locked: false, category: '', tags: [], author: '', dateText: '' }],
    edges: [], history: [], activity: [], settings: {}, createdAt: 1, updatedAt: 1
  };
}

test('297-298: crea versiones persistentes y puntos automáticos', async () => {
  const storage = makeStorage();
  let now = 1000;
  const manager = createCaseVersionManager({ storage, getCase: () => makeCase('A'), getCurrentCaseId: () => 'c1', now: () => now, autoIntervalMs: 100 });
  const first = await manager.createManual({ caseModel: makeCase('A'), label: 'Base' });
  assert.equal(first.created, true);
  now = 1201;
  const auto = await manager.maybeCreateAuto({ caseModel: makeCase('B') });
  assert.equal(auto.created, true);
  assert.equal(manager.list('c1').length, 2);
});

test('299-301: version manual tiene número, fecha y descripción', async () => {
  const manager = createCaseVersionManager({ storage: makeStorage(), getCurrentCaseId: () => 'c1', now: () => 2000 });
  const result = await manager.createManual({ caseModel: makeCase('A'), label: 'Investigación inicial', description: 'Primera hipótesis revisada' });
  assert.equal(result.version.number, 1);
  assert.equal(result.version.createdAt, 2000);
  assert.equal(result.version.label, 'Investigación inicial');
  assert.equal(result.version.description, 'Primera hipótesis revisada');
});

test('302: restaura una versión anterior tras guardar antes el estado actual', async () => {
  const storage = makeStorage();
  let current = makeCase('A');
  const manager = createCaseVersionManager({
    storage, getCurrentCaseId: () => 'c1', getCase: () => current,
    saveBeforeRestore: async () => true,
    setCase: async next => { current = next; return true; },
    now: (() => { let t = 1000; return () => t++; })()
  });
  const v1 = await manager.createManual({ caseModel: current, label: 'Versión A' });
  current = makeCase('B');
  await manager.createManual({ caseModel: current, label: 'Versión B' });
  const restored = await manager.restore(v1.version.id, 'c1');
  assert.equal(restored.restored, true);
  assert.equal(current.title, 'A');
});

test('303-304: backups se conservan y las versiones quedan separadas de Undo/Redo', async () => {
  const storage = makeStorage();
  await storage.set('tablero-backup-v1', JSON.stringify({ backup: true }));
  const manager = createCaseVersionManager({ storage, getCurrentCaseId: () => 'c1' });
  const result = await manager.createManual({ caseModel: makeCase('A'), label: 'Punto estable', protectedVersion: true });
  const backup = await storage.get('tablero-backup-v1');
  assert.equal(result.version.protected, true);
  assert.equal(backup.value, JSON.stringify({ backup: true }));
  assert.deepEqual(manager.constants.schema, 1);
});

test('305: versiones protegidas no pueden eliminarse accidentalmente', async () => {
  const manager = createCaseVersionManager({ storage: makeStorage(), getCurrentCaseId: () => 'c1' });
  const result = await manager.createManual({ caseModel: makeCase('A'), protectedVersion: true });
  const deletion = await manager.remove(result.version.id, 'c1');
  assert.equal(deletion.deleted, false);
  assert.equal(deletion.reason, 'protected');
});

test('Fase 24: duplicados automáticos se evitan', async () => {
  const manager = createCaseVersionManager({ storage: makeStorage(), getCurrentCaseId: () => 'c1', now: () => 1000 });
  await manager.createManual({ caseModel: makeCase('A') });
  const second = await manager.maybeCreateAuto({ caseModel: makeCase('A') });
  assert.equal(second.created, false);
  assert.equal(second.skipped, 'same-state');
});

test('Fase 24: restauración puede rechazarse si el guardado previo falla', async () => {
  const manager = createCaseVersionManager({ storage: makeStorage(), getCurrentCaseId: () => 'c1', saveBeforeRestore: async () => false });
  const result = await manager.createManual({ caseModel: makeCase('A') });
  const restore = await manager.restore(result.version.id, 'c1');
  assert.equal(restore.restored, false);
  assert.equal(restore.reason, 'save-before-restore-failed');
});
