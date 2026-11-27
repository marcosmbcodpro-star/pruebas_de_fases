export function createEmptyBoardState() {
  return {
    title: 'CASO SIN TÍTULO',
    description: '',
    status: 'abierto',
    category: '',
    marker: { x: 60, y: 100, width: 240, height: 140 },
    nodes: [],
    edges: [],
    history: []
  };
}

export function normalizeBoardState(value) {
  const base = createEmptyBoardState();
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    title: typeof source.title === 'string' ? source.title : base.title,
    description: typeof source.description === 'string' ? source.description : base.description,
    status: typeof source.status === 'string' ? source.status : base.status,
    category: typeof source.category === 'string' ? source.category : base.category,
    marker: source.marker && typeof source.marker === 'object' && !Array.isArray(source.marker)
      ? { ...base.marker, ...source.marker }
      : { ...base.marker },
    nodes: Array.isArray(source.nodes) ? source.nodes.filter(node => node && typeof node === 'object') : [],
    edges: Array.isArray(source.edges) ? source.edges.filter(edge => edge && typeof edge === 'object') : [],
    history: Array.isArray(source.history) ? source.history.filter(entry => entry && typeof entry === 'object') : []
  };
}

export function cloneBoardState(value) {
  return normalizeBoardState(value);
}

export function buildCaseIndexEntry(caseData = {}, fallbackId = '') {
  const id = caseData && typeof caseData.id === 'string' && caseData.id ? caseData.id : (fallbackId || 'case');
  return {
    id,
    title: typeof caseData.title === 'string' ? caseData.title : 'CASO SIN TÍTULO',
    description: typeof caseData.description === 'string' ? caseData.description : '',
    status: typeof caseData.status === 'string' ? caseData.status : 'abierto',
    category: typeof caseData.category === 'string' ? caseData.category : '',
    pinned: !!caseData.pinned,
    createdAt: Number.isFinite(Number(caseData.createdAt)) ? Number(caseData.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(caseData.updatedAt)) ? Number(caseData.updatedAt) : Date.now()
  };
}


export function normalizeStateForPersistence(caseState, { uid = (prefix='id') => prefix, isValidCase = () => true, currentCaseId = () => null } = {}) {
  if(!caseState || typeof caseState !== 'object') return caseState;
  if(typeof caseState.title !== 'string') caseState.title='CASO SIN TÍTULO';
  if(typeof caseState.description !== 'string') caseState.description='';
  if(typeof caseState.status !== 'string') caseState.status='abierto';
  if(typeof caseState.category !== 'string') caseState.category='';
  if(!Array.isArray(caseState.nodes)) caseState.nodes=[];
  caseState.nodes=caseState.nodes.map(node=>{
    const n=(node&&typeof node==='object')?{...node}:{};
    if(typeof n.id!=='string'||!n.id) n.id=uid('n');
    if(typeof n.type!=='string'||!n.type) n.type='note';
    if(typeof n.text!=='string') n.text=typeof n.title==='string'?n.title:'';
    if(!Number.isFinite(Number(n.x))) n.x=100; else n.x=Number(n.x);
    if(!Number.isFinite(Number(n.y))) n.y=100; else n.y=Number(n.y);
    if(!Number.isFinite(Number(n.width))) n.width=194; else n.width=Number(n.width);
    if(!Number.isFinite(Number(n.height))) n.height=120; else n.height=Number(n.height);
    if(typeof n.favorite!=='boolean') n.favorite=false;
    if(typeof n.locked!=='boolean') n.locked=false;
    if(typeof n.status!=='string') n.status='normal';
    if(!['normal','pending','validated','discarded'].includes(n.status)) n.status='normal';
    if(n.type==='question' && !['open','answered','inconclusive'].includes(n.questionResolution)) n.questionResolution='open';
    if(n.type==='conclusion' && !['low','medium','high'].includes(n.conclusionConfidence)) n.conclusionConfidence='medium';
    if(typeof n.category!=='string') n.category='';
    return n;
  });
  const nodeIds=new Set(caseState.nodes.map(n=>n.id));
  if(!Array.isArray(caseState.edges)) caseState.edges=[];
  caseState.edges=caseState.edges.map(edge=>{
    if(!edge||typeof edge!=='object') return null;
    const e={...edge};
    if(typeof e.a!=='string'||typeof e.b!=='string'||e.a===e.b) return null;
    const aOk=e.a==='__case__'||nodeIds.has(e.a); const bOk=e.b==='__case__'||nodeIds.has(e.b);
    if(!aOk||!bOk) return null;
    const validTypes=['default','supports','contradicts','causes','references','depends','related'];
    const validDirections=['none','forward','reverse','both'];
    e.type = validTypes.includes(e.type) ? e.type : (validTypes.includes(e.kind) ? e.kind : 'default');
    e.kind = e.type;
    e.direction = validDirections.includes(e.direction) ? e.direction : 'none';
    e.label = typeof e.label==='string' ? e.label.slice(0,120) : '';
    return e;
  }).filter(Boolean);
  const edgeSeen=new Set();
  caseState.edges=caseState.edges.filter(e=>{
    const unordered=e.direction==='none'||e.direction==='both';
    const a=unordered?[e.a,e.b].sort().join('|'):e.a+'|'+e.b;
    const key=a+'|'+e.type+'|'+e.direction+'|'+e.label;
    if(edgeSeen.has(key)) return false; edgeSeen.add(key); return true;
  });
  if(!Array.isArray(caseState.history)) caseState.history=[];
  const validation=isValidCase({id:currentCaseId()||'case',title:caseState.title,description:caseState.description,status:caseState.status,category:caseState.category,marker:caseState.marker,nodes:caseState.nodes,edges:caseState.edges,history:caseState.history,settings:caseState.settings,updatedAt:caseState.updatedAt,createdAt:caseState.createdAt,demoVersion:caseState.demoVersion});
  if(!validation.valid) caseState.__validationWarning=validation.errors;
  return caseState;
}
