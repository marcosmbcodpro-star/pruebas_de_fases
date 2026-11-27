export function hasCaseFilters(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false) {
  return caseFilterTypes.size > 0 || caseFilterStates.size > 0 || caseFilterFavorites;
}

export function caseFilterNodeMatches(node, caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false) {
  if (!node || node.id === '__case__') return true;

  let typeMatch = true;
  if (caseFilterTypes.size > 0) {
    typeMatch = false;
    for (const selectedType of caseFilterTypes) {
      if (selectedType === 'conclusion') {
        if (!!node.conclusion) {
          typeMatch = true;
          break;
        }
      } else if (node.type === selectedType) {
        typeMatch = true;
        break;
      }
    }
  }

  const nodeState = node.status || 'normal';
  const stateMatch = caseFilterStates.size === 0 || caseFilterStates.has(nodeState);
  const favoriteMatch = !caseFilterFavorites || node.favorite === true;

  return typeMatch && stateMatch && favoriteMatch;
}

export function getCaseFilterSummaryText(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false) {
  if (!hasCaseFilters(caseFilterTypes, caseFilterStates, caseFilterFavorites)) {
    return 'Sin filtros activos';
  }

  const typeLabels = {
    question: 'Preguntas',
    note: 'Nota/Hipótesis',
    document: 'Documentos',
    person: 'Personas',
    photo: 'Fotos',
    conclusion: 'Conclusiones'
  };

  const stateLabels = {
    normal: 'Normal',
    pending: 'Pendiente',
    validated: 'Validado',
    discarded: 'Descartado'
  };

  const parts = [];
  const selectedTypes = [...caseFilterTypes].map(v => typeLabels[v] || v);
  const selectedStates = [...caseFilterStates].map(v => stateLabels[v] || v);

  if (selectedTypes.length) parts.push(selectedTypes.join(', '));
  if (selectedStates.length) parts.push(selectedStates.join(', '));
  if (caseFilterFavorites) parts.push('⭐ Solo favoritas');

  return parts.join(' · ');
}

export function getCaseFilterActiveCount(caseFilterTypes = new Set(), caseFilterStates = new Set(), caseFilterFavorites = false) {
  return caseFilterTypes.size + caseFilterStates.size + (caseFilterFavorites ? 1 : 0);
}
