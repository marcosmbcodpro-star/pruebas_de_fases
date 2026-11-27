import { SECURITY_LIMITS } from './security.js';

const MAX_LOGS = 80;
const listenerRegistry = [];
const listenerTargetIds = new WeakMap();
const listenerFnIds = new WeakMap();
let nextTargetId = 1;
let nextFnId = 1;
const originalAdd = EventTarget.prototype.addEventListener;
const originalRemove = EventTarget.prototype.removeEventListener;
const registryInstalled = !!window.__mindplaceListenerAuditInstalled;

function listenerTargetId(target){
  if(!listenerTargetIds.has(target)) listenerTargetIds.set(target, nextTargetId++);
  return listenerTargetIds.get(target);
}
function listenerFnId(listener){
  if((typeof listener==='function' || (listener && typeof listener==='object')) && !listenerFnIds.has(listener)) listenerFnIds.set(listener, nextFnId++);
  return listenerFnIds.get(listener) || 0;
}
if(!registryInstalled){
  window.__mindplaceListenerAuditInstalled = true;
  EventTarget.prototype.addEventListener = function(type, listener, options){
    try{
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      listenerRegistry.push({target:this,type:String(type),listener,capture,addedAt:Date.now(),targetId:listenerTargetId(this),fnId:listenerFnId(listener)});
    }catch(_){ }
    return originalAdd.call(this,type,listener,options);
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options){
    try{
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      const idx = listenerRegistry.findIndex(item => item.target===this && item.type===String(type) && item.listener===listener && item.capture===capture);
      if(idx >= 0) listenerRegistry.splice(idx,1);
    }catch(_){ }
    return originalRemove.call(this,type,listener,options);
  };
}


function pushLog(type, message, context={}){
  const entry = {type, message:String(message||''), context:context && typeof context==='object' ? context : {}, timestamp:Date.now()};
  window.__mindplaceDiagnosticLogs = Array.isArray(window.__mindplaceDiagnosticLogs) ? window.__mindplaceDiagnosticLogs : [];
  window.__mindplaceDiagnosticLogs.unshift(entry);
  if(window.__mindplaceDiagnosticLogs.length > MAX_LOGS) window.__mindplaceDiagnosticLogs.length = MAX_LOGS;
}

if(!window.__mindplaceDiagnosticListeners){
  window.__mindplaceDiagnosticListeners = true;
  window.addEventListener('error', event => {
    pushLog('error', event?.message || 'Error de JavaScript', {source:event?.filename || '', line:event?.lineno || 0, column:event?.colno || 0});
  });
  window.addEventListener('unhandledrejection', event => {
    pushLog('error', event?.reason?.message || String(event?.reason || 'Promesa rechazada'), {unhandledRejection:true});
  });
}

function now(){ return performance.now(); }

