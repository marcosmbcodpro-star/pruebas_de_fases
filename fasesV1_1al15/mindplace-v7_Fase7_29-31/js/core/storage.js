export function ensureStorageShim() {
  if (!window.storage) {
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
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('MindPlace no pudo clonar de forma segura un objeto para persistencia.', error);
    return null;
  }
}

export function safeJsonParse(raw, fallback = null, label = 'JSON') {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`MindPlace no pudo parsear ${label}.`, error);
    return fallback;
  }
}

export function normalizeCategoryFilter(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return [...new Set(raw.filter(v => typeof v === 'string' && v.trim() !== '').map(v => v.trim()))];
}

export function makeEmptyStore() {
  return {
    index: [],
    cases: {},
    theme: 'allanwake2',
    caseSort: 'updated-desc',
    caseCategoryFilter: [],
    storageVersion: 1,
    dataVersion: 2,
    demoDeleted: {}
  };
}

export function normalizeStoreForRuntime(target) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    return makeEmptyStore();
  }

  if (!Array.isArray(target.index)) target.index = [];
  if (!target.cases || typeof target.cases !== 'object' || Array.isArray(target.cases)) target.cases = {};
  target.theme = typeof target.theme === 'string' ? target.theme : 'allanwake2';
  target.caseSort = ['updated-desc', 'updated-asc', 'name-asc', 'name-desc', 'status'].includes(target.caseSort) ? target.caseSort : 'updated-desc';
  target.caseCategoryFilter = normalizeCategoryFilter(target.caseCategoryFilter);
  target.storageVersion = 1;
  target.dataVersion = 2;
  target.demoDeleted = target.demoDeleted && typeof target.demoDeleted === 'object' && !Array.isArray(target.demoDeleted)
    ? { ...target.demoDeleted }
    : {};
  return target;
}

export function validateStoreStructure(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  if (!Array.isArray(candidate.index)) return false;
  if (!candidate.cases || typeof candidate.cases !== 'object' || Array.isArray(candidate.cases)) return false;
  if (!Object.values(candidate.cases).every(v => v && typeof v === 'object')) {
    return false;
  }
  return true;
}
