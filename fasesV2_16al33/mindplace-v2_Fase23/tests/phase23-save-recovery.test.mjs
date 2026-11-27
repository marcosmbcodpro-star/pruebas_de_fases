import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStateManager, SAVE_STATUSES } from '../js/core/save-state.js';

function installSessionStorage() {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key)
  };
}

test('287-288: estados de guardado son explicitables', () => {
  installSessionStorage();
  const states = [];
  const manager = createSaveStateManager({ getStore: () => ({ value: 1 }), getCurrentCaseId: () => 'c1', validate: () => true, onStatus: state => states.push(state.status) });
  manager.markPending();
  assert.equal(manager.getState().status, SAVE_STATUSES.PENDING);
  assert.ok(states.includes(SAVE_STATUSES.PENDING));
});

test('289-290: autosave y verificación posterior', async () => {
  installSessionStorage();
  let persisted = null;
  const manager = createSaveStateManager({
    getStore: () => ({ value: 2 }), getCurrentCaseId: () => 'c1', validate: () => true,
    writePersisted: async store => { persisted = structuredClone(store); return true; },
    readPersisted: async () => structuredClone(persisted)
  });
  manager.markPending();
  const ok = await manager.flush('test');
  assert.equal(ok, true);
  assert.equal(manager.getState().status, SAVE_STATUSES.SAVED);
  assert.deepEqual(persisted, { value: 2 });
});

test('291-292: conserva borrador ante fallo', async () => {
  installSessionStorage();
  const manager = createSaveStateManager({
    getStore: () => ({ value: 3 }), getCurrentCaseId: () => 'c2', validate: () => true,
    writePersisted: async () => false, readPersisted: async () => null
  });
  manager.markPending('abandon');
  const ok = await manager.flush('pagehide');
  assert.equal(ok, false);
  assert.equal(manager.getState().status, SAVE_STATUSES.ERROR);
  assert.ok(manager.readEditDraft());
});

test('293-294: error queda registrado y el estado se puede consultar', () => {
  installSessionStorage();
  const manager = createSaveStateManager({ getStore: () => ({ value: 4 }), getCurrentCaseId: () => 'c3', validate: () => true });
  manager.markPending('unexpected-error');
  const state = manager.getState();
  assert.equal(state.status, SAVE_STATUSES.PENDING);
  assert.ok(state.dirtySince);
});

test('295-296: cambios pendientes y recuperación temporal', () => {
  installSessionStorage();
  const manager = createSaveStateManager({ getStore: () => ({ value: 5 }), getCurrentCaseId: () => 'c4', validate: () => true });
  manager.writeEditDraft('orientation');
  assert.equal(manager.getState().draftAvailable, true);
  assert.equal(manager.readEditDraft('c4').reason, 'orientation');
  manager.clearEditDraft('c4');
  assert.equal(manager.readEditDraft('c4'), null);
});

test('Fase 23: la recuperación no acepta estado inválido', () => {
  installSessionStorage();
  const manager = createSaveStateManager({ getStore: () => ({ bad: true }), getCurrentCaseId: () => 'c5', validate: () => false });
  assert.equal(manager.writeEditDraft('invalid'), false);
  assert.equal(manager.readEditDraft('c5'), null);
});


test('Fase 23: un guardado no confirmado termina en Error y conserva borrador', async () => {
  installSessionStorage();
  let status = '';
  const manager = createSaveStateManager({
    getStore: () => ({ value: 9 }), getCurrentCaseId: () => 'c9', validate: () => true,
    writePersisted: async () => true, readPersisted: async () => ({ value: 8 }),
    onStatus: state => { status = state.status; }
  });
  manager.markPending('verification');
  const ok = await manager.flush('verification');
  assert.equal(ok, false);
  assert.equal(status, SAVE_STATUSES.ERROR);
  assert.ok(manager.readEditDraft('c9'));
});
