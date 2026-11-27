const TOKEN_KEY='mindplace:sync-token'; const API_KEY='mindplace:sync-api-url';
function apiUrl(){try{return localStorage.getItem(API_KEY)||window.__MINDPLACE_SYNC_API__||'/api';}catch{return '/api';}}
function token(){try{return localStorage.getItem(TOKEN_KEY)||'';}catch{return '';}}
async function request(path:string,options:RequestInit={}){const t=token();if(!t)throw new Error('Inicia sesión para usar la colaboración.');const res=await fetch(`${apiUrl()}${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,...(options.headers||{})}});let body:any=null;try{body=await res.json();}catch{}if(!res.ok){const e:any=new Error(body?.message||body?.error?.message||`Error HTTP ${res.status}`);e.status=res.status;e.body=body;throw e;}return body;}
export type Permission='owner'|'read'|'edit';
export const collaborationApi={
  listCases:()=>request('/cases').then(b=>b.cases||[]),
  members:(caseId:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}`),
  share:(caseId:string,email:string,permission:'read'|'edit')=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/share`,{method:'POST',body:JSON.stringify({email,permission})}),
  permission:(caseId:string,userId:string,permission:'read'|'edit')=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(userId)}`,{method:'PATCH',body:JSON.stringify({permission})}),
  remove:(caseId:string,userId:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(userId)}`,{method:'DELETE'}),
  invitations:()=>request('/collaboration/invitations'),
  acceptInvitation:(id:string)=>request(`/collaboration/invitations/${encodeURIComponent(id)}/accept`,{method:'POST'}),
  presence:(caseId:string,activity='viewing',displayName?:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/presence`,{method:'POST',body:JSON.stringify({activity,displayName})}),
  getPresence:(caseId:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/presence`),
  leave:(caseId:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/presence`,{method:'DELETE'}),
  activity:(caseId:string)=>request(`/collaboration/cases/${encodeURIComponent(caseId)}/activity`)
};
