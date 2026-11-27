export const CASE_STATUS = Object.freeze({
  ABIERTO: 'abierto',
  PENDIENTE: 'pendiente',
  VALIDADO: 'validado',
  DESCARTADO: 'descartado'
});

export const NODE_STATUS = Object.freeze({
  NORMAL: 'normal',
  PENDING: 'pending',
  VALIDATED: 'validated',
  DISCARDED: 'discarded'
});

export const NODE_STATUS_META = Object.freeze({
  normal: { label: 'Normal', icon: '○' },
  pending: { label: 'Pendiente', icon: '⏳' },
  validated: { label: 'Validado', icon: '✓' },
  discarded: { label: 'Descartado', icon: '✕' }
});

export const QUESTION_RESOLUTION = Object.freeze({
  OPEN: 'open',
  ANSWERED: 'answered',
  INCONCLUSIVE: 'inconclusive'
});

export const CONCLUSION_CONFIDENCE = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
});

export const EDGE_TYPE = Object.freeze({
  DEFAULT: 'default',
  SUPPORTS: 'supports',
  CONTRADICTS: 'contradicts',
  CAUSES: 'causes',
  REFERENCES: 'references',
  DEPENDS: 'depends',
  RELATED: 'related'
});

export const EDGE_DIRECTION = Object.freeze({
  NONE: 'none',
  FORWARD: 'forward',
  REVERSE: 'reverse',
  BOTH: 'both'
});

export const EDGE_TYPE_META = Object.freeze({
  default: { label: 'Relación', icon: '↔' },
  supports: { label: 'Apoya', icon: '＋' },
  contradicts: { label: 'Contradice', icon: '≠' },
  causes: { label: 'Causa', icon: '→' },
  references: { label: 'Referencia', icon: '↗' },
  depends: { label: 'Depende de', icon: '⇢' },
  related: { label: 'Relacionada', icon: '∞' }
});

export const NODE_TYPE = Object.freeze({
  QUESTION: 'question',
  NOTE: 'note',
  HYPOTHESIS: 'hypothesis',
  EVIDENCE: 'evidence',
  DOCUMENT: 'document',
  PERSON: 'person',
  PHOTO: 'photo',
  CONCLUSION: 'conclusion',
  TAG: 'tag',
  CASE: 'case'
});

export const HISTORY_ACTION = Object.freeze({
  CREATE_CASE: 'create_case',
  UPDATE_CASE: 'update_case',
  DELETE_NODE: 'delete_node',
  ADD_NODE: 'add_node',
  LINK_EDGE: 'link_edge',
  UNLINK_EDGE: 'unlink_edge',
  IMPORT_CASE: 'import_case',
  RESTORE_STATE: 'restore_state'
});

export function createCase(overrides = {}) {
  return {
    id: overrides.id || 'c-case',
    title: overrides.title || 'CASO SIN TÍTULO',
    description: overrides.description || '',
    status: overrides.status || CASE_STATUS.ABIERTO,
    category: overrides.category || '',
    marker: overrides.marker || { x: 60, y: 100 },
    nodes: Array.isArray(overrides.nodes) ? overrides.nodes : [],
    edges: Array.isArray(overrides.edges) ? overrides.edges : [],
    history: Array.isArray(overrides.history) ? overrides.history : [],
    activity: Array.isArray(overrides.activity) ? overrides.activity : [],
    settings: overrides.settings || {},
    updatedAt: overrides.updatedAt || Date.now(),
    createdAt: overrides.createdAt || Date.now(),
    demoVersion: overrides.demoVersion || '',
    ...overrides
  };
}

export function createNode(overrides = {}) {
  const type = overrides.type || NODE_TYPE.NOTE;
  return {
    id: overrides.id || `n-${Math.random().toString(36).slice(2, 9)}`,
    type,
    text: overrides.text || '',
    x: Number.isFinite(overrides.x) ? overrides.x : 0,
    y: Number.isFinite(overrides.y) ? overrides.y : 0,
    width: Number.isFinite(overrides.width) ? overrides.width : undefined,
    height: Number.isFinite(overrides.height) ? overrides.height : undefined,
    favorite: !!overrides.favorite,
    status: Object.values(NODE_STATUS).includes(overrides.status) ? overrides.status : NODE_STATUS.NORMAL,
    locked: !!overrides.locked,
    questionResolution: overrides.questionResolution || (type === NODE_TYPE.QUESTION ? QUESTION_RESOLUTION.OPEN : undefined),
    conclusionConfidence: overrides.conclusionConfidence || (type === NODE_TYPE.CONCLUSION ? CONCLUSION_CONFIDENCE.MEDIUM : undefined),
    category: overrides.category || '',
    tags: Array.isArray(overrides.tags) ? overrides.tags : [],
    author: overrides.author || '',
    dateText: overrides.dateText || '',
    conclusion: overrides.conclusion || null,
    ...overrides
  };
}

export function createEdge(overrides = {}) {
  const type = Object.values(EDGE_TYPE).includes(overrides.type) ? overrides.type : (overrides.kind || EDGE_TYPE.DEFAULT);
  return {
    id: overrides.id || `e-${Math.random().toString(36).slice(2, 9)}`,
    a: overrides.a || '',
    b: overrides.b || '',
    type,
    kind: type,
    direction: Object.values(EDGE_DIRECTION).includes(overrides.direction) ? overrides.direction : EDGE_DIRECTION.NONE,
    label: typeof overrides.label === 'string' ? overrides.label : '',
    ...overrides,
    type,
    kind: type
  };
}

export function createAttachment(overrides = {}) {
  return {
    id: overrides.id || `a-${Math.random().toString(36).slice(2, 9)}`,
    sourceId: overrides.sourceId || '',
    type: overrides.type || 'file',
    name: overrides.name || 'Adjunto',
    mimeType: overrides.mimeType || 'application/octet-stream',
    url: overrides.url || '',
    size: Number.isFinite(overrides.size) ? overrides.size : 0,
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
    sha256: typeof overrides.sha256 === 'string' ? overrides.sha256 : '',
    extension: typeof overrides.extension === 'string' ? overrides.extension : '',
    caseId: overrides.caseId || '',
    ...overrides
  };
}

export function createHistory(overrides = {}) {
  return {
    id: overrides.id || `h-${Math.random().toString(36).slice(2, 9)}`,
    caseId: overrides.caseId || '',
    action: overrides.action || HISTORY_ACTION.UPDATE_CASE,
    timestamp: overrides.timestamp || Date.now(),
    label: overrides.label || 'Cambio',
    summary: overrides.summary || '',
    payload: overrides.payload || null,
    ...overrides
  };
}

export function createPreferences(overrides = {}) {
  return {
    theme: overrides.theme || 'allanwake2',
    boardZoom: Number.isFinite(overrides.boardZoom) ? overrides.boardZoom : 1,
    caseSort: overrides.caseSort || 'updated-desc',
    caseCategoryFilter: Array.isArray(overrides.caseCategoryFilter) ? overrides.caseCategoryFilter : [],
    compactMode: !!overrides.compactMode,
    reducedMotion: !!overrides.reducedMotion,
    ...overrides
  };
}

export const CaseModel = createCase;
export const NodeModel = createNode;
export const EdgeModel = createEdge;
export const AttachmentModel = createAttachment;
export const HistoryModel = createHistory;
export const PreferencesModel = createPreferences;

export const MODEL_DEFINITIONS = Object.freeze({
  Case: CaseModel,
  Node: NodeModel,
  Edge: EdgeModel,
  Attachment: AttachmentModel,
  History: HistoryModel,
  Preferences: PreferencesModel
});
