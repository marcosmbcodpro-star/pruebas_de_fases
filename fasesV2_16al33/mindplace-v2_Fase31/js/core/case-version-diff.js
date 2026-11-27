/**
 * Fase 25 — comparación y restauración selectiva de versiones.
 *
 * El comparador trabaja únicamente con las instantáneas persistentes de Fase 24.
 * No modifica el historial ni Undo/Redo hasta que la aplicación decide aplicar
 * una selección de cambios.
 */

export const CASE_VERSION_DIFF_SCHEMA = 1;

function clone(value) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
}

function stable(value) {
  try {
    return JSON.stringify(value, (_, item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      return Object.keys(item).sort().reduce((acc, key) => {
        acc[key] = item[key];
        return acc;
      }, {});
    });
  } catch (_) {
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }
}

function same(a, b) { return stable(a) === stable(b); }

function mapById(items) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.id != null) map.set(String(item.id), item);
  }
  return map;
}

function normalizedNode(node) {
  if (!node || typeof node !== 'object') return null;
  const copy = clone(node);
  if (!copy) return null;
  delete copy.updatedAt;
  return copy;
}

function normalizedEdge(edge) {
  if (!edge || typeof edge !== 'object') return null;
  const copy = clone(edge);
  if (!copy) return null;
  return copy;
}

function normalizedAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  const copy = clone(attachment);
  if (!copy) return null;
  return copy;
}

function nodeDisplay(node) {
  if (!node) return 'Elemento';
  const text = String(node.text || node.title || node.docTitle || node.name || '').trim();
  const type = String(node.type || 'elemento');
  return text ? `${type}: ${text.slice(0, 80)}` : type;
}

function attachmentDisplay(attachment) {
  return String(attachment?.name || attachment?.fileName || attachment?.id || 'Adjunto').slice(0, 100);
}

function edgeDisplay(edge, nodes) {
  const byId = nodes instanceof Map ? nodes : mapById(nodes);
  const a = edge?.a === '__case__' ? 'Caso' : nodeDisplay(byId.get(String(edge?.a || '')));
  const b = edge?.b === '__case__' ? 'Caso' : nodeDisplay(byId.get(String(edge?.b || '')));
  const label = String(edge?.label || '').trim();
  return label ? `${a} → ${b} · ${label}` : `${a} → ${b}`;
}

function diffChangedFields(before, after, excluded = []) {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);
  for (const key of excluded) keys.delete(key);
  return [...keys].filter(key => !same(before?.[key], after?.[key])).sort();
}

function makeChange(kind, status, path, label, before, after, extra = {}) {
  return {
    id: `${kind}:${status}:${path}`,
    schema: CASE_VERSION_DIFF_SCHEMA,
    kind,
    status,
    path,
    label,
    before: clone(before),
    after: clone(after),
    ...extra
  };
}

function diffNodes(reference, comparison) {
  const result = [];
  const ref = mapById(reference?.nodes);
  const comp = mapById(comparison?.nodes);
  const ids = new Set([...ref.keys(), ...comp.keys()]);
  for (const id of [...ids].sort()) {
    const left = ref.get(id);
    const right = comp.get(id);
    if (left && !right) {
      result.push(makeChange('node', 'deleted', id, `Tarjeta eliminada · ${nodeDisplay(left)}`, left, null, { nodeId: id, changedFields: [] }));
      continue;
    }
    if (!left && right) {
      result.push(makeChange('node', 'added', id, `Tarjeta añadida · ${nodeDisplay(right)}`, null, right, { nodeId: id, changedFields: [] }));
      continue;
    }
    const changedFields = diffChangedFields(normalizedNode(left), normalizedNode(right), ['attachments', 'status', 'category']);
    const statusChanged = !same(left?.status ?? null, right?.status ?? null);
    const categoryChanged = !same(left?.category ?? null, right?.category ?? null);
    if (changedFields.length) {
      result.push(makeChange('node', 'modified', id, `Tarjeta modificada · ${nodeDisplay(right || left)}`, left, right, {
        nodeId: id, changedFields
      }));
    }
    if (statusChanged) {
      result.push(makeChange('node-meta', 'modified', `${id}/status`, `Tarjeta · estado · ${nodeDisplay(right || left)}`, left?.status ?? '', right?.status ?? '', { nodeId: id, field: 'status' }));
    }
    if (categoryChanged) {
      result.push(makeChange('node-meta', 'modified', `${id}/category`, `Tarjeta · categoría · ${nodeDisplay(right || left)}`, left?.category ?? '', right?.category ?? '', { nodeId: id, field: 'category' }));
    }
  }
  return result;
}

