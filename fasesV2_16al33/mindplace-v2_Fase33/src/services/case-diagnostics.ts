import type { Attachment, CaseModel, EdgeModel, NodeModel } from '../domain/models';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export type DiagnosticCode =
  | 'orphan-node' | 'conclusion-without-evidence' | 'evidence-without-context'
  | 'contradictory-relationship' | 'broken-reference' | 'duplicate-node'
  | 'duplicate-person' | 'orphan-attachment';

export interface DiagnosticIssue {
  id: string;
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
  attachmentIds: string[];
  focusId?: string;
}

export interface DiagnosticSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  byCode: Record<string, number>;
}

export interface CaseDiagnostics {
  caseId: string;
  checkedAt: number;
  issues: DiagnosticIssue[];
  summary: DiagnosticSummary;
}

const normalize = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const nodeLabel = (node?: NodeModel): string => normalize(node?.text) || String(node?.id ?? 'elemento');

const relationType = (edge: EdgeModel): string => String(edge.type || edge.kind || 'default');

const makeIssue = (caseId: string, index: number, input: Omit<DiagnosticIssue, 'id'>): DiagnosticIssue => ({
  ...input,
  id: `diag-${caseId}-${String(index).padStart(3, '0')}-${input.code}`
});

function relationAdjacency(caseModel: CaseModel): Map<string, EdgeModel[]> {
  const map = new Map<string, EdgeModel[]>();
  caseModel.nodes.forEach(node => map.set(node.id, []));
  caseModel.edges.forEach(edge => {
    if (!map.has(edge.a)) map.set(edge.a, []);
    if (!map.has(edge.b)) map.set(edge.b, []);
    map.get(edge.a)!.push(edge);
    map.get(edge.b)!.push(edge);
  });
  return map;
}

