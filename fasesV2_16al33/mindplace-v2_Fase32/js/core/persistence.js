import { deepCloneData, safeJsonParse, normalizeCategoryFilter, makeEmptyStore, normalizeStoreForRuntime, validateStoreStructure } from './storage.js';
import { normalizeStateForPersistence } from './state.js';
import { normalizeCaseStatus } from '../models/validators.js';

export function createPersistenceManager({
  storeKey, storageVersion, dataVersion, recoveryKey, lastGoodKey,
  getStore, setStore, getCurrentCaseId, getState,
  getUid, isValidCase,
  showRecoveryNotice, showSaveWarning, applyTheme, renderMenu, openCase,
  removedThemes = [],
  attachmentRepository = null,
  scheduleSave,
  onSaveStatus = () => {}
}) {
  const normalizeNodeAttachments = async (node, caseId) => {
    if(!node || typeof node!=='object') return false;
    if(!Array.isArray(node.attachments)) node.attachments=[];
    let changed=false;
    const legacyEntries=[];
    if(typeof node.fileData==='string' && node.fileData.startsWith('data:')) legacyEntries.push({data:node.fileData,type:'document',name:node.fileName||'Adjunto',mimeType:node.fileType||''});
    if(typeof node.photoData==='string' && node.photoData.startsWith('data:')) legacyEntries.push({data:node.photoData,type:'image',name:node.fileName||'Imagen',mimeType:node.fileType||''});
    if(attachmentRepository && legacyEntries.length){
      for(const item of legacyEntries){
        try{
          const blob=attachmentRepository.dataUrlToBlob(item.data);
          if(blob.size > 25*1024*1024) continue;
          const meta=await attachmentRepository.putBlob(blob,{sourceId:node.id,caseId,type:item.type,name:item.name,mimeType:blob.type||item.mimeType||'application/octet-stream',size:blob.size});
          node.attachments.push(meta); changed=true;
        }catch(error){ console.warn('No se pudo migrar un adjunto legacy.',error); }
      }
    }
    if(legacyEntries.length){ delete node.fileData; delete node.photoData; delete node.fileName; delete node.fileSize; delete node.fileType; changed=true; }
    return changed;
  };

  const migrateLegacyAttachmentsInStore = async (targetStore) => {
    if(!attachmentRepository || !targetStore?.cases) return false;
    let changed=false;
    for(const [caseId,caseData] of Object.entries(targetStore.cases)){
      if(!caseData || !Array.isArray(caseData.nodes)) continue;
      for(const node of caseData.nodes){ if(await normalizeNodeAttachments(node,caseId)) changed=true; }
    }
    return changed;
  };

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
    c.status = normalizeCaseStatus(typeof c.status === 'string' ? c.status : (indexEntry?.status || 'abierto'));
    c.category = typeof c.category === 'string' ? c.category : (indexEntry?.category || '');
    c.nodes = Array.isArray(c.nodes) ? c.nodes.map(normalizeNodeForMigration) : [];
    const nodeIds = new Set(c.nodes.map(n=>n.id));
    c.edges = Array.isArray(c.edges) ? c.edges.map(e=>normalizeEdgeForMigration(e,nodeIds)).filter(Boolean) : [];
    const legacyHistory = Array.isArray(c.history) ? c.history : [];
    const existingActivity = Array.isArray(c.activity) ? c.activity : [];
    const legacyActivity = legacyHistory.filter(item => item && typeof item === 'object' && typeof item.action === 'string');
    const realHistory = legacyHistory.filter(item => !(item && typeof item === 'object' && typeof item.action === 'string'));
    c.history = realHistory;
    if(!c.history.length){
      c.history = [{ id:getUid('h'), title:'Estado inicial', createdAt:Date.now(), snapshot:{ title:c.title, description:c.description, status:c.status, category:c.category, nodes:JSON.parse(JSON.stringify(c.nodes)), edges:JSON.parse(JSON.stringify(c.edges)) } }];
    }
    c.activity = [...existingActivity, ...legacyActivity].map(item => ({...item}));
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
    const rawPreferences = source.preferences && typeof source.preferences === 'object' && !Array.isArray(source.preferences) ? source.preferences : {};
    migrated.preferences = {
      reducedMotion: rawPreferences.reducedMotion === true,
      compactUi: rawPreferences.compactUi === true,
      onboardingSeen: rawPreferences.onboardingSeen === true
    };
    migrated.storageVersion = storageVersion;
    const seen = new Set();
    for(const rawEntry of sourceIndex){
      if(!rawEntry || typeof rawEntry !== 'object' || typeof rawEntry.id !== 'string' || seen.has(rawEntry.id)) continue;
      const id = rawEntry.id; seen.add(id);
      const entry = {...rawEntry};
      entry.title = typeof entry.title === 'string' ? entry.title : 'CASO SIN TÍTULO';
      entry.description = typeof entry.description === 'string' ? entry.description : '';
      entry.status = normalizeCaseStatus(typeof entry.status === 'string' ? entry.status : 'abierto');
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
    const attachmentsMigrated = await migrateLegacyAttachmentsInStore(getStore());
    if(attachmentsMigrated){ try{ await saveStore(); }catch(error){ console.warn('No se pudo consolidar la migración de adjuntos.',error); } }
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
    try { onSaveStatus({ status:'saving', at:Date.now(), pending:false, error:'' }); } catch (_) {}
    let snapshot;
    try{ snapshot=deepCloneData(getStore()); if(snapshot===null) throw new Error('deepCloneData devolvió null'); }catch(e){ console.error('Guardado rechazado: no se pudo crear una copia del estado.',e); showSaveWarning(); return false; }
    normalizeStoreForRuntime(snapshot); snapshot.storageVersion=storageVersion; snapshot.dataVersion=dataVersion;
    if(!validateStoreStructure(snapshot)){ console.error('Guardado rechazado: la estructura de MindPlace no es válida.'); try { onSaveStatus({ status:'error', at:Date.now(), pending:false, error:'La estructura de MindPlace no es válida.' }); } catch (_) {} showSaveWarning(); return false; }
    let payload,roundTrip;
    try{ payload=JSON.stringify(snapshot); roundTrip=safeJsonParse(payload,null,'estado serializado'); if(!roundTrip||!validateStoreStructure(roundTrip)){ console.error('Guardado rechazado: los datos serializados no superan la validación.'); try { onSaveStatus({ status:'error', at:Date.now(), pending:false, error:'Los datos serializados no superan la validación.' }); } catch (_) {} showSaveWarning(); return false; } }catch(e){ console.error('Guardado rechazado: no se pudo serializar el estado.',e); showSaveWarning(); return false; }
    const MAX_ATTEMPTS=4;
    for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
      try{
        await window.storage.set(storeKey,payload,false);
        const confirmed=await window.storage.get(storeKey,false);
        const confirmedValue=confirmed?.value ? safeJsonParse(confirmed.value,null,'confirmación de guardado') : null;
        if(!confirmedValue || JSON.stringify(confirmedValue)!==JSON.stringify(roundTrip)) throw new Error('El guardado no pudo verificarse mediante lectura posterior.');
        await saveLastGoodStore(roundTrip);
        try {
          if (navigator.onLine === false) {
            await window.__mindplaceOffline?.enqueueStoreChange?.('offline-save');
            try {
              const registration = await navigator.serviceWorker?.ready;
              if (registration) await registration.sync?.register?.('mindplace-offline-sync');
            } catch (_) {}
          }
        } catch (_) {}
        try {
          if (navigator.onLine !== false && currentCaseId && window.__mindplaceSync?.getToken?.()) {
            const syncSnapshot = deepCloneData(roundTrip);
            window.__mindplaceSync.queueOnlineSync?.({ caseId: currentCaseId, store: syncSnapshot, reason: 'online-save' });
          }
        } catch (_) {}
        try { onSaveStatus({ status:'saved', at:Date.now(), pending:false, error:'' }); } catch (_) {}
        return true;
      }
      catch(e){ if(attempt<MAX_ATTEMPTS-1){ console.warn('guardado no confirmado, reintentando ('+(attempt+1)+'/'+MAX_ATTEMPTS+')'); await new Promise(r=>setTimeout(r,400*(attempt+1))); } else { console.error('No se pudo guardar tras varios intentos',e); try { onSaveStatus({ status:'error', at:Date.now(), pending:false, error:e?.message||'No se pudo guardar.' }); } catch (_) {} showSaveWarning(); setTimeout(()=>scheduleSave?.(),3000); return false; } }
    }
    return false;
  };
  const save = async () => {
    const id=getCurrentCaseId(); if(!id) return;
    const currentStore=getStore(); const currentState=getState();
    currentStore.cases[id]=currentState;
    const entry=currentStore.index.find(c=>c.id===id);
    if(entry){ entry.title=currentState.title; entry.description=currentState.description; entry.status=currentState.status; entry.updatedAt=Date.now(); }
    if(saveInFlight){ savePendingAfter=true; try { onSaveStatus({ status:'pending', at:Date.now(), pending:true, error:'' }); } catch (_) {} return; }
    saveInFlight=true; await saveStore(); saveInFlight=false;
    if(savePendingAfter){ savePendingAfter=false; save(); }
  };
  return { load, save, saveStore, saveLastGoodStore, loadLastGoodStore, savePreMigrationRecovery, loadRecoveryStore, clearPreMigrationRecovery, migrateStore, normalizeStateForSave };
}
