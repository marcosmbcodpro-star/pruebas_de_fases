import { SECURITY_LIMITS } from './security.js';

const DB_NAME = 'mindplace-db';
const DB_VERSION = 3;
const KV_STORE = 'kv';
const ATTACHMENT_STORE = 'attachments';
const META_STORE = 'meta';
const OFFLINE_SYNC_STORE = 'offline-sync-queue';
const OFFLINE_META_STORE = 'offline-meta';

let dbPromise = null;
let migrationPromise = null;
let idbAvailable = typeof indexedDB !== 'undefined';

export function openMindPlaceDB() {
  if (!idbAvailable) return Promise.reject(new Error('IndexedDB no disponible.'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        const store = db.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' });
        store.createIndex('sourceId', 'sourceId', { unique: false });
        store.createIndex('caseId', 'caseId', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_SYNC_STORE)) {
        const store = db.createObjectStore(OFFLINE_SYNC_STORE, { keyPath: 'id' });
        store.createIndex('caseId', 'caseId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(OFFLINE_META_STORE)) {
        db.createObjectStore(OFFLINE_META_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
  });
  return dbPromise;
}

function getLocalStorageKeys() {
  try {
    return Object.keys(localStorage).filter(k => k.startsWith('tc:'));
  } catch (_) {
    return [];
  }
}

async function readKv(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readonly');
    const req = tx.objectStore(KV_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function writeKv(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readwrite');
    const req = tx.objectStore(KV_STORE).put({ key, value });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function readMeta(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function writeMeta(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const req = tx.objectStore(META_STORE).put({ key, value });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function migrateLocalStorageToIndexedDB() {
  if (!idbAvailable) return false;
  try {
    const db = await openMindPlaceDB();
    const marker = await readMeta(db, 'localStorageMigration-v1');
    if (marker?.value?.value === true) return true;
    const keys = getLocalStorageKeys();
    for (const rawKey of keys) {
      const key = rawKey.slice(3);
      const value = localStorage.getItem(rawKey);
      if (value === null) continue;
      const existing = await readKv(db, key);
      if (!existing) {
        await writeKv(db, key, value);
      }
    }
    // Verificación mínima antes de marcar la migración como completada.
    const storeExists = await readKv(db, 'tablero-store-v1');
    if (storeExists || keys.length === 0) {
      await writeMeta(db, 'localStorageMigration-v1', { value: true, completedAt: Date.now() });
    }
    return true;
  } catch (error) {
    console.warn('MindPlace: migración localStorage → IndexedDB no disponible. Se usará fallback.', error);
    return false;
  }
}

export function ensureStorageShim() {
  if (window.storage) return window.storage;
  if (idbAvailable) {
    migrationPromise = migrateLocalStorageToIndexedDB();
    window.storage = {
      async ready() {
        await migrationPromise;
      },
      async get(key, shared) {
        try {
          await migrationPromise;
          const db = await openMindPlaceDB();
          const record = await readKv(db, key);
          if (record) return { key, value: record.value, shared: !!shared };
          // Fallback de lectura por si existe una clave legacy aún no migrada.
          const raw = localStorage.getItem('tc:' + key);
          return raw === null ? null : { key, value: raw, shared: !!shared };
        } catch (_) {
          const raw = localStorage.getItem('tc:' + key);
          return raw === null ? null : { key, value: raw, shared: !!shared };
        }
      },
      async set(key, value, shared) {
        try {
          await migrationPromise;
          const db = await openMindPlaceDB();
          await writeKv(db, key, value);
          return { key, value, shared: !!shared };
        } catch (error) {
          localStorage.setItem('tc:' + key, value);
          return { key, value, shared: !!shared, fallback: true };
        }
      },
      async delete(key, shared) {
        try {
          await migrationPromise;
          const db = await openMindPlaceDB();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(KV_STORE, 'readwrite');
            const req = tx.objectStore(KV_STORE).delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
          });
          try { localStorage.removeItem('tc:' + key); } catch (_) {}
          return { key, deleted: true, shared: !!shared };
        } catch (_) {
          localStorage.removeItem('tc:' + key);
          return { key, deleted: true, shared: !!shared, fallback: true };
        }
      },
      async list(prefix, shared) {
        try {
          await migrationPromise;
          const db = await openMindPlaceDB();
          const rows = await new Promise((resolve, reject) => {
            const tx = db.transaction(KV_STORE, 'readonly');
            const req = tx.objectStore(KV_STORE).getAllKeys();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          return { keys: rows.filter(k => String(k).startsWith(prefix || '')), prefix, shared: !!shared };
        } catch (_) {
          const keys = getLocalStorageKeys().map(k => k.slice(3)).filter(k => k.startsWith(prefix || ''));
          return { keys, prefix, shared: !!shared, fallback: true };
        }
      }
    };
  } else {
    window.storage = {
      async get(key, shared) {
        const raw = localStorage.getItem('tc:' + key);
        if (raw === null) return null;
        return { key, value: raw, shared: !!shared };
      },
      async set(key, value, shared) {
        localStorage.setItem('tc:' + key, value);
        return { key, value, shared: !!shared };
      },
      async delete(key, shared) {
        localStorage.removeItem('tc:' + key);
        return { key, deleted: true, shared: !!shared };
      },
      async list(prefix, shared) {
        const keys = Object.keys(localStorage)
          .filter(k => k.startsWith('tc:' + (prefix || '')))
          .map(k => k.slice(3));
        return { keys, prefix, shared: !!shared };
      }
    };
  }
  return window.storage;
}

export function deepCloneData(value) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch (error) {}
  }
  try { return JSON.parse(JSON.stringify(value)); }
  catch (error) {
    console.warn('MindPlace no pudo clonar de forma segura un objeto para persistencia.', error);
    return null;
  }
}

export function safeJsonParse(raw, fallback = null, label = 'JSON') {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try { return JSON.parse(raw); }
  catch (error) { console.warn(`MindPlace no pudo parsear ${label}.`, error); return fallback; }
}

export function normalizeCategoryFilter(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return [...new Set(raw.filter(v => typeof v === 'string' && v.trim() !== '').map(v => v.trim()))];
}

export function makeEmptyStore() {
  return {
    index: [], cases: {}, theme: 'allanwake2', caseSort: 'updated-desc', caseCategoryFilter: [],
    preferences: { reducedMotion: false, compactUi: false, onboardingSeen: false },
    storageVersion: 2, dataVersion: 3, demoDeleted: {}, attachmentStorage: 'indexeddb', offlineStorage: 'indexeddb-v1', offlineQueue: true
  };
}

export function normalizeStoreForRuntime(target) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) return makeEmptyStore();
  if (!Array.isArray(target.index)) target.index = [];
  if (!target.cases || typeof target.cases !== 'object' || Array.isArray(target.cases)) target.cases = {};
  target.theme = typeof target.theme === 'string' ? target.theme : 'allanwake2';
  target.caseSort = ['updated-desc', 'updated-asc', 'name-asc', 'name-desc', 'status'].includes(target.caseSort) ? target.caseSort : 'updated-desc';
  target.caseCategoryFilter = normalizeCategoryFilter(target.caseCategoryFilter);
  const rawPreferences = target.preferences && typeof target.preferences === 'object' && !Array.isArray(target.preferences) ? target.preferences : {};
  target.preferences = {
    reducedMotion: rawPreferences.reducedMotion === true,
    compactUi: rawPreferences.compactUi === true,
    onboardingSeen: rawPreferences.onboardingSeen === true
  };
  target.storageVersion = 2;
  target.dataVersion = 3;
  target.demoDeleted = target.demoDeleted && typeof target.demoDeleted === 'object' && !Array.isArray(target.demoDeleted) ? { ...target.demoDeleted } : {};
  target.attachmentStorage = target.attachmentStorage === 'legacy' ? 'legacy' : 'indexeddb';
  target.offlineStorage = 'indexeddb-v1';
  target.offlineQueue = true;
  return target;
}

export function validateStoreStructure(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  if (!Array.isArray(candidate.index)) return false;
  if (candidate.index.length > SECURITY_LIMITS.maxCases) return false;
  if (!candidate.cases || typeof candidate.cases !== 'object' || Array.isArray(candidate.cases)) return false;
  if (Object.keys(candidate.cases).length > SECURITY_LIMITS.maxCases) return false;
  if (!Object.values(candidate.cases).every(v => v && typeof v === 'object')) return false;
  for (const value of Object.values(candidate.cases)) {
    if (Array.isArray(value.nodes) && value.nodes.length > SECURITY_LIMITS.maxNodesPerCase) return false;
    if (Array.isArray(value.edges) && value.edges.length > SECURITY_LIMITS.maxEdgesPerCase) return false;
    if (Array.isArray(value.history) && value.history.length > SECURITY_LIMITS.maxHistoryPerCase) return false;
    if (Array.isArray(value.activity) && value.activity.length > SECURITY_LIMITS.maxHistoryPerCase) return false;
  }
  return true;
}
