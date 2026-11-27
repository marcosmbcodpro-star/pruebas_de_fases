const DRAFT_PREFIX = 'mindplace-edit-session-v1:';

export const SAVE_STATUSES = Object.freeze({
  SAVED: 'saved',
  SAVING: 'saving',
  PENDING: 'pending',
  ERROR: 'error'
});

function safeClone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
}

export function createSaveStateManager({
  getStore = () => null,
  getCurrentCaseId = () => null,
  readPersisted = async () => null,
  writePersisted = async () => false,
  validate = () => true,
  onStatus = () => {},
  debounceMs = 700,
  draftTtlMs = 1000 * 60 * 60 * 24
} = {}) {
  let timer = null;
  let inFlight = false;
  let pending = false;
  let status = SAVE_STATUSES.SAVED;
  let updatedAt = null;
  let lastError = '';
  let dirtySince = null;

  function emit(next, error = '') {
    status = next;
    lastError = error ? String(error) : '';
    try { onStatus({ status, updatedAt, error: lastError, dirtySince }); } catch (_) {}
  }

  function draftKey(caseId = getCurrentCaseId()) {
    return caseId ? `${DRAFT_PREFIX}${caseId}` : `${DRAFT_PREFIX}unknown`;
  }

  function writeEditDraft(reason = 'pending') {
    const caseId = getCurrentCaseId();
    const store = safeClone(getStore());
    if (!caseId || !store || !validate(store)) return false;
    try {
      sessionStorage.setItem(draftKey(caseId), JSON.stringify({
        kind: 'edit-session', version: 1, caseId: String(caseId), reason,
        createdAt: Date.now(), updatedAt: Date.now(), store
      }));
      return true;
    } catch (_) { return false; }
  }

  function readEditDraft(caseId = getCurrentCaseId()) {
    if (!caseId) return null;
    try {
      const raw = sessionStorage.getItem(draftKey(caseId));
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || draft.kind !== 'edit-session' || String(draft.caseId) !== String(caseId)) return null;
      if (!Number.isFinite(Number(draft.updatedAt)) || Date.now() - Number(draft.updatedAt) > draftTtlMs) {
        sessionStorage.removeItem(draftKey(caseId));
        return null;
      }
      return draft;
    } catch (_) { return null; }
  }

  function clearEditDraft(caseId = getCurrentCaseId()) {
    if (!caseId) return;
    try { sessionStorage.removeItem(draftKey(caseId)); } catch (_) {}
  }

  function markPending(reason = 'change') {
    if (!dirtySince) dirtySince = Date.now();
    writeEditDraft(reason);
    emit(SAVE_STATUSES.PENDING);
    clearTimeout(timer);
    timer = setTimeout(() => { void flush('debounced'); }, debounceMs);
  }

  async function verifyPersisted(expectedStore) {
    try {
      const persisted = await readPersisted();
      return Boolean(persisted && validate(persisted) && JSON.stringify(persisted) === JSON.stringify(expectedStore));
    } catch (_) { return false; }
  }

  async function flush(reason = 'manual') {
    clearTimeout(timer);
    timer = null;
    if (inFlight) { pending = true; emit(SAVE_STATUSES.PENDING); return false; }
    const snapshot = safeClone(getStore());
    if (!snapshot || !validate(snapshot)) {
      emit(SAVE_STATUSES.ERROR, 'El estado actual no supera la validación.');
      writeEditDraft(`validation:${reason}`);
      return false;
    }
    inFlight = true;
    pending = false;
    emit(SAVE_STATUSES.SAVING);
    try {
      const ok = await writePersisted(snapshot, { reason });
      if (!ok) throw new Error('No se pudo confirmar el guardado.');
      const confirmed = await verifyPersisted(snapshot);
      if (!confirmed) throw new Error('El guardado no pudo verificarse mediante lectura posterior.');
      updatedAt = Date.now(); dirtySince = null;
      clearEditDraft();
      emit(SAVE_STATUSES.SAVED);
      return true;
    } catch (error) {
      writeEditDraft(`error:${reason}`);
      emit(SAVE_STATUSES.ERROR, error?.message || 'Error de guardado');
      return false;
    } finally {
      inFlight = false;
      if (pending) { pending = false; void flush('queued'); }
    }
  }

  function getState() {
    return { status, updatedAt, error: lastError, dirtySince, pending: status === SAVE_STATUSES.PENDING || pending, draftAvailable: Boolean(readEditDraft()) };
  }

  return { markPending, flush, getState, writeEditDraft, readEditDraft, clearEditDraft };
}

export { DRAFT_PREFIX };
