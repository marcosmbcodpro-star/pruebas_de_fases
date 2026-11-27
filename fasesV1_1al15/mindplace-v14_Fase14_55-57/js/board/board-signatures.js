export function getRenderSignature({
  state,
  currentCaseId,
  selectedCardId,
  caseFilterTypes,
  caseFilterStates,
  caseFilterFavorites,
  caseFilterLocked,
  caseFilterConnectionMode,
  hasCaseFilters
}) {
  const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
  const edges = Array.isArray(state?.edges) ? state.edges : [];
  const marker = state?.marker || null;

  const sampleNodes = nodes.slice(0, 220).map(node => (
    `${node.id}:${node.type}:${Math.round(node.x)}:${Math.round(node.y)}:${Math.round(node.width || 0)}:${Math.round(node.height || 0)}:${node.status || ''}:${node.favorite ? 1 : 0}:${node.locked ? 1 : 0}:${node.questionResolution || ''}:${node.conclusionConfidence || ''}`
  )).join('|');

  const sampleEdges = edges.slice(0, 180).map(edge => `${edge.a}->${edge.b}`).join('|');

  return [
    currentCaseId || 'none',
    selectedCardId || 'none',
    state?.title || '',
    nodes.length,
    edges.length,
    sampleNodes,
    sampleEdges,
    marker ? `${Math.round(marker.x)}:${Math.round(marker.y)}:${Math.round(marker.width || 0)}:${Math.round(marker.height || 0)}` : 'none',
    hasCaseFilters
      ? [...caseFilterTypes].join(',') + '|' + [...caseFilterStates].join(',') + '|' + (caseFilterFavorites ? '1' : '0') + '|' + (caseFilterLocked ? '1' : '0') + '|' + (caseFilterConnectionMode || 'any')
      : 'none'
  ].join('::');
}

export function getMiniMapSignature({
  state,
  currentCaseId,
  zoomWrap,
  boardEl,
  zoomLevel
}) {
  const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
  const boardW = zoomWrap?.offsetWidth || 0;
  const boardH = zoomWrap?.offsetHeight || 0;
  const scrollLeft = boardEl?.scrollLeft ?? 0;
  const scrollTop = boardEl?.scrollTop ?? 0;

  return [
    currentCaseId || 'none',
    nodes.length,
    boardW,
    boardH,
    Math.round(scrollLeft),
    Math.round(scrollTop),
    Math.round((zoomLevel || 1) * 100)
  ].join('::');
}
