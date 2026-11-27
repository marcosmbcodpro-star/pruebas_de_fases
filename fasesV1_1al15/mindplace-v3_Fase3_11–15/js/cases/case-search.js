export function searchNodeText(node) {
  const parts = [
    node?.text, node?.title, node?.qTitle, node?.priority, node?.category,
    node?.personName, node?.docTitle, node?.author, node?.caption, node?.dateText,
    node?.status, node?.noteTag, node?.location, node?.email, node?.phone, node?.url
  ];

  if (Array.isArray(node?.tags)) parts.push(node.tags.join(' '));
  if (node?.conclusion) parts.push(node.conclusion.text, node.conclusion.detail);

  return parts.filter(v => typeof v === 'string' && v.trim()).join(' ');
}

export function searchResultLabel(node) {
  if (node.id === '__case__') return node.caseTitle || 'Caso principal';
  const typeLabel = {
    note: 'Nota/Hipótesis',
    question: 'Pregunta',
    hypothesis: 'Hipótesis',
    conclusion: 'Conclusión',
    tag: 'Etiqueta',
    evidence: 'Evidencia',
    person: 'Persona',
    photo: 'Foto',
    document: 'Documento',
    case: 'Caso'
  }[node.type] || 'Tarjeta';

  return node.title || node.qTitle || node.docTitle || node.personName || node.text || typeLabel;
}

export function searchResultKind(node) {
  if (node.id === '__case__') return '📌';
  return {
    note: '📝',
    question: '❓',
    hypothesis: '💡',
    conclusion: '✅',
    tag: '🏷️',
    evidence: '📎',
    person: '👤',
    photo: '📷',
    document: '📄',
    case: '▣'
  }[node.type] || '•';
}
