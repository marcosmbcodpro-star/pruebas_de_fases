import type { CaseModel, EdgeModel, NodeModel } from '../domain/models';

export interface GraphFilters {
  relationTypes: string[];
  tags: string[];
  statuses: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  category: string;
  tags: string[];
  degree: number;
  connected: boolean;
  clusterId: number;
  x: number;
  y: number;
  radius: number;
}

export interface GraphEdge {
  id: string;
  a: string;
  b: string;
  type: string;
  label: string;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Array<{ id: number; nodeIds: string[] }>;
  hubs: string[];
  isolated: string[];
}

const labelForNode = (node: NodeModel): string => {
  const raw = String(node.text ?? '').trim();
  return raw || `${String(node.type || 'elemento')} · ${node.id}`;
};

function visibleNodes(caseModel: CaseModel, filters: GraphFilters): NodeModel[] {
  return caseModel.nodes.filter(node => {
    if (filters.statuses.length && !filters.statuses.includes(String(node.status || 'normal'))) return false;
    if (filters.tags.length && !filters.tags.every(tag => (node.tags || []).includes(tag))) return false;
    return true;
  });
}

function visibleEdges(caseModel: CaseModel, nodeIds: Set<string>, filters: GraphFilters): EdgeModel[] {
  return caseModel.edges.filter(edge => {
    if (!nodeIds.has(edge.a) || !nodeIds.has(edge.b)) return false;
    if (filters.relationTypes.length && !filters.relationTypes.includes(String(edge.type || edge.kind || 'default'))) return false;
    return true;
  });
}

function components(ids: string[], edges: GraphEdge[]): Map<string, number> {
  const adj = new Map<string, string[]>();
  ids.forEach(id => adj.set(id, []));
  edges.forEach(edge => {
    if (!adj.has(edge.a) || !adj.has(edge.b)) return;
    adj.get(edge.a)!.push(edge.b);
    adj.get(edge.b)!.push(edge.a);
  });
  const result = new Map<string, number>();
  let clusterId = 0;
  for (const id of ids) {
    if (result.has(id)) continue;
    const queue = [id]; result.set(id, clusterId);
    while (queue.length) {
      const current = queue.shift()!;
      for (const next of adj.get(current) || []) {
        if (!result.has(next)) { result.set(next, clusterId); queue.push(next); }
      }
    }
    clusterId += 1;
  }
  return result;
}

function layoutClusters(nodes: GraphNode[], clusterMap: Map<string, number>): void {
  const groups = new Map<number, GraphNode[]>();
  nodes.forEach(node => {
    const group = groups.get(node.clusterId) || [];
    group.push(node); groups.set(node.clusterId, group);
  });
  let column = 0;
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  ordered.forEach(([_, group], index) => {
    column = index % columns;
    const row = Math.floor(index / columns);
    const cx = 360 + column * 520;
    const cy = 300 + row * 420;
    const radius = group.length <= 1 ? 0 : Math.min(170, 70 + group.length * 14);
    group.forEach((node, i) => {
      const angle = group.length <= 1 ? 0 : (Math.PI * 2 * i) / group.length - Math.PI / 2;
      node.x = cx + Math.cos(angle) * radius;
      node.y = cy + Math.sin(angle) * radius;
    });
  });
  void clusterMap;
}

export function buildGraphModel(caseModel: CaseModel, filters: GraphFilters = { relationTypes: [], tags: [], statuses: [] }): GraphModel {
  const selected = visibleNodes(caseModel, filters);
  const ids = new Set(selected.map(node => node.id));
  const edges = visibleEdges(caseModel, ids, filters).map(edge => ({
    id: edge.id,
    a: edge.a,
    b: edge.b,
    type: String(edge.type || edge.kind || 'default'),
    label: String(edge.label || '')
  }));
  const degree = new Map<string, number>();
  selected.forEach(node => degree.set(node.id, 0));
  edges.forEach(edge => {
    degree.set(edge.a, (degree.get(edge.a) || 0) + 1);
    degree.set(edge.b, (degree.get(edge.b) || 0) + 1);
  });
  const clusterMap = components(selected.map(n => n.id), edges);
  const nodes = selected.map(node => ({
    id: node.id,
    label: labelForNode(node),
    type: String(node.type || 'note'),
    status: String(node.status || 'normal'),
    category: String(node.category || ''),
    tags: Array.isArray(node.tags) ? node.tags.map(String) : [],
    degree: degree.get(node.id) || 0,
    connected: (degree.get(node.id) || 0) > 0,
    clusterId: clusterMap.get(node.id) ?? 0,
    x: 0,
    y: 0,
    radius: Math.min(34, 20 + (degree.get(node.id) || 0) * 3)
  }));
  layoutClusters(nodes, clusterMap);
  const maxDegree = Math.max(0, ...nodes.map(n => n.degree));
  const hubThreshold = maxDegree >= 2 ? Math.max(2, Math.ceil(maxDegree * 0.75)) : Number.POSITIVE_INFINITY;
  const hubs = nodes.filter(node => node.degree >= hubThreshold && node.degree > 0).map(node => node.id);
  const isolated = nodes.filter(node => !node.connected).map(node => node.id);
  const clusterGroups = new Map<number, string[]>();
  nodes.forEach(node => {
    const group = clusterGroups.get(node.clusterId) || [];
    group.push(node.id); clusterGroups.set(node.clusterId, group);
  });
  return {
    nodes,
    edges,
    clusters: [...clusterGroups.entries()].map(([id, nodeIds]) => ({ id, nodeIds })),
    hubs,
    isolated
  };
}

export function collectBranch(caseModel: CaseModel, startId: string | null, depth = 2, relationTypes: string[] = []): string[] {
  if (!startId) return [];
  const seen = new Set([startId]);
  let frontier = [startId];
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      caseModel.edges.forEach(edge => {
        if (relationTypes.length && !relationTypes.includes(String(edge.type || edge.kind || 'default'))) return;
        if (edge.a === id && !seen.has(edge.b)) { seen.add(edge.b); next.push(edge.b); }
        if (edge.b === id && !seen.has(edge.a)) { seen.add(edge.a); next.push(edge.a); }
      });
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return [...seen];
}