function attachmentEntries(caseModel: CaseModel): Attachment[] {
  const result: Attachment[] = [];
  for (const node of caseModel.nodes) if (Array.isArray(node.attachments)) result.push(...node.attachments);
  const extras = (caseModel as CaseModel & { attachments?: unknown }).attachments;
  if (Array.isArray(extras)) {
    for (const item of extras) if (item && typeof item === 'object') result.push(item as Attachment);
  }
  const seen = new Set<string>();
  return result.filter(item => {
    const key = String(item.id || `${item.sourceId}:${item.name}`);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function addBrokenReferences(caseModel: CaseModel, issues: Omit<DiagnosticIssue, 'id'>[]): void {
  const nodeIds = new Set(caseModel.nodes.map(node => node.id));
  caseModel.edges.forEach(edge => {
    if (!nodeIds.has(edge.a) || !nodeIds.has(edge.b)) {
      issues.push({
        code: 'broken-reference', severity: 'error', title: 'Conexión con referencia rota',
        message: `La conexión ${edge.id} apunta a una tarjeta que no existe.`,
        nodeIds: [edge.a, edge.b].filter(id => nodeIds.has(id)), edgeIds: [edge.id], attachmentIds: [], focusId: edge.id
      });
    }
  });

  attachmentEntries(caseModel).forEach(attachment => {
    if (!nodeIds.has(String(attachment.sourceId))) {
      issues.push({
        code: 'orphan-attachment', severity: 'warning', title: 'Archivo sin tarjeta asociada',
        message: `El archivo “${attachment.name || attachment.id}” referencia ${attachment.sourceId}, pero esa tarjeta no existe.`,
        nodeIds: [], edgeIds: [], attachmentIds: [attachment.id], focusId: attachment.id
      });
    }
  });
}

export function diagnoseCase(caseModel: CaseModel): CaseDiagnostics {
  const issues: Omit<DiagnosticIssue, 'id'>[] = [];
  const adjacency = relationAdjacency(caseModel);
  const nodeById = new Map(caseModel.nodes.map(node => [node.id, node]));
  const evidenceIds = new Set(caseModel.nodes.filter(node => node.type === 'evidence').map(node => node.id));
  const shouldHaveRelations = new Set(['question', 'hypothesis', 'evidence', 'document', 'person', 'photo', 'conclusion']);

  // 328–330: missing context / missing evidence.
  caseModel.nodes.forEach(node => {
    const edges = adjacency.get(node.id) || [];
    const externalNeighbours = edges.map(edge => edge.a === node.id ? edge.b : edge.a).filter(id => nodeById.has(id));
    if (shouldHaveRelations.has(node.type) && externalNeighbours.length === 0) {
      issues.push({
        code: 'orphan-node', severity: node.type === 'conclusion' || node.type === 'evidence' ? 'warning' : 'info',
        title: 'Tarjeta sin relaciones', message: `“${nodeLabel(node)}” no tiene relaciones con otras tarjetas.`,
        nodeIds: [node.id], edgeIds: [], attachmentIds: [], focusId: node.id
      });
    }
    if (node.type === 'conclusion' && !externalNeighbours.some(id => evidenceIds.has(id))) {
      issues.push({
        code: 'conclusion-without-evidence', severity: 'warning', title: 'Conclusión sin evidencia',
        message: `La conclusión “${nodeLabel(node)}” no está conectada directamente con ninguna evidencia.`,
        nodeIds: [node.id], edgeIds: edges.map(edge => edge.id), attachmentIds: [], focusId: node.id
      });
    }
    if (node.type === 'evidence' && !externalNeighbours.some(id => {
      const neighbour = nodeById.get(id);
      return neighbour && neighbour.type !== 'evidence';
    })) {
      issues.push({
        code: 'evidence-without-context', severity: 'warning', title: 'Evidencia sin contexto',
        message: `La evidencia “${nodeLabel(node)}” no está conectada con una tarjeta de contexto.`,
        nodeIds: [node.id], edgeIds: edges.map(edge => edge.id), attachmentIds: [], focusId: node.id
      });
    }
  });

  // 331: contradictory relationships.
  const pairRelations = new Map<string, Array<{ edge: EdgeModel; type: string }>>();
  caseModel.edges.forEach(edge => {
    if (!nodeById.has(edge.a) || !nodeById.has(edge.b)) return;
    const pair = [edge.a, edge.b].sort().join('::');
    const list = pairRelations.get(pair) || [];
    list.push({ edge, type: relationType(edge) }); pairRelations.set(pair, list);
  });
  pairRelations.forEach(list => {
    const hasSupport = list.some(item => item.type === 'supports');
    const hasContradict = list.some(item => item.type === 'contradicts');
    if (hasSupport && hasContradict) {
      const ids = [...new Set(list.flatMap(item => [item.edge.a, item.edge.b]))];
      issues.push({
        code: 'contradictory-relationship', severity: 'warning', title: 'Relaciones potencialmente contradictorias',
        message: `Entre “${nodeLabel(nodeById.get(ids[0]))}” y “${nodeLabel(nodeById.get(ids[1]))}” existen relaciones de apoyo y contradicción.`,
        nodeIds: ids, edgeIds: list.map(item => item.edge.id), attachmentIds: [], focusId: ids[0]
      });
    }
  });

  // 332 + 335: references and files.
  addBrokenReferences(caseModel, issues);

  // 333: duplicate cards.
  const duplicateBuckets = new Map<string, NodeModel[]>();
  caseModel.nodes.filter(node => node.type !== 'person').forEach(node => {
    const key = `${node.type}|${normalize(node.text)}|${normalize(node.category)}`;
    if (!normalize(node.text)) return;
    const bucket = duplicateBuckets.get(key) || []; bucket.push(node); duplicateBuckets.set(key, bucket);
  });
  duplicateBuckets.forEach(nodes => {
    if (nodes.length < 2) return;
    issues.push({
      code: 'duplicate-node', severity: 'info', title: 'Posibles tarjetas duplicadas',
      message: `Se han encontrado ${nodes.length} tarjetas con el mismo tipo, texto y categoría.`,
      nodeIds: nodes.map(node => node.id), edgeIds: [], attachmentIds: [], focusId: nodes[0].id
    });
  });

  // 334: duplicate people.
  const people = new Map<string, NodeModel[]>();
  caseModel.nodes.filter(node => node.type === 'person' && normalize(node.text)).forEach(node => {
    const key = normalize(node.text); const bucket = people.get(key) || []; bucket.push(node); people.set(key, bucket);
  });
  people.forEach(nodes => {
    if (nodes.length < 2) return;
    issues.push({
      code: 'duplicate-person', severity: 'warning', title: 'Posibles personas duplicadas',
      message: `La persona “${nodeLabel(nodes[0])}” aparece ${nodes.length} veces.`,
      nodeIds: nodes.map(node => node.id), edgeIds: [], attachmentIds: [], focusId: nodes[0].id
    });
  });

  const summary: DiagnosticSummary = { total: issues.length, errors: 0, warnings: 0, infos: 0, byCode: {} };
  const finalIssues = issues.map((issue, index) => {
    summary.byCode[issue.code] = (summary.byCode[issue.code] || 0) + 1;
    if (issue.severity === 'error') summary.errors += 1;
    if (issue.severity === 'warning') summary.warnings += 1;
    if (issue.severity === 'info') summary.infos += 1;
    return makeIssue(caseModel.id, index + 1, issue);
  });
  return { caseId: caseModel.id, checkedAt: Date.now(), issues: finalIssues, summary };
}

export function summarizeDiagnostics(diagnostics: CaseDiagnostics[]): DiagnosticSummary {
  const summary: DiagnosticSummary = { total: 0, errors: 0, warnings: 0, infos: 0, byCode: {} };
  diagnostics.forEach(item => {
    summary.total += item.summary.total; summary.errors += item.summary.errors;
    summary.warnings += item.summary.warnings; summary.infos += item.summary.infos;
    Object.entries(item.summary.byCode).forEach(([key, count]) => { summary.byCode[key] = (summary.byCode[key] || 0) + count; });
  });
  return summary;
}
