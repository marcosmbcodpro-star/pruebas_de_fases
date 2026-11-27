import { openMindPlaceDB, deepCloneData, safeJsonParse } from './storage.js';

const SYNC_STORE = 'offline-sync-queue';
const META_STORE = 'offline-meta';
const META_KEY = 'offline-state-v1';
const DB_VERSION_REQUIRED = 4;
const MAX_QUEUE_ITEMS = 50;
const MAX_QUEUE_BYTES = 8 * 1024 * 1024;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error de IndexedDB.'));
  });
}

function now() { return Date.now(); }

function makeId() {
  return `sync-${now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function estimateBytes(value) {
  try { return new Blob([JSON.stringify(value)]).size; }
  catch (_) { return JSON.stringify(value)?.length || 0; }
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

async function readMeta(db) {
  const row = await requestAsPromise(db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(META_KEY));
  return row?.value && typeof row.value === 'object' ? row.value : {};
}

async function writeMeta(db, value) {
  await requestAsPromise(db.transaction(META_STORE, 'readwrite').objectStore(META_STORE).put({ key: META_KEY, value }));
}

async function listQueue(db) {
  const rows = await requestAsPromise(db.transaction(SYNC_STORE, 'readonly').objectStore(SYNC_STORE).getAll());
  return Array.isArray(rows) ? rows.sort((a, b) => Number(a.createdAt) - Number(b.createdAt)) : [];
}

async function putQueue(db, item) {
  await requestAsPromise(db.transaction(SYNC_STORE, 'readwrite').objectStore(SYNC_STORE).put(item));
}

async function deleteQueue(db, id) {
  await requestAsPromise(db.transaction(SYNC_STORE, 'readwrite').objectStore(SYNC_STORE).delete(id));
}

async function compactQueue(db) {
  const rows = await listQueue(db);
  const seenCases = new Set();
  const toDelete = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const caseKey = `${row.caseId || ''}:${row.kind || 'store'}`;
    if (seenCases.has(caseKey)) toDelete.push(row.id);
    else seenCases.add(caseKey);
  }
  for (const id of toDelete) await deleteQueue(db, id);
}

export function createOfflineManager({
  getStore = () => null,
  getCurrentCaseId = () => null,
  validate = () => true,
  onState = () => {},
  syncHandler = null
} = {}) {
  let destroyed = false;
  let currentSyncHandler = syncHandler;
  let online = isOnline();
  let syncing = false;
  let lastError = '';
  let lastSyncAt = null;

  const emit = (extra = {}) => {
    if (destroyed) return;
    getState().then(snapshot => {
      try { onState({ ...snapshot, ...extra }); } catch (_) {}
    });
  };

  async function getState() {
    if (typeof indexedDB === 'undefined') {
      return { online, syncing, queued: 0, lastError, lastSyncAt, supported: false, readyForSync: false };
    }
    try {
      const db = await openMindPlaceDB();
      const rows = await listQueue(db);
      const meta = await readMeta(db);
      return {
        online,
        syncing,
        queued: rows.length,
        lastError,
        lastSyncAt: lastSyncAt || meta.lastSyncAt || null,
        supported: db.version >= DB_VERSION_REQUIRED,
        readyForSync: Boolean(currentSyncHandler)
      };
    } catch (error) {
      return { online, syncing, queued: 0, lastError: error?.message || 'Error offline', lastSyncAt, supported: false, readyForSync: Boolean(currentSyncHandler) };
    }
  }

  async function enqueueStoreChange(reason = 'offline-change') {
    if (typeof indexedDB === 'undefined') return false;
    const snapshot = deepCloneData(getStore());
    const caseId = String(getCurrentCaseId() || '');
    if (!snapshot || !validate(snapshot)) return false;
    const payload = { schema: 1, caseId, reason, createdAt: now(), store: snapshot };
    const bytes = estimateBytes(payload);
    if (bytes > MAX_QUEUE_BYTES) {
      lastError = 'El cambio offline es demasiado grande para la cola local.';
      emit();
      return false;
    }
    try {
      const db = await openMindPlaceDB();
      const rows = await listQueue(db);
      const caseKey = `${caseId}:store`;
      for (const row of rows) {
        if (`${row.caseId || ''}:${row.kind || 'store'}` === caseKey) await deleteQueue(db, row.id);
      }
      await putQueue(db, {
        id: makeId(), kind: 'store', caseId, reason, createdAt: payload.createdAt,
        bytes, payload
      });
      await compactQueue(db);
      const compacted = await listQueue(db);
      if (compacted.length > MAX_QUEUE_ITEMS) {
        for (const row of compacted.slice(0, compacted.length - MAX_QUEUE_ITEMS)) await deleteQueue(db, row.id);
      }
      lastError = '';
      emit();
      return true;
    } catch (error) {
      lastError = error?.message || 'No se pudo encolar el cambio offline.';
      emit();
      return false;
    }
  }

  async function listPending() {
    if (typeof indexedDB === 'undefined') return [];
    try { return await listQueue(await openMindPlaceDB()); } catch (_) { return []; }
  }

  async function flushQueue() {
    if (syncing || !online) return { ok: false, reason: !online ? 'offline' : 'busy' };
    const rows = await listPending();
    if (!rows.length) { emit(); return { ok: true, count: 0 }; }
    if (typeof currentSyncHandler !== 'function') {
      lastError = '';
      // Fase 31: los datos ya están persistidos localmente. La cola queda preparada
      // para el backend/sync real de Fase 32 y no se descarta prematuramente.
      emit({ deferred: true });
      return { ok: true, deferred: true, count: rows.length };
    }
    syncing = true;
    emit();
    try {
      for (const row of rows) {
        const result = await currentSyncHandler(row.payload);
        if (result?.conflict) {
          const dbConflict = await openMindPlaceDB();
          const conflictStore = dbConflict.transaction('sync-conflicts', 'readwrite').objectStore('sync-conflicts');
          await requestAsPromise(conflictStore.put({ id: `${row.id}-conflict`, queueId: row.id, caseId: row.caseId || '', createdAt: now(), localPayload: row.payload, result }));
          await deleteQueue(await openMindPlaceDB(), row.id);
          lastError = result.error || 'Conflicto de sincronización.';
          throw new Error(lastError);
        }
        if (result === false || result?.ok === false) throw new Error(result?.error || 'El servidor no confirmó el cambio offline.');
        await deleteQueue(await openMindPlaceDB(), row.id);
      }
      lastSyncAt = now();
      const db = await openMindPlaceDB();
      await writeMeta(db, { lastSyncAt, completedAt: lastSyncAt, queued: 0 });
      lastError = '';
      return { ok: true, count: rows.length };
    } catch (error) {
      lastError = error?.message || 'Error de sincronización offline.';
      return { ok: false, count: rows.length, error: lastError };
    } finally {
      syncing = false;
      emit();
    }
  }

  async function listConflicts() {
    try { const db = await openMindPlaceDB(); return await requestAsPromise(db.transaction('sync-conflicts','readonly').objectStore('sync-conflicts').getAll()); } catch (_) { return []; }
  }

  async function saveConflict(record) {
    try { const db = await openMindPlaceDB(); const id = record?.id || `manual-${now()}-${Math.random().toString(36).slice(2,8)}`; await requestAsPromise(db.transaction('sync-conflicts','readwrite').objectStore('sync-conflicts').put({ ...record, id, createdAt: record?.createdAt || now() })); emit(); return id; } catch (_) { return null; }
  }

  async function clearConflict(id) {
    try { const db = await openMindPlaceDB(); await requestAsPromise(db.transaction('sync-conflicts','readwrite').objectStore('sync-conflicts').delete(id)); emit(); return true; } catch (_) { return false; }
  }

  function setSyncHandler(handler) { currentSyncHandler = typeof handler === 'function' ? handler : null; emit(); }

  async function recoverQueuedStore() {
    const rows = await listPending();
    const latest = rows[rows.length - 1];
    if (!latest?.payload?.store || !validate(latest.payload.store)) return null;
    return {
      store: deepCloneData(latest.payload.store),
      caseId: latest.caseId || latest.payload.caseId || null,
      createdAt: latest.createdAt,
      reason: latest.reason || 'offline-change'
    };
  }

  async function bootstrap() {
    try {
      const db = await openMindPlaceDB();
      const meta = await readMeta(db);
      if (!meta.initializedAt) await writeMeta(db, { initializedAt: now(), lastSyncAt: meta.lastSyncAt || null });
    } catch (error) { lastError = error?.message || 'No se pudo inicializar el soporte offline.'; }
    emit();
  }

  function handleOnline() {
    online = true;
    emit({ recovered: true });
    void flushQueue();
  }

  function handleOffline() {
    online = false;
    emit({ offlineSince: now() });
  }

  function handleServiceWorkerMessage(event) {
    if (event?.data?.type === 'mindplace:offline-sync-request') void flushQueue();
  }

  function setup() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage);
    void bootstrap();
  }

  function destroy() {
    destroyed = true;
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    navigator.serviceWorker?.removeEventListener?.('message', handleServiceWorkerMessage);
  }

  setup();
  return { getState, enqueueStoreChange, listPending, flushQueue, recoverQueuedStore, listConflicts, saveConflict, clearConflict, setSyncHandler, destroy };
}

export function registerBackgroundSync(registration) {
  try {
    if (registration && 'sync' in registration && typeof registration.sync?.register === 'function') {
      return registration.sync.register('mindplace-offline-sync').then(() => true).catch(() => false);
    }
  } catch (_) {}
  return Promise.resolve(false);
}

export function parseOfflinePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') return safeJsonParse(value, null, 'cola offline');
  return value && typeof value === 'object' ? value : null;
}
