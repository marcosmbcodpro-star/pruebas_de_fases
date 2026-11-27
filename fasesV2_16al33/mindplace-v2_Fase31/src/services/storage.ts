import type { MindPlaceStore, RecoveryState } from '../domain/models';

export interface StorageRecord { key: string; value: string; shared?: boolean; }
export interface MindPlaceStorage {
  ready(): Promise<void>;
  get(key: string, shared?: boolean): Promise<StorageRecord | null>;
  set(key: string, value: string, shared?: boolean): Promise<StorageRecord>;
  delete(key: string, shared?: boolean): Promise<{ key: string; deleted: boolean; shared?: boolean }>;
  list(prefix?: string, shared?: boolean): Promise<StorageRecord[]>;
}

const DB_NAME = 'mindplace-db';
const DB_VERSION = 3;
const KV_STORE = 'kv';
const META_STORE = 'meta';
const STORE_KEY = 'tablero-store-v1';
const RECOVERY_KEY = `${STORE_KEY}-recovery-v1`;
const LAST_GOOD_KEY = `${STORE_KEY}-last-good`;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains('offline-sync-queue')) db.createObjectStore('offline-sync-queue', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('offline-meta')) db.createObjectStore('offline-meta', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
  });
  return dbPromise;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error de IndexedDB.'));
  });
}

async function getKv(key: string): Promise<StorageRecord | null> {
  const db = await openDb();
  return requestValue(db.transaction(KV_STORE, 'readonly').objectStore(KV_STORE).get(key)) as Promise<StorageRecord | null>;
}

async function putKv(record: StorageRecord): Promise<StorageRecord> {
  const db = await openDb();
  await requestValue(db.transaction(KV_STORE, 'readwrite').objectStore(KV_STORE).put(record));
  return record;
}

export function createIndexedDbStorage(): MindPlaceStorage {
  return {
    async ready() { await openDb(); },
    async get(key, shared) {
      const result = await getKv(key);
      return result ? { key, value: result.value, shared: !!shared } : null;
    },
    async set(key, value, shared) { return putKv({ key, value, shared: !!shared }); },
    async delete(key, shared) {
      const db = await openDb();
      await requestValue(db.transaction(KV_STORE, 'readwrite').objectStore(KV_STORE).delete(key));
      return { key, deleted: true, shared: !!shared };
    },
    async list(prefix = '', shared) {
      const db = await openDb();
      const rows = await new Promise<StorageRecord[]>((resolve, reject) => {
        const request = db.transaction(KV_STORE, 'readonly').objectStore(KV_STORE).getAll();
        request.onsuccess = () => resolve((request.result as StorageRecord[]).filter(row => row.key.startsWith(prefix)));
        request.onerror = () => reject(request.error ?? new Error('No se pudo listar IndexedDB.'));
      });
      return rows.map(row => ({ ...row, shared: !!shared }));
    }
  };
}

function parseStore(value: string | null): MindPlaceStore | null {
  if (!value) return null;
  try { return JSON.parse(value) as MindPlaceStore; } catch { return null; }
}

export async function readStore(storage: MindPlaceStorage): Promise<MindPlaceStore | null> {
  return parseStore((await storage.get(STORE_KEY))?.value ?? null);
}

export async function writeStore(storage: MindPlaceStorage, store: MindPlaceStore): Promise<void> {
  await storage.set(STORE_KEY, JSON.stringify(store));
}

export async function writeRecovery(storage: MindPlaceStorage, recovery: RecoveryState): Promise<void> {
  await storage.set(recovery.kind === 'last-good' ? LAST_GOOD_KEY : RECOVERY_KEY, JSON.stringify(recovery));
}

export async function readRecovery(storage: MindPlaceStorage, kind: RecoveryState['kind']): Promise<RecoveryState | null> {
  const key = kind === 'last-good' ? LAST_GOOD_KEY : RECOVERY_KEY;
  const value = (await storage.get(key))?.value ?? null;
  if (!value) return null;
  try { return JSON.parse(value) as RecoveryState; } catch { return null; }
}
