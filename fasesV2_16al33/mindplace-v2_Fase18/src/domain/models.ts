export const CASE_STATUS = {
  ABIERTO: 'abierto',
  CURSO: 'curso',
  RESUELTO: 'resuelto'
} as const;
export type CaseStatus = typeof CASE_STATUS[keyof typeof CASE_STATUS];

export const NODE_STATUS = {
  NORMAL: 'normal',
  PENDING: 'pending',
  VALIDATED: 'validated',
  DISCARDED: 'discarded'
} as const;
export type NodeStatus = typeof NODE_STATUS[keyof typeof NODE_STATUS];

export const NODE_TYPE = {
  QUESTION: 'question', NOTE: 'note', HYPOTHESIS: 'hypothesis', EVIDENCE: 'evidence',
  DOCUMENT: 'document', PERSON: 'person', PHOTO: 'photo', CONCLUSION: 'conclusion', TAG: 'tag', CASE: 'case'
} as const;
export type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

export const EDGE_TYPE = {
  DEFAULT: 'default', SUPPORTS: 'supports', CONTRADICTS: 'contradicts', CAUSES: 'causes',
  REFERENCES: 'references', DEPENDS: 'depends', RELATED: 'related'
} as const;
export type EdgeType = typeof EDGE_TYPE[keyof typeof EDGE_TYPE];

export const EDGE_DIRECTION = { NONE: 'none', FORWARD: 'forward', REVERSE: 'reverse', BOTH: 'both' } as const;
export type EdgeDirection = typeof EDGE_DIRECTION[keyof typeof EDGE_DIRECTION];

export interface BoardMarker { x: number; y: number; width?: number; height?: number; }

export interface Attachment {
  id: string; sourceId: string; caseId: string; type: string; name: string; mimeType: string;
  url?: string; size: number; createdAt: number; updatedAt: number; sha256?: string; extension?: string;
}

export interface NodeModel {
  id: string; type: NodeType; text: string; x: number; y: number; width?: number; height?: number;
  favorite: boolean; status: NodeStatus; locked: boolean;
  questionResolution?: 'open' | 'answered' | 'inconclusive';
  conclusionConfidence?: 'low' | 'medium' | 'high'; category: string; tags: string[];
  author: string; dateText: string; conclusion?: unknown; attachments?: Attachment[];
  [key: string]: unknown;
}

export interface EdgeModel {
  id: string; a: string; b: string; type: EdgeType; kind: EdgeType; direction: EdgeDirection;
  label: string; [key: string]: unknown;
}

export interface HistoryEntry {
  id: string; caseId: string; action: string; timestamp: number; label: string; summary: string; payload: unknown;
}

export interface CaseModel {
  id: string; title: string; description: string; status: CaseStatus; category: string; marker: BoardMarker;
  nodes: NodeModel[]; edges: EdgeModel[]; history: HistoryEntry[]; activity: unknown[];
  settings: Record<string, unknown>; updatedAt: number; createdAt: number; demoVersion?: string;
  [key: string]: unknown;
}

export interface CaseIndexEntry {
  id: string; title: string; description: string; status: string; category: string;
  pinned: boolean; createdAt: number; updatedAt: number;
}

export interface PreferencesModel {
  theme: string; boardZoom: number; caseSort: string; caseCategoryFilter: string[];
  compactMode: boolean; reducedMotion: boolean;
}

export interface MindPlaceStore {
  index: CaseIndexEntry[]; cases: Record<string, CaseModel>; theme: string; caseSort: string;
  caseCategoryFilter: string[]; preferences: PreferencesModel; storageVersion: number; dataVersion: number;
}

export interface RecoveryState {
  kind: 'pre-migration' | 'last-good' | 'edit-session';
  createdAt: number;
  store: MindPlaceStore;
}

export interface SaveState {
  status: 'saved' | 'saving' | 'pending' | 'error';
  updatedAt: number | null;
  error?: string;
}
