import type { CaseModel, NodeModel, NodeType, NodeStatus } from '../domain/models';

export type SearchOperator = 'AND' | 'OR' | 'NOT';
export type SearchField = 'type' | 'status' | 'category' | 'tag' | 'date' | 'related';

export interface SearchTerm { field?: SearchField; value: string; negated: boolean; }
export interface SearchGroup { operator: SearchOperator; terms: SearchTerm[]; }
export interface AdvancedSearchQuery { raw: string; groups: SearchGroup[]; }

export interface SearchResult {
  id: string;
  kind: 'node' | 'edge' | 'case';
  title: string;
  text: string;
  type?: string;
  status?: string;
  category?: string;
  date?: number;
  score: number;
  highlights: string[];
}

const FIELD_ALIASES: Record<string, SearchField> = {
  type: 'type', tipo: 'type', status: 'status', estado: 'status', category: 'category', categoria: 'category',
  tag: 'tag', etiqueta: 'tag', date: 'date', fecha: 'date', related: 'related', relacion: 'related', relation: 'related'
};

function normalize(value: unknown): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"(?:\\.|[^"\\])*"|\(|\)|\S+/g;
  for (const match of input.matchAll(re)) out.push(match[0]);
  return out;
}

function stripQuotes(value: string): string { return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/\\"/g, '"') : value; }

function parseTerm(token: string): SearchTerm | null {
  if (!token) return null;
  let value = token;
  let negated = false;
  if (value.startsWith('-')) { negated = true; value = value.slice(1); }
  const colon = value.indexOf(':');
  if (colon > 0) {
    const key = normalize(value.slice(0, colon));
    const field = FIELD_ALIASES[key];
    if (field) return { field, value: stripQuotes(value.slice(colon + 1)), negated };
  }
  return { value: stripQuotes(value), negated };
}

export function parseAdvancedQuery(raw: string): AdvancedSearchQuery {
  const tokens = tokenize(raw.trim());
  const groups: SearchGroup[] = [];
  let current: SearchGroup = { operator: 'AND', terms: [] };
  let pendingOr = false;
  let negateNext = false;
  const flush = () => { if (current.terms.length) groups.push(current); current = { operator: 'AND', terms: [] }; };
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (upper === 'OR') { pendingOr = true; continue; }
    if (upper === 'AND') { pendingOr = false; flush(); continue; }
    if (upper === 'NOT') { negateNext = !negateNext; continue; }
    if (token === '(' || token === ')') continue;
    const term = parseTerm(token);
    if (!term) continue;
    const nextTerm = negateNext ? { ...term, negated: !term.negated } : term;
    if (pendingOr) {
      current.operator = 'OR';
    } else if (current.operator === 'OR' && current.terms.length) {
      flush();
    }
    current.terms.push(nextTerm);
    pendingOr = false;
    negateNext = false;
  }
  flush();
  return { raw, groups: groups.length ? groups : [{ operator: 'AND', terms: [] }] };
}

function nodeConnected(caseModel: CaseModel, nodeId: string, value: string): boolean {
  const needle = normalize(value);
  if (!needle) return true;
  const edges = caseModel.edges.filter(edge => edge.a === nodeId || edge.b === nodeId);
  return edges.some(edge => normalize(edge.type).includes(needle) || normalize(edge.kind).includes(needle) || normalize(edge.label).includes(needle));
}

function dateMatches(timestamp: number | undefined, value: string): boolean {
  if (!timestamp) return false;
  const normalized = value.trim();
  const match = normalized.match(/^(>=|<=|>|<|=)?(.+)$/);
  if (!match) return false;
  const op = match[1] || '=';
  const rawDate = match[2];
  const target = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? Date.parse(`${rawDate}T00:00:00`) : Date.parse(rawDate);
  if (!Number.isFinite(target)) return false;
  const left = timestamp;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? 86400000 : 1;
  if (op === '>') return left > target;
  if (op === '<') return left < target;
  if (op === '>=') return left >= target;
  if (op === '<=') return left <= target + day - 1;
  return Math.abs(left - target) < day;
}

