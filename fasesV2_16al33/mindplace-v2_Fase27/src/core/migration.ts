import type { MindPlaceStorage } from '../services/storage';
import { readStore, writeStore, writeRecovery } from '../services/storage';
import { validateStore } from '../services/validation';
import type { MindPlaceStore } from '../domain/models';

export const LEGACY_STORE_KEY = 'tablero-store-v1';
export const CURRENT_DATA_VERSION = 3;

export interface MigrationResult { migrated: boolean; recovered: boolean; store: MindPlaceStore | null; }

export async function loadCompatibleStore(storage: MindPlaceStorage): Promise<MigrationResult> {
  await storage.ready();
  const store = await readStore(storage);
  if (!store) return { migrated: false, recovered: false, store: null };
  const check = validateStore(store);
  if (check.valid && check.value) return { migrated: false, recovered: false, store: check.value };
  await writeRecovery(storage, { kind: 'pre-migration', createdAt: Date.now(), store });
  return { migrated: false, recovered: true, store: null };
}

export async function persistMigratedStore(storage: MindPlaceStorage, store: MindPlaceStore): Promise<void> {
  const check = validateStore(store);
  if (!check.valid) throw new Error(`Migración rechazada: ${check.errors.join(' ')}`);
  await writeStore(storage, { ...store, dataVersion: CURRENT_DATA_VERSION });
  await writeRecovery(storage, { kind: 'last-good', createdAt: Date.now(), store });
}
