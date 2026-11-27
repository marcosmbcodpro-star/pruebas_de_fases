/**
 * Fase 24 — versionado persistente de casos.
 *
 * Diferencia explícitamente:
 *   - versiones persistentes (este módulo),
 *   - historial de actividad,
 *   - Undo/Redo (estado temporal de edición).
 *
 * Las versiones guardan una instantánea serializable del caso y los metadatos
 * necesarios para presentarlo, restaurarlo y protegerlo contra borrado.
 */

export const CASE_VERSION_SCHEMA = 1;
export const CASE_VERSION_KEY_PREFIX = 'mindplace-case-versions-v1:';
export const DEFAULT_MAX_VERSIONS = 80;
export const DEFAULT_AUTO_INTERVAL_MS = 5 * 60 * 1000;

function clone(value) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
}

function normalizeLabel(value, fallback = 'Versión del caso') {
  const label = String(value ?? '').trim().slice(0, 140);
  return label || fallback;
}

function stableStringify(value) {
  try {
    return JSON.stringify(value, Object.keys(value || {}).sort());
  } catch (_) {
    try { return JSON.stringify(value); } catch (_) { return ''; }
  }
}

function makeId(caseId, now = Date.now()) {
  return `cv-${String(caseId || 'case')}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeVersion(raw, fallbackCaseId = '') {
  if (!raw || typeof raw !== 'object') return null;
  const version = {
    schema: CASE_VERSION_SCHEMA,
    id: String(raw.id || makeId(fallbackCaseId)),
    caseId: String(raw.caseId || fallbackCaseId || ''),
    number: Number.isFinite(Number(raw.number)) ? Math.max(1, Number(raw.number)) : 1,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    label: normalizeLabel(raw.label),
    description: String(raw.description ?? '').trim().slice(0, 500),
    reason: String(raw.reason || 'manual').slice(0, 80),
    protected: raw.protected === true,
    source: raw.source === 'auto' ? 'auto' : 'manual',
    fingerprint: String(raw.fingerprint || ''),
    case: clone(raw.case)
  };
  if (!version.case || typeof version.case !== 'object') return null;
  return version;
}

export function createCaseVersionManager({
  storage = null,
  getCase = () => null,
  getCurrentCaseId = () => null,
  setCase = () => false,
  saveBeforeRestore = async () => true,
  afterRestore = () => {},
  maxVersions = DEFAULT_MAX_VERSIONS,
  autoIntervalMs = DEFAULT_AUTO_INTERVAL_MS,
  now = () => Date.now(),
  uid = makeId,
  onChange = () => {}
} = {}) {
  const storeApi = storage || (typeof window !== 'undefined' ? window.storage : null);
  const state = new Map();

  function key(caseId) { return `${CASE_VERSION_KEY_PREFIX}${String(caseId)}`; }

  async function load(caseId = getCurrentCaseId()) {
    if (!caseId || !storeApi?.get) return [];
    try {
      const record = await storeApi.get(key(caseId), false);
      if (!record?.value) return [];
      const raw = JSON.parse(record.value);
      const versions = Array.isArray(raw) ? raw.map(v => normalizeVersion(v, caseId)).filter(Boolean) : [];
      versions.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      state.set(String(caseId), versions);
      return versions;
    } catch (_) {
      return [];
    }
  }

  function currentVersions(caseId = getCurrentCaseId()) {
    if (!caseId) return [];
    return state.get(String(caseId)) || [];
  }

  async function persist(caseId, versions) {
    if (!storeApi?.set) throw new Error('El almacenamiento de MindPlace no está disponible.');
    const payload = JSON.stringify(versions);
    await storeApi.set(key(caseId), payload, false);
    const confirmed = await storeApi.get(key(caseId), false);
    if (!confirmed?.value || confirmed.value !== payload) throw new Error('No se pudo confirmar el guardado de las versiones.');
    state.set(String(caseId), versions);
    try { onChange({ type: 'persisted', caseId: String(caseId), versions: versions.slice() }); } catch (_) {}
    return versions;
  }

  function nextNumber(versions) {
    return versions.reduce((max, item) => Math.max(max, Number(item.number) || 0), 0) + 1;
  }

  function fingerprintCase(caseModel) {
    const copy = clone(caseModel);
    if (!copy) return '';
    // updatedAt cambia en cada guardado; no debe crear una versión idéntica.
    delete copy.updatedAt;
    return stableStringify(copy);
  }

  function prune(versions) {
    const sorted = versions.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    if (sorted.length <= maxVersions) return sorted;
    const keep = sorted.slice(0, maxVersions);
    const protectedOlder = sorted.slice(maxVersions).filter(version => version.protected);
    return keep.concat(protectedOlder).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async function create({
    caseModel = getCase(), label = 'Versión manual', description = '', reason = 'manual',
    protectedVersion = false, source = 'manual', force = false
  } = {}) {
    if (!caseModel?.id) throw new Error('No hay un caso válido para versionar.');
    const caseId = String(caseModel.id);
    let versions = state.get(caseId);
    if (!versions) versions = await load(caseId);
    const fingerprint = fingerprintCase(caseModel);
    if (!force && fingerprint && versions.some(version => version.fingerprint === fingerprint)) {
      return { created: false, duplicate: true, version: versions.find(version => version.fingerprint === fingerprint) || null, versions };
    }
    const timestamp = now();
    const version = {
      schema: CASE_VERSION_SCHEMA,
      id: typeof uid === 'function' ? uid(caseId) : makeId(caseId, timestamp),
      caseId,
      number: nextNumber(versions),
      createdAt: timestamp,
      label: normalizeLabel(label, source === 'auto' ? 'Punto automático' : 'Versión manual'),
      description: String(description || '').trim().slice(0, 500),
      reason: String(reason || 'manual').slice(0, 80),
      protected: protectedVersion === true,
      source: source === 'auto' ? 'auto' : 'manual',
      fingerprint,
      case: clone(caseModel)
    };
    if (!version.case) throw new Error('No se pudo crear la instantánea del caso.');
    versions = prune([version, ...versions]);
    await persist(caseId, versions);
    return { created: true, duplicate: false, version, versions };
  }

  async function createManual(options = {}) {
    return create({ ...options, source: 'manual', reason: options.reason || 'manual', force: true });
  }

  async function maybeCreateAuto({ caseModel = getCase(), reason = 'autosave', force = false } = {}) {
    if (!caseModel?.id) return { created: false, skipped: 'no-case' };
    const caseId = String(caseModel.id);
    let versions = state.get(caseId);
    if (!versions) versions = await load(caseId);
    const fingerprint = fingerprintCase(caseModel);
    const latestAuto = versions.find(version => version.source === 'auto');
    const latestAny = versions[0];
    if (!force && latestAny?.fingerprint === fingerprint) return { created: false, skipped: 'same-state' };
    if (!force && latestAuto && now() - Number(latestAuto.createdAt) < autoIntervalMs) return { created: false, skipped: 'interval' };
    return create({
      caseModel,
      label: latestAny ? 'Punto automático' : 'Versión inicial',
      description: latestAny ? 'Punto de versión creado automáticamente tras un guardado.' : 'Primera versión persistente del caso.',
      reason,
      source: 'auto',
      protectedVersion: false,
      force: true
    });
  }

  async function get(id, caseId = getCurrentCaseId()) {
    const versions = await load(caseId);
    return versions.find(version => String(version.id) === String(id)) || null;
  }

  async function remove(id, caseId = getCurrentCaseId()) {
    if (!caseId || !id) return { deleted: false, reason: 'invalid' };
    let versions = state.get(String(caseId));
    if (!versions) versions = await load(caseId);
    const target = versions.find(version => String(version.id) === String(id));
    if (!target) return { deleted: false, reason: 'not-found' };
    if (target.protected) return { deleted: false, reason: 'protected', version: target };
    versions = versions.filter(version => String(version.id) !== String(id));
    await persist(String(caseId), versions);
    return { deleted: true, version: target, versions };
  }

  async function protect(id, value = true, caseId = getCurrentCaseId()) {
    if (!caseId || !id) return null;
    let versions = state.get(String(caseId));
    if (!versions) versions = await load(caseId);
    const target = versions.find(version => String(version.id) === String(id));
    if (!target) return null;
    target.protected = value === true;
    await persist(String(caseId), versions);
    return target;
  }

  async function restore(id, caseId = getCurrentCaseId()) {
    if (!caseId || !id) return { restored: false, reason: 'invalid' };
    const version = await get(id, caseId);
    if (!version) return { restored: false, reason: 'not-found' };
    const snapshot = clone(version.case);
    if (!snapshot) return { restored: false, reason: 'snapshot-invalid' };
    const saved = await saveBeforeRestore(snapshot, version);
    if (saved === false) return { restored: false, reason: 'save-before-restore-failed' };
    // Antes de reemplazar el estado actual dejamos un punto automático. Así,
    // restaurar una versión antigua nunca elimina silenciosamente el estado
    // desde el que se ejecutó la restauración.
    try { await maybeCreateAuto({ caseModel: getCase(), reason: 'before-restore', force: true }); } catch (_) {}
    const result = await setCase(snapshot, version);
    if (result === false) return { restored: false, reason: 'apply-failed' };
    try { afterRestore(snapshot, version); } catch (_) {}
    return { restored: true, version, case: snapshot };
  }

  return {
    load,
    list: currentVersions,
    create,
    createManual,
    maybeCreateAuto,
    get,
    remove,
    protect,
    restore,
    fingerprintCase,
    constants: { schema: CASE_VERSION_SCHEMA, maxVersions, autoIntervalMs }
  };
}
