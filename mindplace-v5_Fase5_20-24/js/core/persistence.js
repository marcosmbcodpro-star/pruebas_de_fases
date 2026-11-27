import { deepCloneData, safeJsonParse, normalizeCategoryFilter, makeEmptyStore, normalizeStoreForRuntime, validateStoreStructure } from './storage.js';
import { normalizeStateForPersistence } from './state.js';

export function createPersistenceManager({
  storeKey, storageVersion, dataVersion, recoveryKey, lastGoodKey,
  getStore, setStore, getCurrentCaseId, getState,
  getUid, isValidCase,
  showRecoveryNotice, showSaveWarning, applyTheme, renderMenu, openCase,
  removedThemes = [],
  scheduleSave
}) {
  const normalizeNodeForMigration = (node) => {
    const n = (node && typeof node === 'object') ? {...node} : {};
    if(typeof n.id !== 'string' || !n.id) n.id = getUid('n');
    if(typeof n.type !== 'string' || !n.type) n.type = 'note';
    if(typeof n.text !== 'string') n.text = typeof n.title === 'string' ? n.title : '';
    if(!Number.isFinite(Number(n.x))) n.x = 100; else n.x = Number(n.x);
    if(!Number.isFinite(Number(n.y))) n.y = 100; else n.y = Number(n.y);
    if(!Number.isFinite(Number(n.width))) n.width = 194; else n.width = Number(n.width);
    if(!Number.isFinite(Number(n.height))) n.height = 120; else n.height = Number(n.height);
    if(typeof n.favorite !== 'boolean') n.favorite = false;
    if(typeof n.category !== 'string') n.category = '';
    if(typeof n.status !== 'string') n.status = '';
    return n;
  };

  const normalizeEdgeForMigration = (edge, nodeIds) => {
    if(!edge || typeof edge !== 'object') return null;
    const e = {...edge};
    if(typeof e.a !== 'string' || typeof e.b !== 'string') return null;
    if(!nodeIds.has(e.a) || !nodeIds.has(e.b) || e.a === e.b) return null;
    return e;
  };

  const normalizeCaseForMigration = (id, rawCase, indexEntry) => {
    const c = (rawCase && typeof rawCase === 'object') ? deepCloneData(rawCase) || {} : {};
    c.title = typeof c.title === 'string' ? c.title : (indexEntry?.title || 'CASO SIN TÍTULO');
    c.description = typeof c.description === 'string' ? c.description : (indexEntry?.description || '');
    c.status = typeof c.status === 'string' ? c.status : (indexEntry?.status || 'abierto');
    c.category = typeof c.category === 'string' ? c.category : (indexEntry?.category || '');
    c.nodes = Array.isArray(c.nodes) ? c.nodes.map(normalizeNodeForMigration) : [];
    const nodeIds = new Set(c.nodes.map(n=>n.id));
    c.edges = Array.isArray(c.edges) ? c.edges.map(e=>normalizeEdgeForMigration(e,nodeIds)).filter(Boolean) : [];
    c.history = Array.isArray(c.history) ? c.history : [];
    if(!c.history.length){
      c.history = [{ id:getUid('h'), title:'Estado inicial', createdAt:Date.now(), snapshot:{ title:c.title, description:c.description, status:c.status, category:c.category, nodes:JSON.parse(JSON.stringify(c.nodes)), edges:JSON.parse(JSON.stringify(c.edges)) } }];
    }
    c.id = id;
    return c;
  };

  const migrateStore = (raw) => {
    const source = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? deepCloneData(raw) || {} : {};
    const migrated = makeEmptyStore();
    const sourceIndex = Array.isArray(source.index) ? source.index : [];
    const sourceCases = (source.cases && typeof source.cases === 'object' && !Array.isArray(source.cases)) ? source.cases : {};
    migrated.theme = typeof source.theme === 'string' ? source.theme : 'allanwake2';
    migrated.caseSort = ['updated-desc','updated-asc','name-asc','name-desc','status'].includes(source.caseSort) ? source.caseSort : 'updated-desc';
    migrated.caseCategoryFilter = normalizeCategoryFilter(source.caseCategoryFilter);
    migrated.storageVersion = storageVersion;
    const seen = new Set();
    for(const rawEntry of sourceIndex){
      if(!rawEntry || typeof rawEntry !== 'object' || typeof rawEntry.id !== 'string' || seen.has(rawEntry.id)) continue;
      const id = rawEntry.id; seen.add(id);
      const entry = {...rawEntry};
      entry.title = typeof entry.title === 'string' ? entry.title : 'CASO SIN TÍTULO';
      entry.description = typeof entry.description === 'string' ? entry.description : '';
      entry.status = typeof entry.status === 'string' ? entry.status : 'abierto';
      entry.category = typeof entry.category === 'string' ? entry.category : '';
      entry.pinned = !!entry.pinned;
      entry.updatedAt = Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : Date.now();
      if(entry.createdAt == null) entry.createdAt = entry.updatedAt;
      migrated.index.push(entry);
      migrated.cases[id] = normalizeCaseForMigration(id, sourceCases[id], entry);
    }
    for(const [id, rawCase] of Object.entries(sourceCases)){
      if(seen.has(id)) continue;
      const c = normalizeCaseForMigration(id, rawCase, null);
      migrated.cases[id] = c;
      migrated.index.push({id,title:c.title,description:c.description,status:c.status,category:c.category,pinned:false,createdAt:Date.now(),updatedAt:Date.now()});
      seen.add(id);
    }
    migrated.demoDeleted = source.demoDeleted && typeof source.demoDeleted === 'object' ? {...source.demoDeleted} : {};
    migrated.dataVersion = dataVersion;
    return migrated;
  };

  const savePreMigrationRecovery = async (rawStore) => {
    try { const payload = deepCloneData(rawStore) || rawStore; await window.storage.set(recoveryKey, JSON.stringify({recoveryType:'mindplace-pre-migration',createdAt:Date.now(),store:payload}), false); return true; }
    catch(e){ console.warn('No se pudo crear la recuperación previa a la migración', e); return false; }
  };
  const loadRecoveryStore = async () => {
    try { const res=await window.storage.get(recoveryKey,false); if(!res||!res.value) return null; const raw=safeJsonParse(res.value,null,'recuperación previa'); return raw&&raw.store?raw.store:null; }
    catch(e){ console.warn('No se pudo leer la recuperación previa',e); return null; }
  };
  const loadLastGoodStore = async () => {
    try { const res=await window.storage.get(lastGoodKey,false); if(!res||!res.value) return null; const raw=safeJsonParse(res.value,null,'último estado válido'); return raw&&raw.store?raw.store:null; }
    catch(e){ console.warn('No se pudo leer el último estado válido',e); return null; }
  };
  const saveLastGoodStore = async (validStore) => {
    try { if(!validStore||!validateStoreStructure(validStore)) return false; await window.storage.set(lastGoodKey,JSON.stringify({recoveryType:'mindplace-last-good',createdAt:Date.now(),store:validStore}),false); return true; }
    catch(e){ console.warn('No se pudo guardar el último estado válido',e); return false; }
  };
  const clearPreMigrationRecovery = async () => { try{ await window.storage.set(recoveryKey,'',false); }catch(e){} };

  const load = async () => {
    let parsed=null, parsedOk=true;
    try{ const res=await window.storage.get(storeKey,false); if(res&&res.value){ try{ parsed=JSON.parse(res.value); }catch(e){ parsedOk=false; } } }catch(e){ parsedOk=false; }
    const lastGood=await loadLastGoodStore();
    if(parsedOk&&parsed&&validateStoreStructure(parsed)){
      setStore(parsed);
      if(lastGood && validateStoreStructure(lastGood)===false) await saveLastGoodStore(getStore());
    }else if(parsed&&!validateStoreStructure(parsed)){
      const looksLikeOldStore=Array.isArray(parsed.index)&&parsed.cases&&typeof parsed.cases==='object'&&!Array.isArray(parsed.cases);
      if(lastGood&&validateStoreStructure(lastGood)){ setStore(lastGood); showRecoveryNotice('⚠ Se recuperó la última versión válida de MindPlace.'); }
      else if(looksLikeOldStore){
        await savePreMigrationRecovery(parsed);
        try{ const migrated=migrateStore(parsed); if(!validateStoreStructure(migrated)) throw new Error('La migración produjo una estructura inválida.'); setStore(migrated); const saved=await saveStore(); if(saved) await clearPreMigrationRecovery(); }
        catch(e){ console.error('Migración de datos fallida. Se intentará recuperar el último estado válido.',e); const recovery=await loadRecoveryStore(); const fallback=recovery?migrateStore(recovery):lastGood; if(fallback&&validateStoreStructure(fallback)){ setStore(fallback); showRecoveryNotice('⚠ Se recuperó la última versión válida de MindPlace.'); } else { setStore(makeEmptyStore()); showRecoveryNotice('⚠ No se pudo recuperar el último estado válido.'); } }
      }else{
        const recovery=await loadRecoveryStore();
        if(recovery){ const fallback=migrateStore(recovery); if(validateStoreStructure(fallback)){ setStore(fallback); showRecoveryNotice('⚠ Se recuperó una copia interna de MindPlace.'); } else { setStore(makeEmptyStore()); showRecoveryNotice('⚠ No se pudo recuperar el último estado válido.'); } }
        else { setStore(makeEmptyStore()); showRecoveryNotice('⚠ No se pudo recuperar el último estado válido.'); }
      }
    }else if(!parsedOk||!parsed){
      if(lastGood&&validateStoreStructure(lastGood)){ setStore(lastGood); showRecoveryNotice('⚠ Se recuperó la última versión válida de MindPlace.'); }
      else { const recovery=await loadRecoveryStore(); if(recovery){ const fallback=migrateStore(recovery); setStore(validateStoreStructure(fallback)?fallback:makeEmptyStore()); if(validateStoreStructure(getStore())) showRecoveryNotice('⚠ Se recuperó una copia interna de MindPlace.'); } else setStore(makeEmptyStore()); }
    }
    normalizeStoreForRuntime(getStore());
    if(validateStoreStructure(getStore())) await saveLastGoodStore(getStore());
    const theme=getStore().theme||'allanwake2';
    applyTheme(removedThemes.includes(theme)?'allanwake2':theme,false);
    renderMenu();
    const params=new URLSearchParams(window.location.search);
    const requestedCaseId=params.get('case');
    if(requestedCaseId&&getStore().cases[requestedCaseId]) openCase(requestedCaseId);
  };

  let saveInFlight=false;
  let savePendingAfter=false;
  const normalizeStateForSave = (caseState) => {
    const normalized = normalizeStateForPersistence(caseState, { uid:getUid, isValidCase, currentCaseId:getCurrentCaseId });
    if(normalized && normalized.__validationWarning){ console.warn('MindPlace: el estado del caso no supera la validación de modelo:', normalized.__validationWarning); delete normalized.__validationWarning; }
    return normalized;
  };
  const saveStore = async () => {
    let snapshot;
    try{ snapshot=deepCloneData(getStore()); if(snapshot===null) throw new Error('deepCloneData devolvió null'); }catch(e){ console.error('Guardado rechazado: no se pudo crear una copia del estado.',e); showSaveWarning(); return false; }
    normalizeStoreForRuntime(snapshot); snapshot.storageVersion=storageVersion; snapshot.dataVersion=dataVersion;
    if(!validateStoreStructure(snapshot)){ console.error('Guardado rechazado: la estructura de MindPlace no es válida.'); showSaveWarning(); return false; }
    let payload,roundTrip;
    try{ payload=JSON.stringify(snapshot); roundTrip=safeJsonParse(payload,null,'estado serializado'); if(!roundTrip||!validateStoreStructure(roundTrip)){ console.error('Guardado rechazado: los datos serializados no superan la validación.'); showSaveWarning(); return false; } }catch(e){ console.error('Guardado rechazado: no se pudo serializar el estado.',e); showSaveWarning(); return false; }
    const MAX_ATTEMPTS=4;
    for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
      try{ await window.storage.set(storeKey,payload,false); await saveLastGoodStore(roundTrip); return true; }
      catch(e){ if(attempt<MAX_ATTEMPTS-1){ console.warn('guardado no confirmado, reintentando ('+(attempt+1)+'/'+MAX_ATTEMPTS+')'); await new Promise(r=>setTimeout(r,400*(attempt+1))); } else { console.error('No se pudo guardar tras varios intentos',e); showSaveWarning(); setTimeout(()=>scheduleSave?.(),3000); return false; } }
    }
    return false;
  };
  const save = async () => {
    const id=getCurrentCaseId(); if(!id) return;
    const currentStore=getStore(); const currentState=getState();
    currentStore.cases[id]=currentState;
    const entry=currentStore.index.find(c=>c.id===id);
    if(entry){ entry.title=currentState.title; entry.description=currentState.description; entry.status=currentState.status; entry.updatedAt=Date.now(); }
    if(saveInFlight){ savePendingAfter=true; return; }
    saveInFlight=true; await saveStore(); saveInFlight=false;
    if(savePendingAfter){ savePendingAfter=false; save(); }
  };
  return { load, save, saveStore, saveLastGoodStore, loadLastGoodStore, savePreMigrationRecovery, loadRecoveryStore, clearPreMigrationRecovery, migrateStore, normalizeStateForSave };
}
