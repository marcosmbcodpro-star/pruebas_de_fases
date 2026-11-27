export const FILTER_CONNECTION_MODES = Object.freeze({
  ANY: 'any',
  NONE: 'none',
  ONLY: 'only'
});

export function hasCaseFilters(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false, caseFilterLocked = false, caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY) {
  return caseFilterTypes.size > 0 || caseFilterStates.size > 0 || caseFilterFavorites || caseFilterLocked || caseFilterConnectionMode !== FILTER_CONNECTION_MODES.ANY;
}

export function caseFilterNodeMatches(
  node,
  caseFilterTypes = new Set(),
  caseFilterStates = new Set(),
  caseFilterFavorites = false,
  caseFilterLocked = false,
  caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY,
  connectedNodeIds = new Set()
) {
  if (!node || node.id === '__case__') return true;

  let typeMatch = true;
  if (caseFilterTypes.size > 0) {
    typeMatch = false;
    for (const selectedType of caseFilterTypes) {
      if (selectedType === 'conclusion') {
        if (!!node.conclusion || node.type === 'conclusion') { typeMatch = true; break; }
      } else if (node.type === selectedType) {
        typeMatch = true;
        break;
      }
    }
  }

  const nodeState = node.status || 'normal';
  const stateMatch = caseFilterStates.size === 0 || caseFilterStates.has(nodeState);
  const favoriteMatch = !caseFilterFavorites || node.favorite === true;
  const lockedMatch = !caseFilterLocked || node.locked === true;
  const isConnected = connectedNodeIds.has(node.id);
  const connectionMatch = caseFilterConnectionMode === FILTER_CONNECTION_MODES.ONLY
    ? isConnected
    : caseFilterConnectionMode === FILTER_CONNECTION_MODES.NONE
      ? !isConnected
      : true;

  return typeMatch && stateMatch && favoriteMatch && lockedMatch && connectionMatch;
}

export function getCaseFilterSummaryText(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false, caseFilterLocked = false, caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY) {
  if (!hasCaseFilters(caseFilterTypes, caseFilterStates, caseFilterFavorites, caseFilterLocked, caseFilterConnectionMode)) return 'Sin filtros activos';

  const typeLabels = {
    question: 'Preguntas', note: 'Nota/Hipótesis', hypothesis: 'Hipótesis', document: 'Documentos',
    person: 'Personas', photo: 'Fotos', conclusion: 'Conclusiones', evidence: 'Evidencias', tag: 'Etiquetas'
  };
  const stateLabels = { normal: 'Normal', pending: 'Pendiente', validated: 'Validado', discarded: 'Descartado' };
  const connectionLabels = { only: 'Con conexiones', none: 'Sin conexiones' };
  const parts = [];
  const selectedTypes = [...caseFilterTypes].map(v => typeLabels[v] || v);
  const selectedStates = [...caseFilterStates].map(v => stateLabels[v] || v);
  if (selectedTypes.length) parts.push(selectedTypes.join(', '));
  if (selectedStates.length) parts.push(selectedStates.join(', '));
  if (caseFilterFavorites) parts.push('⭐ Solo favoritas');
  if (caseFilterLocked) parts.push('🔒 Solo bloqueadas');
  if (connectionLabels[caseFilterConnectionMode]) parts.push(connectionLabels[caseFilterConnectionMode]);
  return parts.join(' · ');
}

export function getCaseFilterActiveCount(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false, caseFilterLocked = false, caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY) {
  return caseFilterTypes.size + caseFilterStates.size + (caseFilterFavorites ? 1 : 0) + (caseFilterLocked ? 1 : 0) + (caseFilterConnectionMode !== FILTER_CONNECTION_MODES.ANY ? 1 : 0);
}

export function serializeCaseFilters({ types = new Set(), states = new Set(), favorites = false, locked = false, connectionMode = FILTER_CONNECTION_MODES.ANY } = {}) {
  return {
    types: [...types].filter(Boolean),
    states: [...states].filter(Boolean),
    favorites: !!favorites,
    locked: !!locked,
    connectionMode: Object.values(FILTER_CONNECTION_MODES).includes(connectionMode) ? connectionMode : FILTER_CONNECTION_MODES.ANY
  };
}

export function deserializeCaseFilters(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    types: new Set(Array.isArray(raw.types) ? raw.types.filter(v => typeof v === 'string' && v.trim()) : []),
    states: new Set(Array.isArray(raw.states) ? raw.states.filter(v => typeof v === 'string' && v.trim()) : []),
    favorites: raw.favorites === true,
    locked: raw.locked === true,
    connectionMode: Object.values(FILTER_CONNECTION_MODES).includes(raw.connectionMode) ? raw.connectionMode : FILTER_CONNECTION_MODES.ANY
  };
}