export function createDiagnostics({
  getStore = () => null,
  getState = () => null,
  getCurrentCaseId = () => null,
  getAttachmentRepository = () => null,
  getVersions = () => ({appVersion:'unknown', dataVersion:'unknown'}),
  getRecoveryInfo = () => null,
  getLastSave = () => null,
  getRenderStats = () => ({count:0,lastMs:0,lastAt:0,signatureRepeats:0}),
  getLabels = () => ({})
} = {}){
  const state = {lastScan:null, scanning:false};

  async function scan(){
    state.scanning = true;
    const started = now();
    const store = getStore() || {};
    const current = getState() || {};
    const cases = store.cases && typeof store.cases === 'object' ? Object.values(store.cases) : [];
    let nodeCount=0, edgeCount=0, historyCount=0, attachmentMetaCount=0;
    const invalidRefs=[];
    const invalidCases=[];
    const invalidEdges=[];
    const missingAttachments=[];
    const duplicateIds=[];
    const seenNodeIds=new Set();
    const seenEdgeIds=new Set();

    for(const c of cases){
      if(!c || typeof c!=='object') { invalidCases.push('Caso no válido'); continue; }
      if(!Array.isArray(c.nodes) || !Array.isArray(c.edges)) invalidCases.push(c.id || c.title || 'Caso sin ID');
      const nodes = Array.isArray(c.nodes) ? c.nodes : [];
      const edges = Array.isArray(c.edges) ? c.edges : [];
      nodeCount += nodes.length;
      edgeCount += edges.length;
      historyCount += Array.isArray(c.history) ? c.history.length : 0;
      const nodeIds=new Set();
      for(const n of nodes){
        if(!n?.id) continue;
        if(nodeIds.has(n.id)) duplicateIds.push(`Nodo duplicado ${c.id}:${n.id}`);
        nodeIds.add(n.id);
        seenNodeIds.add(n.id);
        if(Array.isArray(n.attachments)) attachmentMetaCount += n.attachments.length;
        if(Array.isArray(n.attachments)) for(const a of n.attachments){
          if(!a?.id) continue;
          const repo = getAttachmentRepository();
          if(repo?.get){
            try{ const record = await repo.get(a.id); if(!record?.blob) missingAttachments.push({caseId:c.id,nodeId:n.id,attachmentId:a.id,name:a.name||'Adjunto'}); }
            catch(_){ missingAttachments.push({caseId:c.id,nodeId:n.id,attachmentId:a.id,name:a.name||'Adjunto'}); }
          }
        }
      }
      for(const e of edges){
        if(!e?.id) continue;
        if(seenEdgeIds.has(e.id)) duplicateIds.push(`Conexión duplicada ${c.id}:${e.id}`);
        seenEdgeIds.add(e.id);
        if(!nodeIds.has(e.a) || !nodeIds.has(e.b)){
          invalidRefs.push({caseId:c.id,edgeId:e.id,a:e.a,b:e.b});
          invalidEdges.push(e.id);
        }
      }
    }

    const logEntries = Array.isArray(window.__mindplaceDiagnosticLogs) ? window.__mindplaceDiagnosticLogs.slice(0,MAX_LOGS) : [];
    const recentErrors = logEntries.filter(item=>item.type==='error' && Date.now()-item.timestamp < 30*60*1000);
    const renderStats = getRenderStats() || {};
    const renderAnomaly = Number(renderStats.lastMs||0) > 120 || Number(renderStats.signatureRepeats||0) > 18;

    const listenerMap=new Map();
    for(const item of listenerRegistry){
      if(!item || !item.target || !item.type || !item.listener) continue;
      const id = `${item.targetId}|${item.type}|${item.capture}|${item.fnId}`;
      const prior = listenerMap.get(id) || 0;
      listenerMap.set(id, prior + 1);
    }
    const duplicateListeners=[...listenerMap.entries()].filter(([,count])=>count>1).map(([signature,count])=>({signature,count}));

    const version = getVersions() || {};
    const lastSave = getLastSave() || {};
    const recovery = await getRecoveryInfo();
    const scan = {
      timestamp: Date.now(),
      durationMs: Math.round((now()-started)*100)/100,
      versions:{appVersion:version.appVersion||'unknown',dataVersion:version.dataVersion ?? store.dataVersion ?? 'unknown',storageVersion:version.storageVersion ?? store.storageVersion ?? 'unknown'},
      cases:cases.length,
      nodes:nodeCount,
      edges:edgeCount,
      attachments:attachmentMetaCount,
      history:historyCount,
      currentCaseId:getCurrentCaseId() || null,
      lastSave:{at:lastSave.at||null,ok:lastSave.ok!==false,pending:!!lastSave.pending},
      recovery:recovery || null,
      invalidCases,
      invalidEdges,
      brokenReferences:invalidRefs,
      missingAttachments,
      duplicateIds,
      recentErrors,
      duplicateListeners,
      renderStats,
      renderAnomaly,
      limits:SECURITY_LIMITS
    };
    state.lastScan=scan;
    state.scanning=false;
    return scan;
  }

  function getLastScan(){ return state.lastScan; }
  function getLogs(){ return Array.isArray(window.__mindplaceDiagnosticLogs) ? window.__mindplaceDiagnosticLogs.slice(0,MAX_LOGS) : []; }
  function clearLogs(){ window.__mindplaceDiagnosticLogs=[]; }
  function record(type,message,context){ pushLog(type,message,context); }
  return {scan,getLastScan,getLogs,clearLogs,record};
}
