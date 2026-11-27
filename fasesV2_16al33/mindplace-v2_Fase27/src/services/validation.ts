import type { Attachment, CaseModel, EdgeModel, HistoryEntry, MindPlaceStore, NodeModel, PreferencesModel } from '../domain/models';

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export interface ValidationResult<T> { valid: boolean; errors: string[]; value: T | null; }

export function validateAttachment(value: unknown): ValidationResult<Attachment> {
  const errors: string[] = [];
  if (!isObject(value)) return { valid: false, errors: ['El adjunto debe ser un objeto.'], value: null };
  const item = value as Partial<Attachment>;
  if (!isNonEmptyString(item.id)) errors.push('Falta id del adjunto.');
  if (!isNonEmptyString(item.sourceId)) errors.push('Falta sourceId del adjunto.');
  if (!isNonEmptyString(item.caseId)) errors.push('Falta caseId del adjunto.');
  if (!Number.isFinite(item.size) || Number(item.size) < 0) errors.push('Tamaño de adjunto inválido.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as Attachment };
}

export function validateNode(value: unknown): ValidationResult<NodeModel> {
  if (!isObject(value)) return { valid: false, errors: ['La tarjeta debe ser un objeto.'], value: null };
  const item = value as Partial<NodeModel>; const errors: string[] = [];
  if (!isNonEmptyString(item.id)) errors.push('Falta id de tarjeta.');
  if (!isNonEmptyString(item.type)) errors.push('Falta tipo de tarjeta.');
  if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) errors.push('Posición inválida.');
  if (!Array.isArray(item.tags)) errors.push('Las etiquetas deben ser un array.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as NodeModel };
}

export function validateEdge(value: unknown): ValidationResult<EdgeModel> {
  if (!isObject(value)) return { valid: false, errors: ['La conexión debe ser un objeto.'], value: null };
  const item = value as Partial<EdgeModel>; const errors: string[] = [];
  if (!isNonEmptyString(item.id)) errors.push('Falta id de conexión.');
  if (!isNonEmptyString(item.a) || !isNonEmptyString(item.b)) errors.push('Origen/destino inválidos.');
  if (item.a === item.b) errors.push('Una conexión no puede unir un nodo consigo mismo.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as EdgeModel };
}

export function validateHistory(value: unknown): ValidationResult<HistoryEntry> {
  if (!isObject(value)) return { valid: false, errors: ['La entrada de historial debe ser un objeto.'], value: null };
  const item = value as Partial<HistoryEntry>; const errors: string[] = [];
  if (!isNonEmptyString(item.id) || !isNonEmptyString(item.caseId)) errors.push('Entrada de historial sin identidad.');
  if (!Number.isFinite(item.timestamp)) errors.push('Marca temporal inválida.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as HistoryEntry };
}

export function validatePreferences(value: unknown): ValidationResult<PreferencesModel> {
  if (!isObject(value)) return { valid: false, errors: ['Las preferencias deben ser un objeto.'], value: null };
  const item = value as Partial<PreferencesModel>; const errors: string[] = [];
  if (!Number.isFinite(item.boardZoom) || Number(item.boardZoom) <= 0) errors.push('Zoom inválido.');
  if (!Array.isArray(item.caseCategoryFilter)) errors.push('Filtro de categorías inválido.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as PreferencesModel };
}

export function validateCase(value: unknown): ValidationResult<CaseModel> {
  if (!isObject(value)) return { valid: false, errors: ['El caso debe ser un objeto.'], value: null };
  const item = value as Partial<CaseModel>; const errors: string[] = [];
  if (!isNonEmptyString(item.id)) errors.push('Falta id de caso.');
  if (!isNonEmptyString(item.title)) errors.push('Falta título de caso.');
  if (!Array.isArray(item.nodes)) errors.push('Nodos inválidos.');
  if (!Array.isArray(item.edges)) errors.push('Conexiones inválidas.');
  if (!Array.isArray(item.history)) errors.push('Historial inválido.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as CaseModel };
}

export function validateStore(value: unknown): ValidationResult<MindPlaceStore> {
  if (!isObject(value)) return { valid: false, errors: ['El almacén debe ser un objeto.'], value: null };
  const item = value as Partial<MindPlaceStore>; const errors: string[] = [];
  if (!Array.isArray(item.index)) errors.push('Índice inválido.');
  if (!isObject(item.cases)) errors.push('Casos inválidos.');
  if (!Number.isFinite(item.storageVersion) || !Number.isFinite(item.dataVersion)) errors.push('Versiones de datos inválidas.');
  const preferences = validatePreferences(item.preferences);
  if (!preferences.valid) errors.push(...preferences.errors.map(error => `preferencias: ${error}`));
  if (isObject(item.cases)) Object.values(item.cases).forEach((candidate, i) => {
    const result = validateCase(candidate);
    if (!result.valid) errors.push(`caso[${i}]: ${result.errors.join(', ')}`);
  });
  return { valid: errors.length === 0, errors, value: errors.length ? null : item as MindPlaceStore };
}
