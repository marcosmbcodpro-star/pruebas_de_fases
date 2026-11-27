import type { MindPlaceStore } from '../domain/models';
import { validateStore } from './validation';

export interface MindPlaceExportEnvelope { app: 'MindPlace'; format: 'mindplace-json'; version: 1; exportedAt: number; store: MindPlaceStore; }

export function exportStore(store: MindPlaceStore): string {
  const check = validateStore(store);
  if (!check.valid) throw new Error(`No se puede exportar: ${check.errors.join(' ')}`);
  const payload: MindPlaceExportEnvelope = { app: 'MindPlace', format: 'mindplace-json', version: 1, exportedAt: Date.now(), store };
  return JSON.stringify(payload, null, 2);
}

export function importStore(text: string): MindPlaceStore {
  const raw: unknown = JSON.parse(text);
  const candidate = raw && typeof raw === 'object' && 'store' in raw ? (raw as { store: unknown }).store : raw;
  const check = validateStore(candidate);
  if (!check.valid || !check.value) throw new Error(`Los datos importados no son válidos: ${check.errors.join(' ')}`);
  return check.value;
}