function diffEdges(reference, comparison, nodeSourceForLabels) {
  const result = [];
  const ref = mapById(reference?.edges);
  const comp = mapById(comparison?.edges);
  const ids = new Set([...ref.keys(), ...comp.keys()]);
  for (const id of [...ids].sort()) {
    const left = ref.get(id);
    const right = comp.get(id);
    if (left && !right) {
      result.push(makeChange('edge', 'deleted', id, `Conexión eliminada · ${edgeDisplay(left, nodeSourceForLabels)}`, left, null, { edgeId: id, changedFields: [] }));
      continue;
    }
    if (!left && right) {
      result.push(makeChange('edge', 'added', id, `Conexión añadida · ${edgeDisplay(right, nodeSourceForLabels)}`, null, right, { edgeId: id, changedFields: [] }));
      continue;
    }
    const changedFields = diffChangedFields(normalizedEdge(left), normalizedEdge(right), ['id']);
    if (changedFields.length) {
      result.push(makeChange('edge', 'modified', id, `Conexión modificada · ${edgeDisplay(right || left, nodeSourceForLabels)}`, left, right, { edgeId: id, changedFields }));
    }
  }
  return result;
}

function diffAttachments(reference, comparison) {
  const result = [];
  const refNodes = mapById(reference?.nodes);
  const compNodes = mapById(comparison?.nodes);
  const nodeIds = new Set([...refNodes.keys(), ...compNodes.keys()]);
  for (const nodeId of [...nodeIds].sort()) {
    const refAttachments = mapById(refNodes.get(nodeId)?.attachments);
    const compAttachments = mapById(compNodes.get(nodeId)?.attachments);
    const ids = new Set([...refAttachments.keys(), ...compAttachments.keys()]);
    for (const attachmentId of [...ids].sort()) {
      const left = refAttachments.get(attachmentId);
      const right = compAttachments.get(attachmentId);
      if (left && !right) {
        result.push(makeChange('attachment', 'deleted', `${nodeId}/${attachmentId}`, `Adjunto eliminado · ${attachmentDisplay(left)}`, left, null, { nodeId, attachmentId }));
        continue;
      }
      if (!left && right) {
        result.push(makeChange('attachment', 'added', `${nodeId}/${attachmentId}`, `Adjunto añadido · ${attachmentDisplay(right)}`, null, right, { nodeId, attachmentId }));
        continue;
      }
      const changedFields = diffChangedFields(normalizedAttachment(left), normalizedAttachment(right), ['updatedAt']);
      if (changedFields.length) {
        result.push(makeChange('attachment', 'modified', `${nodeId}/${attachmentId}`, `Adjunto modificado · ${attachmentDisplay(right || left)}`, left, right, { nodeId, attachmentId, changedFields }));
      }
    }
  }
  return result;
}

function diffCaseMeta(reference, comparison) {
  const result = [];
  for (const field of ['status', 'category']) {
    const before = reference?.[field] ?? '';
    const after = comparison?.[field] ?? '';
    if (!same(before, after)) {
      result.push(makeChange('case-meta', 'modified', field, `Caso · ${field === 'status' ? 'estado' : 'categoría'}`, before, after, { field }));
    }
  }
  return result;
}

