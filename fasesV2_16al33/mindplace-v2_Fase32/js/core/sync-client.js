const TOKEN_KEY = 'mindplace:sync-token';
const USER_KEY = 'mindplace:sync-user';
const API_KEY = 'mindplace:sync-api-url';
const VERSION_PREFIX = 'mindplace:sync-version:';

function apiUrl() {
  try { return localStorage.getItem(API_KEY) || window.__MINDPLACE_SYNC_API__ || '/api'; } catch (_) { return '/api'; }
}
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function getToken(){ try{return localStorage.getItem(TOKEN_KEY) || '';}catch(_){return '';} }
function setToken(token){ try{ if(token)localStorage.setItem(TOKEN_KEY,token); else localStorage.removeItem(TOKEN_KEY);}catch(_){} }
function emit(detail={}) { try{window.dispatchEvent(new CustomEvent('mindplace:sync-state',{detail}));}catch(_){} }
async function request(path, options={}) {
  const response = await fetch(`${apiUrl()}${path}`, { ...options, headers: { 'Content-Type':'application/json', ...authHeaders(), ...(options.headers||{}) } });
  let body=null; try{body=await response.json();}catch(_){}
  if(!response.ok){ const error=new Error(body?.message || body?.error?.message || `Error HTTP ${response.status}`); error.status=response.status; error.body=body; throw error; }
  return body;
}
function versionKey(caseId){return `${VERSION_PREFIX}${caseId}`;}
function getVersion(caseId){try{return Number(localStorage.getItem(versionKey(caseId))||0);}catch(_){return 0;}}
function setVersion(caseId,version){try{localStorage.setItem(versionKey(caseId),String(version));}catch(_){} }
function isOnline(){return typeof navigator==='undefined'||navigator.onLine!==false;}
function publicState(){return {authenticated:Boolean(getToken()),user:getUser(),apiUrl:apiUrl(),online:isOnline(),conflict:false,lastError:''};}
function getUser(){try{const raw=localStorage.getItem(USER_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}}
function setUser(user){try{if(user)localStorage.setItem(USER_KEY,JSON.stringify(user));else localStorage.removeItem(USER_KEY);}catch(_){} emit(publicState());}

export function createSyncClient({ getStoreBridge=()=>window.__mindplaceSyncStore, onState=()=>{} }={}) {
  let lastError=''; let conflict=null; let conflictRecordId=''; let destroyed=false; let pendingOnlineSync=null;
  const publish=extra=>{if(destroyed)return;const value={...publicState(),lastError,conflict,...extra};try{onState(value);}catch(_){}emit(value);return value;};
  async function login(email,password){
    if(!isOnline()) return Promise.reject(new Error('No hay conexión con el servidor para iniciar sesión.'));const body=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setToken(body.accessToken);setUser(body.user);lastError='';conflict=null;publish();await syncNow();return body;}
  async function register(email,password,name=''){
    if(!isOnline()) return Promise.reject(new Error('No hay conexión con el servidor para crear la cuenta.'));const body=await request('/auth/register',{method:'POST',body:JSON.stringify({email,password,name})});setToken(body.accessToken);setUser(body.user);lastError='';conflict=null;publish();return body;}
  function logout(){setToken('');setUser(null);lastError='';conflict=null;publish();}
  async function me(){if(!getToken())return null;try{const body=await request('/auth/me');setUser(body.user);return body.user;}catch(error){logout();throw error;}}
  async function listCases(){return (await request('/cases')).cases || [];}
  async function pushChange(payload){
    if(!getToken()) return {ok:false,error:'No hay una sesión iniciada en el servidor.'};
    const caseId=String(payload?.caseId||payload?.payload?.caseId||'');
    const store=payload?.store || payload?.payload?.store;
    const caseData=store?.cases?.[caseId];
    if(!caseId || !caseData) return {ok:false,error:'No se pudo determinar el caso a sincronizar.'};
    const baseVersion=getVersion(caseId);
    try{
      const body=await request(`/cases/${encodeURIComponent(caseId)}`,{method:'PUT',body:JSON.stringify({baseVersion,caseData,clientUpdatedAt:caseData.updatedAt||Date.now()})});
      const serverCase=body.case; setVersion(caseId,serverCase.version); lastError=''; conflict=null; publish({lastSyncedCaseId:caseId});
      return {ok:true,serverCase};
    }catch(error){
      if(error.status===409 && error.body?.code==='SYNC_CONFLICT'){
        conflict={caseId,baseVersion,localCase:caseData,serverCase:error.body.server,detectedAt:Date.now()};
        try { const savedId=await getStoreBridge()?.offline?.saveConflict?.({ queueId:null, caseId, result:{ conflict }, localPayload:payload, createdAt:Date.now() }); if(savedId) conflictRecordId=savedId; } catch (_) {}
        lastError='Conflicto de sincronización detectado.'; publish({conflict});
        return {ok:false,conflict:true,error:lastError};
      }
      lastError=error?.message||'Error de sincronización.';publish();return {ok:false,error:lastError};
    }
  }
  async function pullAll(){
    if(!getToken())return {ok:false,reason:'unauthenticated'};
    try{
      const summaries=await listCases();const bridge=getStoreBridge();
      for(const summary of summaries){
        const localVersion=getVersion(summary.id);
        if(localVersion>=summary.version)continue;
        const remote=(await request(`/cases/${encodeURIComponent(summary.id)}`)).case;
        if(typeof bridge?.applyRemoteCase==='function') await bridge.applyRemoteCase(remote.data,remote.version);
        setVersion(summary.id,remote.version);
      }
      lastError='';publish({pulled:summaries.length});return {ok:true,count:summaries.length};
    }catch(error){lastError=error?.message||'No se pudieron descargar los casos.';publish();return {ok:false,error:lastError};}
  }
  async function resolveConflict(strategy='server'){
    if(!conflict)return {ok:false,error:'No hay conflicto activo.'};
    try{
      let caseData=conflict.localCase;
      const body=await request(`/cases/${encodeURIComponent(conflict.caseId)}/resolve`,{method:'POST',body:JSON.stringify({baseVersion:conflict.serverCase.version,strategy,caseData})});
      const serverCase=body.case;setVersion(conflict.caseId,serverCase.version);const bridge=getStoreBridge();
      if(strategy==='server'&&bridge?.applyRemoteCase)await bridge.applyRemoteCase(serverCase.data,serverCase.version);
      try { if(conflictRecordId && getStoreBridge()?.offline?.clearConflict) await getStoreBridge().offline.clearConflict(conflictRecordId); } catch (_) {}
      conflict=null; conflictRecordId=''; lastError='';publish({resolved:true});return {ok:true,case:serverCase};
    }catch(error){lastError=error?.message||'No se pudo resolver el conflicto.';publish();return {ok:false,error:lastError};}
  }
  async function syncNow(){
    if(!getToken())return {ok:false,error:'Inicia sesión para sincronizar.'};
    if(!isOnline()){ lastError='Sin conexión: los cambios permanecen guardados localmente.'; publish({online:false}); return {ok:false,error:lastError,offline:true}; }
    const bridge=getStoreBridge(); const offline=bridge?.offline;
    if(typeof offline?.flushQueue==='function'){ const pushed=await offline.flushQueue(); if(pushed?.ok===false) return pushed; }
    return pullAll();
  }
  function setApiUrl(value){try{const raw=String(value||'').trim();if(!raw||raw==='/api'||raw.endsWith('/api')){localStorage.setItem(API_KEY,'/api');}else{localStorage.setItem(API_KEY,raw.replace(/\/$/,''));}}catch(_){}publish({apiUrl:apiUrl()});}
  function setConflict(next){conflict=next||null;publish();}
  function getState(){return publish();}
  async function bootstrap(){
    const bridge=getStoreBridge();
    try {
      const stored=await bridge?.offline?.listConflicts?.();
      const latest=Array.isArray(stored)&&stored.length?stored[stored.length-1]:null;
      if(latest?.result?.conflict){ conflict=latest.result.conflict; conflictRecordId=latest.id||''; lastError='Conflicto de sincronización pendiente.'; }
    } catch (_) {}
    if(getToken())try{await me();}catch(_){}publish();
  }
  function queueOnlineSync(payload){ if(!getToken() || !payload?.caseId) return; if(pendingOnlineSync) clearTimeout(pendingOnlineSync); pendingOnlineSync=setTimeout(()=>{pendingOnlineSync=null;void pushChange(payload);},450); }
  const onOnline=()=>{publish({online:true});if(getToken())void syncNow();};
  const onOffline=()=>publish({online:false});
  window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);
  void bootstrap();
  return {login,register,logout,me,listCases,pushChange,pullAll,resolveConflict,syncNow,queueOnlineSync,setApiUrl,getApiUrl:apiUrl,getToken,getUser,getState,setConflict,destroy(){destroyed=true;window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);}};
}
