import { openMindPlaceDB } from './storage.js';
import { createAttachment } from '../models/models.js';

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_NODE = 10;
export const MAX_BACKUP_ATTACHMENT_BYTES = 150 * 1024 * 1024;

const STORE = 'attachments';

function requestAsPromise(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error || new Error('Operación de adjunto fallida.'));
  });
}

function dataUrlToBlob(dataUrl){
  const match=String(dataUrl||'').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/);
  if(!match) throw new Error('Datos de archivo no válidos.');
  const mime=match[1] || 'application/octet-stream';
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

async function sha256Hex(blob){
  try{
    if(!crypto?.subtle) return '';
    const buffer=await blob.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',buffer);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){ return ''; }
}

function cleanMeta(meta){
  return {
    id: String(meta.id || `a-${Math.random().toString(36).slice(2,9)}`),
    sourceId: String(meta.sourceId || ''),
    caseId: String(meta.caseId || ''),
    type: String(meta.type || 'file'),
    name: String(meta.name || 'Adjunto').slice(0,180),
    mimeType: String(meta.mimeType || 'application/octet-stream').slice(0,180),
    size: Number.isFinite(Number(meta.size)) ? Number(meta.size) : 0,
    createdAt: Number.isFinite(Number(meta.createdAt)) ? Number(meta.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(meta.updatedAt)) ? Number(meta.updatedAt) : Date.now(),
    sha256: typeof meta.sha256 === 'string' ? meta.sha256 : '',
    extension: typeof meta.extension === 'string' ? meta.extension.slice(0,15) : ''
  };
}

export function createAttachmentRepository({ getCurrentCaseId = () => '' } = {}){
  let dbPromise=null;
  const db=()=>dbPromise ||= openMindPlaceDB();

  async function putBlob(blob, meta={}){
    if(!(blob instanceof Blob)) throw new Error('El archivo no es válido.');
    if(blob.size > MAX_ATTACHMENT_SIZE) throw new Error(`El archivo supera el límite de ${Math.round(MAX_ATTACHMENT_SIZE/1024/1024)} MB.`);
    const metadata=cleanMeta({...meta, size:blob.size, mimeType:meta.mimeType || blob.type || 'application/octet-stream'});
    if(!metadata.caseId) metadata.caseId=String(getCurrentCaseId() || '');
    metadata.sha256=metadata.sha256 || await sha256Hex(blob);
    const record={...metadata, blob};
    const database=await db();
    await requestAsPromise(database.transaction(STORE,'readwrite').objectStore(STORE).put(record));
    return metadata;
  }

  async function putFile(file, meta={}){ return putBlob(file, {...meta,name:file.name,mimeType:file.type || meta.mimeType}); }

  async function get(id){
    if(!id) return null;
    const database=await db();
    return requestAsPromise(database.transaction(STORE,'readonly').objectStore(STORE).get(id));
  }

  async function getUrl(id){
    const record=await get(id);
    if(!record?.blob) return null;
    return URL.createObjectURL(record.blob);
  }

  async function deleteOne(id){
    if(!id) return;
    const database=await db();
    await requestAsPromise(database.transaction(STORE,'readwrite').objectStore(STORE).delete(id));
  }

  async function deleteForSource(sourceId){
    if(!sourceId) return 0;
    const database=await db();
    const store=database.transaction(STORE,'readwrite').objectStore(STORE);
    const index=store.index('sourceId');
    const records=await requestAsPromise(index.getAll(sourceId));
    for(const record of records || []) await requestAsPromise(store.delete(record.id));
    return records?.length || 0;
  }

  async function listAll(){
    const database=await db();
    const records=await requestAsPromise(database.transaction(STORE,'readonly').objectStore(STORE).getAll());
    return (records || []).map(({blob,...meta})=>meta);
  }

  async function listByCase(caseId){
    if(!caseId) return [];
    const database=await db();
    const records=await requestAsPromise(database.transaction(STORE,'readonly').objectStore(STORE).index('caseId').getAll(caseId));
    return records || [];
  }

  async function getBundleForCase(caseId){
    const records=await listByCase(caseId);
    let total=0;
    const items=[];
    for(const record of records){
      total += Number(record.size||record.blob?.size||0);
      if(total > MAX_BACKUP_ATTACHMENT_BYTES) throw new Error('Los adjuntos del caso superan el límite de exportación de 150 MB.');
      const dataUrl=record.blob ? await blobToDataUrl(record.blob) : '';
      const {blob,...meta}=record;
      items.push({...meta,dataUrl});
    }
    return items;
  }

  async function getFullBundle(){
    const database=await db();
    const records=await requestAsPromise(database.transaction(STORE,'readonly').objectStore(STORE).getAll());
    let total=0;
    const items=[];
    for(const record of records || []){
      total += Number(record.size||record.blob?.size||0);
      if(total > MAX_BACKUP_ATTACHMENT_BYTES) throw new Error('Los adjuntos superan el límite de exportación de 150 MB.');
      const dataUrl=record.blob ? await blobToDataUrl(record.blob) : '';
      const {blob,...meta}=record;
      items.push({...meta,dataUrl});
    }
    return items;
  }

  async function importBundle(items, {caseId='', sourceIdRewrite=null}={}){
    const list=Array.isArray(items)?items:[];
    const map=new Map();
    for(const raw of list){
      if(!raw || typeof raw!=='object' || typeof raw.dataUrl!=='string') continue;
      const blob=dataUrlToBlob(raw.dataUrl);
      if(blob.size>MAX_ATTACHMENT_SIZE) throw new Error(`El adjunto "${raw.name || 'archivo'}" supera el límite de ${Math.round(MAX_ATTACHMENT_SIZE/1024/1024)} MB.`);
      const oldId=String(raw.id || '');
      const newId=`a-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36).slice(-5)}`;
      const sourceId=typeof sourceIdRewrite==='function' ? sourceIdRewrite(String(raw.sourceId||'')) : String(raw.sourceId||'');
      const calculatedHash=await sha256Hex(blob);
      if(raw.sha256 && calculatedHash && raw.sha256 !== calculatedHash) throw new Error(`El adjunto "${raw.name || 'archivo'}" no supera la comprobación de integridad.`);
      const metadata=createAttachment({
        ...raw,id:newId,sourceId,caseId:caseId || raw.caseId || getCurrentCaseId(),
        size:blob.size,mimeType:blob.type || raw.mimeType,name:raw.name,sha256:calculatedHash || raw.sha256 || ''
      });
      await putBlob(blob,metadata);
      if(oldId) map.set(oldId,newId);
    }
    return map;
  }

  async function clearAll(){
    const database=await db();
    await requestAsPromise(database.transaction(STORE,'readwrite').objectStore(STORE).clear());
  }

  return {putBlob,putFile,get,getUrl,deleteOne,deleteForSource,listAll,listByCase,getBundleForCase,getFullBundle,importBundle,clearAll, dataUrlToBlob, blobToDataUrl};
}