export function compareCaseVersions(referenceVersion, comparisonVersion) {
  const reference = clone(referenceVersion?.case || referenceVersion) || {};
  const comparison = clone(comparisonVersion?.case || comparisonVersion) || {};
  const nodeSourceForLabels = mapById([...(Array.isArray(reference.nodes) ? reference.nodes : []), ...(Array.isArray(comparison.nodes) ? comparison.nodes : [])]);
  const changes = [
    ...diffCaseMeta(reference, comparison),
    ...diffNodes(reference, comparison),
    ...diffEdges(reference, comparison, nodeSourceForLabels),
    ...diffAttachments(reference, comparison)
  ];
  const summary = {
    total: changes.length,
    added: changes.filter(change => change.status === 'added').length,
    deleted: changes.filter(change => change.status === 'deleted').length,
    modified: changes.filter(change => change.status === 'modified').length,
    nodesAdded: changes.filter(change => change.kind === 'node' && change.status === 'added').length,
    nodesDeleted: changes.filter(change => change.kind === 'node' && change.status === 'deleted').length,
    nodesModified: changes.filter(change => change.kind === 'node' && change.status === 'modified').length,
    edgesAdded: changes.filter(change => change.kind === 'edge' && change.status === 'added').length,
    edgesDeleted: changes.filter(change => change.kind === 'edge' && change.status === 'deleted').length,
    edgesModified: changes.filter(change => change.kind === 'edge' && change.status === 'modified').length,
    categoryStatusChanges: changes.filter(change => change.kind === 'case-meta' || change.kind === 'node-meta').length,
    nodeStatusCategoryChanges: changes.filter(change => change.kind === 'node-meta').length,
    attachmentChanges: changes.filter(change => change.kind === 'attachment').length
  };
  return {
    schema: CASE_VERSION_DIFF_SCHEMA,
    reference: referenceVersion ? { id: String(referenceVersion.id || ''), number: referenceVersion.number ?? null, label: referenceVersion.label || '' } : null,
    comparison: comparisonVersion ? { id: String(comparisonVersion.id || ''), number: comparisonVersion.number ?? null, label: comparisonVersion.label || '' } : null,
    changes,
    summary,
    identical: changes.length === 0
  };
}

function locate(map, id) { return map.get(String(id)); }

function removeNodeFromCase(targetCase, nodeId) {
  targetCase.nodes = (Array.isArray(targetCase.nodes) ? targetCase.nodes : []).filter(node => String(node?.id) !== String(nodeId));
  targetCase.edges = (Array.isArray(targetCase.edges) ? targetCase.edges : []).filter(edge => String(edge?.a) !== String(nodeId) && String(edge?.b) !== String(nodeId));
}

function ensureArrays(targetCase) {
  if (!Array.isArray(targetCase.nodes)) targetCase.nodes = [];
  if (!Array.isArray(targetCase.edges)) targetCase.edges = [];
}

function selectedSet(changes, selection) {
  const wanted = selection instanceof Set ? selection : new Set(Array.isArray(selection) ? selection : []);
  return changes.filter(change => wanted.has(change.id));
}

/**
 * Aplica cambios seleccionados tomando como fuente `change.before`.
 * Esto permite usar la comparación como herramienta de restauración selectiva:
 * la versión de referencia es siempre el estado que se quiere recuperar.
 */