function termMatches(caseModel: CaseModel, node: NodeModel, term: SearchTerm): boolean {
  const value = normalize(term.value);
  let result = false;
  switch (term.field) {
    case 'type': result = normalize(node.type as NodeType) === value || normalize(node.type as NodeType).includes(value); break;
    case 'status': result = normalize(node.status as NodeStatus) === value; break;
    case 'category': result = normalize(node.category) === value || normalize(node.category).includes(value); break;
    case 'tag': result = (node.tags || []).some(tag => normalize(tag).includes(value)); break;
    case 'date': result = dateMatches(Number(node.createdAt ?? node.updatedAt ?? 0), term.value); break;
    case 'related': result = nodeConnected(caseModel, node.id, term.value); break;
    default:
      result = [node.text, node.category, ...(node.tags || []), node.author, node.dateText, node.type, node.status]
        .some(item => normalize(item).includes(value));
  }
  return term.negated ? !result : result;
}

function nodeMatches(caseModel: CaseModel, node: NodeModel, query: AdvancedSearchQuery): boolean {
  if (!query.groups.length) return true;
  return query.groups.every(group => group.operator === 'OR' ? group.terms.some(term => termMatches(caseModel, node, term)) : group.terms.every(term => termMatches(caseModel, node, term)));
}

function scoreNode(node: NodeModel, raw: string): number {
  const needle = normalize(raw).replace(/\b(AND|OR|NOT)\b/g, ' ').trim();
  if (!needle) return 0;
  let score = 0;
  const text = normalize(node.text);
  for (const part of needle.split(/\s+/).filter(Boolean)) {
    if (text.includes(part)) score += text === part ? 10 : 4;
    if (normalize(node.category).includes(part)) score += 2;
    if ((node.tags || []).some(tag => normalize(tag).includes(part))) score += 2;
  }
  return score;
}

export function searchCase(caseModel: CaseModel, rawQuery: string): SearchResult[] {
  const query = parseAdvancedQuery(rawQuery);
  const results: SearchResult[] = [];
  for (const node of caseModel.nodes) {
    if (!nodeMatches(caseModel, node, query)) continue;
    const connectedCount = caseModel.edges.filter(edge => edge.a === node.id || edge.b === node.id).length;
    results.push({
      id: node.id, kind: 'node', title: node.text || node.type, text: node.text || '', type: String(node.type), status: String(node.status), category: node.category,
      date: Number(node.createdAt ?? node.updatedAt ?? 0), score: scoreNode(node, rawQuery) + connectedCount / 10,
      highlights: [node.category, ...(node.tags || [])].filter(Boolean)
    });
  }
  for (const edge of caseModel.edges) {
    const relatedText = `${edge.type} ${edge.kind} ${edge.label}`;
    const needle = normalize(rawQuery.replace(/\b(AND|OR|NOT)\b/g, ' '));
    if (needle && !normalize(relatedText).includes(needle) && !needle.split(/\s+/).every(part => normalize(relatedText).includes(part))) continue;
    results.push({ id: edge.id, kind: 'edge', title: edge.label || `${edge.type}: ${edge.a} → ${edge.b}`, text: relatedText, type: edge.type, score: 1, highlights: [edge.label].filter(Boolean) });
  }
  const caseText = `${caseModel.title} ${caseModel.description} ${caseModel.category}`;
  const plain = normalize(rawQuery).replace(/\b(AND|OR|NOT)\b/g, ' ').trim();
  if (plain && plain.split(/\s+/).every(part => normalize(caseText).includes(part))) results.push({ id: caseModel.id, kind: 'case', title: caseModel.title, text: caseModel.description, category: caseModel.category, date: caseModel.updatedAt, score: 3, highlights: [caseModel.category].filter(Boolean) });
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export interface SavedSearch { id: string; name: string; query: string; createdAt: number; updatedAt: number; }
export const SAVED_SEARCHES_KEY = 'mindplace-advanced-searches-v1';
export function readSavedSearches(): SavedSearch[] {
  try { const raw = localStorage.getItem(SAVED_SEARCHES_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
export function writeSavedSearches(searches: SavedSearch[]): void { localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches)); }
export function upsertSavedSearch(name: string, query: string): SavedSearch[] {
  const searches = readSavedSearches(); const now = Date.now(); const existing = searches.find(item => normalize(item.name) === normalize(name));
  if (existing) { existing.query = query; existing.updatedAt = now; } else searches.unshift({ id: `search-${now}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), query, createdAt: now, updatedAt: now });
  writeSavedSearches(searches.slice(0, 30)); return searches.slice(0, 30);
}
export function deleteSavedSearch(id: string): SavedSearch[] { const next = readSavedSearches().filter(item => item.id !== id); writeSavedSearches(next); return next; }
