export const NODE_STATES = {
  normal: { icon: '○', label: 'Normal' },
  pending: { icon: '◔', label: 'Pendiente' },
  validated: { icon: '✓', label: 'Validado' },
  discarded: { icon: '✕', label: 'Descartado' }
};

export function structureNodeIcon(node) {
  const icons = {
    question: '❓',
    note: '📝',
    document: '📄',
    person: '👤',
    photo: '📷',
    hypothesis: '📝',
    conclusion: '✅',
    tag: '🏷️',
    evidence: '📎',
    case: '▣'
  };
  return icons[node?.type] || '•';
}

export function structureNodeLabel(node, labelFor) {
  if (!node) return 'Elemento';
  if (node.type === 'question') return node.qTitle || node.text || 'Pregunta sin título';
  if (node.type === 'document') return node.docTitle || node.title || node.text || 'Documento';
  if (node.type === 'person') return node.personName || node.title || node.text || 'Persona';
  if (node.type === 'photo') return node.caption || node.text || node.title || 'Foto';
  if (node.type === 'tag') return node.text || node.title || 'Etiqueta';
  if (node.type === 'conclusion') return node.text || node.title || 'Conclusión';
  if (node.type === 'note' || node.type === 'hypothesis') return node.text || node.title || 'Nota/Hipótesis';
  if (node.type === 'evidence') return node.text || node.title || 'Evidencia';
  return node.title || node.text || labelFor(node.type) || 'Elemento';
}

export function structureNodeState(node) {
  const status = node?.status || 'normal';
  return (NODE_STATES[status] && NODE_STATES[status].icon) || '○';
}

export function sortStructureIds(ids, state) {
  return [...ids].sort((a, b) => {
    const na = state.nodes.find(n => n.id === a);
    const nb = state.nodes.find(n => n.id === b);
    if (!na || !nb) return 0;
    const dy = (Number(na.y) || 0) - (Number(nb.y) || 0);
    if (Math.abs(dy) > 1) return dy;
    return (Number(na.x) || 0) - (Number(nb.x) || 0);
  });
}

export function buildStructureChildrenMap(state) {
  const map = new Map([['__case__', []]]);
  state.nodes.forEach(node => map.set(node.id, []));
  state.edges.forEach(edge => {
    const a = edge.a;
    const b = edge.b;
    if (!map.has(a)) map.set(a, []);
    if (!map.has(b)) map.set(b, []);
    if (b !== '__case__') map.get(a).push(b);
    else if (a !== '__case__') map.get('__case__').push(a);
  });
  return map;
}