export async function applySelectedChanges(currentCase, diff, selection, {
  attachmentExists = async () => true,
  allowCaseMeta = true
} = {}) {
  const targetCase = clone(currentCase);
  if (!targetCase || typeof targetCase !== 'object') throw new Error('El caso actual no es válido.');
  ensureArrays(targetCase);
  const changes = selectedSet(diff?.changes || [], selection);
  const applied = [];
  const skipped = [];
  const nodeMap = () => mapById(targetCase.nodes);
  const edgeMap = () => mapById(targetCase.edges);

  // 1) Metadatos simples.
  for (const change of changes.filter(item => item.kind === 'case-meta')) {
    if (!allowCaseMeta) { skipped.push({ change, reason: 'case-meta-disabled' }); continue; }
    targetCase[change.field] = clone(change.before);
    applied.push(change);
  }

  // 2) Estado/categoría de tarjetas como cambios independientes.
  for (const change of changes.filter(item => item.kind === 'node-meta')) {
    const node = locate(nodeMap(), change.nodeId);
    if (!node) { skipped.push({ change, reason: 'node-not-found' }); continue; }
    node[change.field] = clone(change.before);
    applied.push(change);
  }

  // 3) Tarjetas. El cambio de una tarjeta no pisa sus adjuntos.
  for (const change of changes.filter(item => item.kind === 'node')) {
    const id = String(change.nodeId);
    const current = locate(nodeMap(), id);
    if (change.status === 'added') {
      // Apareció después de la referencia: volver a la referencia implica quitarla.
      if (!current) { skipped.push({ change, reason: 'node-not-found' }); continue; }
      removeNodeFromCase(targetCase, id);
      applied.push(change);
      continue;
    }
    if (change.status === 'deleted') {
      // Existía en la referencia y luego fue eliminada: recuperar la tarjeta.
      if (current) { skipped.push({ change, reason: 'node-already-exists' }); continue; }
      const restored = clone(change.before);
      if (!restored) { skipped.push({ change, reason: 'snapshot-invalid' }); continue; }
      // Los adjuntos tienen restauración independiente y solo se añaden si su binario sigue disponible.
      restored.attachments = [];
      targetCase.nodes.push(restored);
      applied.push(change);
      continue;
    }
    if (change.status === 'modified') {
      const restored = clone(change.before);
      if (!restored) { skipped.push({ change, reason: 'snapshot-invalid' }); continue; }
      const index = targetCase.nodes.findIndex(node => String(node?.id) === id);
      if (index < 0) {
        skipped.push({ change, reason: 'node-not-found' });
        continue;
      }
      const currentAttachments = Array.isArray(targetCase.nodes[index]?.attachments) ? targetCase.nodes[index].attachments : [];
      restored.attachments = currentAttachments;
      targetCase.nodes[index] = restored;
      applied.push(change);
    }
  }

  // 3) Adjuntos: solo se recuperan referencias cuyo archivo existe en el repositorio.
  for (const change of changes.filter(item => item.kind === 'attachment')) {
    const node = locate(nodeMap(), change.nodeId);
    if (!node) { skipped.push({ change, reason: 'node-not-found' }); continue; }
    const exists = change.before?.id ? await attachmentExists(String(change.before.id), change.before) : false;
    if ((change.status === 'added' || change.status === 'modified') && !exists) {
      skipped.push({ change, reason: 'attachment-binary-missing' });
      continue;
    }
    node.attachments = Array.isArray(node.attachments) ? node.attachments : [];
    const attachments = mapById(node.attachments);
    const attachmentId = String(change.attachmentId);
    if (change.status === 'added') {
      // El adjunto nació después de la referencia: para restaurarla, se retira la referencia.
      node.attachments = node.attachments.filter(item => String(item?.id) !== attachmentId);
      applied.push(change);
    } else if (change.status === 'deleted') {
      // El adjunto existía en la referencia y desapareció después.
      if (!exists) { skipped.push({ change, reason: 'attachment-binary-missing' }); continue; }
      if (!attachments.has(attachmentId)) node.attachments.push(clone(change.before));
      applied.push(change);
    } else {
      const index = node.attachments.findIndex(item => String(item?.id) === attachmentId);
      if (index < 0) node.attachments.push(clone(change.before));
      else node.attachments[index] = clone(change.before);
      applied.push(change);
    }
  }

  // 4) Conexiones después de las tarjetas: nunca dejamos endpoints rotos.
  for (const change of changes.filter(item => item.kind === 'edge')) {
    const edgeId = String(change.edgeId);
    const existing = locate(edgeMap(), edgeId);
    if (change.status === 'added') {
      // La conexión apareció después de la referencia: se elimina para volver a ella.
      if (!existing) { skipped.push({ change, reason: 'edge-not-found' }); continue; }
      targetCase.edges = targetCase.edges.filter(edge => String(edge?.id) !== edgeId);
      applied.push(change);
      continue;
    }
    const desired = clone(change.before);
    if (!desired) { skipped.push({ change, reason: 'snapshot-invalid' }); continue; }
    const endpointIds = [desired.a, desired.b].filter(id => id !== '__case__').map(String);
    const nodeIds = new Set(targetCase.nodes.map(node => String(node?.id)));
    if (endpointIds.some(id => !nodeIds.has(id))) {
      skipped.push({ change, reason: 'missing-endpoint' });
      continue;
    }
    if (change.status === 'deleted') {
      if (existing) skipped.push({ change, reason: 'edge-already-exists' });
      else { targetCase.edges.push(desired); applied.push(change); }
    } else {
      const index = targetCase.edges.findIndex(edge => String(edge?.id) === edgeId);
      if (index < 0) targetCase.edges.push(desired);
      else targetCase.edges[index] = desired;
      applied.push(change);
    }
  }

  targetCase.updatedAt = Date.now();
  return { case: targetCase, applied, skipped, changed: applied.length > 0 };
}
