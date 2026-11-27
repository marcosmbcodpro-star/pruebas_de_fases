import {
  CASE_STATUS,
  NODE_TYPE,
  HISTORY_ACTION,
  NODE_STATUS,
  QUESTION_RESOLUTION,
  CONCLUSION_CONFIDENCE,
  EDGE_TYPE,
  EDGE_DIRECTION
} from './models.js';

export function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCase(data) {
  const errors = [];
  if (!isObject(data)) {
    return { valid: false, errors: ['El caso debe ser un objeto válido.'], normalized: null };
  }

  const normalized = {
    id: typeof data.id === 'string' ? data.id : '',
    title: typeof data.title === 'string' ? data.title : 'CASO SIN TÍTULO',
    description: typeof data.description === 'string' ? data.description : '',
    status: Object.values(CASE_STATUS).includes(data.status) ? data.status : CASE_STATUS.ABIERTO,
    category: typeof data.category === 'string' ? data.category : '',
    marker: isObject(data.marker) ? data.marker : { x: 60, y: 100 },
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
    history: Array.isArray(data.history) ? data.history : [],
    settings: isObject(data.settings) ? data.settings : {},
    updatedAt: Number.isFinite(Number(data.updatedAt)) ? Number(data.updatedAt) : Date.now(),
    createdAt: Number.isFinite(Number(data.createdAt)) ? Number(data.createdAt) : Date.now(),
    demoVersion: typeof data.demoVersion === 'string' ? data.demoVersion : ''
  };

  if (!normalized.id) {
    errors.push('Falta el identificador del caso.');
  }

  if (!normalized.title.trim()) {
    errors.push('El caso requiere un título.');
  }

  if (!Array.isArray(normalized.nodes)) {
    errors.push('La colección de nodos no es válida.');
  }

  if (!Array.isArray(normalized.edges)) {
    errors.push('La colección de conexiones no es válida.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function validateNode(data) {
  if (!isObject(data)) {
    return { valid: false, errors: ['El nodo debe ser un objeto válido.'], normalized: null };
  }

  const validTypes = Object.values(NODE_TYPE);
  const errors = [];
  const normalized = {
    id: typeof data.id === 'string' ? data.id : `node-${Math.random().toString(36).slice(2, 8)}`,
    type: validTypes.includes(data.type) ? data.type : NODE_TYPE.NOTE,
    text: typeof data.text === 'string' ? data.text : '',
    x: Number.isFinite(Number(data.x)) ? Number(data.x) : 0,
    y: Number.isFinite(Number(data.y)) ? Number(data.y) : 0,
    width: Number.isFinite(Number(data.width)) ? Number(data.width) : undefined,
    height: Number.isFinite(Number(data.height)) ? Number(data.height) : undefined,
    favorite: !!data.favorite,
    status: Object.values(NODE_STATUS).includes(data.status) ? data.status : NODE_STATUS.NORMAL,
    locked: !!data.locked,
    questionResolution: Object.values(QUESTION_RESOLUTION).includes(data.questionResolution) ? data.questionResolution : (data.type === 'question' ? QUESTION_RESOLUTION.OPEN : undefined),
    conclusionConfidence: Object.values(CONCLUSION_CONFIDENCE).includes(data.conclusionConfidence) ? data.conclusionConfidence : (data.type === 'conclusion' ? CONCLUSION_CONFIDENCE.MEDIUM : undefined),
    category: typeof data.category === 'string' ? data.category : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    author: typeof data.author === 'string' ? data.author : '',
    dateText: typeof data.dateText === 'string' ? data.dateText : '',
    conclusion: isObject(data.conclusion) ? data.conclusion : null,
    attachments: Array.isArray(data.attachments) ? data.attachments.slice(0, MAX_ATTACHMENTS_PER_NODE).map(item => validateAttachment(item)).filter(result => result.valid).map(result => result.normalized) : []
  };

  if (!normalized.id) {
    errors.push('Falta el identificador del nodo.');
  }

  if (!normalized.type) {
    errors.push('Tipo de nodo no válido.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function validateEdge(data) {
  if (!isObject(data)) {
    return { valid: false, errors: ['La conexión debe ser un objeto válido.'], normalized: null };
  }

  const errors = [];
  const normalized = {
    id: typeof data.id === 'string' ? data.id : `edge-${Math.random().toString(36).slice(2, 8)}`,
    a: typeof data.a === 'string' ? data.a : '',
    b: typeof data.b === 'string' ? data.b : '',
    type: Object.values(EDGE_TYPE).includes(data.type) ? data.type : (Object.values(EDGE_TYPE).includes(data.kind) ? data.kind : EDGE_TYPE.DEFAULT),
    direction: Object.values(EDGE_DIRECTION).includes(data.direction) ? data.direction : EDGE_DIRECTION.NONE,
    label: typeof data.label === 'string' ? data.label.slice(0, 120) : '',
    kind: Object.values(EDGE_TYPE).includes(data.type) ? data.type : (Object.values(EDGE_TYPE).includes(data.kind) ? data.kind : EDGE_TYPE.DEFAULT)
  };

  if (!normalized.a || !normalized.b) {
    errors.push('Las conexiones requieren origen y destino válidos.');
  }

  if (normalized.a === normalized.b) {
    errors.push('No se puede conectar un nodo consigo mismo.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_NODE = 10;

export function validateAttachment(data) {
  if (!isObject(data)) {
    return { valid: false, errors: ['El adjunto debe ser un objeto válido.'], normalized: null };
  }

  const errors = [];
  const normalized = {
    id: typeof data.id === 'string' ? data.id : `attachment-${Math.random().toString(36).slice(2, 8)}`,
    sourceId: typeof data.sourceId === 'string' ? data.sourceId : '',
    type: typeof data.type === 'string' ? data.type : 'file',
    name: typeof data.name === 'string' ? data.name : 'Adjunto',
    mimeType: typeof data.mimeType === 'string' ? data.mimeType : 'application/octet-stream',
    url: typeof data.url === 'string' ? data.url : '',
    size: Number.isFinite(Number(data.size)) ? Number(data.size) : 0,
    createdAt: Number.isFinite(Number(data.createdAt)) ? Number(data.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(data.updatedAt)) ? Number(data.updatedAt) : Date.now(),
    sha256: typeof data.sha256 === 'string' ? data.sha256 : '',
    extension: typeof data.extension === 'string' ? data.extension.slice(0,15) : '',
    caseId: typeof data.caseId === 'string' ? data.caseId : ''
  };

  if (!normalized.sourceId) {
    errors.push('Falta la referencia al origen del adjunto.');
  }
  if (normalized.size < 0 || normalized.size > MAX_ATTACHMENT_SIZE) {
    errors.push('El tamaño del adjunto supera el límite permitido.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function validateHistory(data) {
  if (!isObject(data)) {
    return { valid: false, errors: ['El historial debe ser un objeto válido.'], normalized: null };
  }

  const validActions = Object.values(HISTORY_ACTION);
  const errors = [];
  const normalized = {
    id: typeof data.id === 'string' ? data.id : `history-${Math.random().toString(36).slice(2, 8)}`,
    caseId: typeof data.caseId === 'string' ? data.caseId : '',
    action: validActions.includes(data.action) ? data.action : HISTORY_ACTION.UPDATE_CASE,
    timestamp: Number.isFinite(Number(data.timestamp)) ? Number(data.timestamp) : Date.now(),
    label: typeof data.label === 'string' ? data.label : 'Cambio',
    summary: typeof data.summary === 'string' ? data.summary : '',
    payload: data.payload ?? null
  };

  if (!normalized.caseId) {
    errors.push('Falta el caso asociado al evento.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function validatePreferences(data) {
  if (!isObject(data)) {
    return { valid: false, errors: ['Las preferencias deben ser un objeto válido.'], normalized: null };
  }

  const errors = [];
  const normalized = {
    theme: typeof data.theme === 'string' ? data.theme : 'allanwake2',
    boardZoom: Number.isFinite(Number(data.boardZoom)) ? Number(data.boardZoom) : 1,
    caseSort: typeof data.caseSort === 'string' ? data.caseSort : 'updated-desc',
    caseCategoryFilter: Array.isArray(data.caseCategoryFilter) ? data.caseCategoryFilter.filter(v => typeof v === 'string') : [],
    compactMode: !!data.compactMode,
    reducedMotion: !!data.reducedMotion
  };

  if (normalized.boardZoom <= 0) {
    errors.push('El zoom debe ser mayor que cero.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function isValidCase(target) {
  return validateCase(target).valid;
}

export function isValidNode(target) {
  return validateNode(target).valid;
}

export function isValidEdge(target) {
  return validateEdge(target).valid;
}

export function isValidAttachment(target) {
  return validateAttachment(target).valid;
}

export function isValidHistory(target) {
  return validateHistory(target).valid;
}

export function isValidPreferences(target) {
  return validatePreferences(target).valid;
}
