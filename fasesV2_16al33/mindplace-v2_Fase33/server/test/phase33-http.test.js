const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/main.js');
let app, base, a, b, c;
const headers=t=>({authorization:`Bearer ${t}`});
async function json(path,options={}){const r=await fetch(`${base}${path}`,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});let body=null;try{body=await r.json()}catch{}return {r,body};}
async function register(label){const email=`phase33-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;const x=await json('/api/auth/register',{method:'POST',body:JSON.stringify({email,password:'MindPlace33!pass',name:label})});assert.equal(x.r.status,201);return {email,user:x.body.user,token:x.body.accessToken};}

test.before(async()=>{app=await createApp();await app.listen(0,'127.0.0.1');base=`http://127.0.0.1:${app.getHttpServer().address().port}`;a=await register('Propietario');b=await register('Colaborador');c=await register('Invitado');});
test.after(async()=>{await app.close();});

test('compartir un caso y ver miembros',async()=>{const id=`collab-${Date.now()}`;const created=await json(`/api/cases/${id}`,{method:'PUT',headers:headers(a.token),body:JSON.stringify({baseVersion:0,caseData:{id,title:'Caso colaborativo'}})});assert.equal(created.r.status,200);
 const share=await json(`/api/collaboration/cases/${id}/share`,{method:'POST',headers:headers(a.token),body:JSON.stringify({email:b.email,permission:'edit'})});assert.equal(share.r.status,201);assert.equal(share.body.member.permission,'edit');
 const list=await json('/api/cases',{headers:headers(b.token)});assert.equal(list.r.status,200);assert.equal(list.body.cases[0].permission,'edit');
 const members=await json(`/api/collaboration/cases/${id}`,{headers:headers(b.token)});assert.equal(members.r.status,200);assert.equal(members.body.members.length,2);});

test('permiso lectura bloquea escritura y presencia/auditoria funcionan',async()=>{const cases=await json('/api/cases',{headers:headers(a.token)});const id=cases.body.cases.at(-1).id;await json(`/api/collaboration/cases/${id}/members/${b.user.id}`,{method:'PATCH',headers:headers(a.token),body:JSON.stringify({permission:'read'})});
 const readCase=await json(`/api/cases/${id}`,{headers:headers(b.token)});assert.equal(readCase.r.status,200);
 const denied=await json(`/api/cases/${id}`,{method:'PUT',headers:headers(b.token),body:JSON.stringify({baseVersion:readCase.body.case.version,caseData:{id,title:'no'}})});assert.equal(denied.r.status,403);
 const p=await json(`/api/collaboration/cases/${id}/presence`,{method:'POST',headers:headers(b.token),body:JSON.stringify({activity:'reading'})});assert.equal(p.r.status,201);
 const presence=await json(`/api/collaboration/cases/${id}/presence`,{headers:headers(a.token)});assert.ok(presence.body.presence.some(x=>x.userId===b.user.id));
 const events=await json(`/api/collaboration/cases/${id}/activity`,{headers:headers(a.token)});assert.ok(events.body.events.some(x=>x.action==='member.permission_changed'));});

test('invitación pendiente y aceptación',async()=>{const id=`invite-${Date.now()}`;await json(`/api/cases/${id}`,{method:'PUT',headers:headers(a.token),body:JSON.stringify({baseVersion:0,caseData:{id,title:'Invitación'}})});const inv=await json(`/api/collaboration/cases/${id}/share`,{method:'POST',headers:headers(a.token),body:JSON.stringify({email:c.email,permission:'read'})});assert.equal(inv.body.invited,false);
 const id2=`invite-pending-${Date.now()}`;await json(`/api/cases/${id2}`,{method:'PUT',headers:headers(a.token),body:JSON.stringify({baseVersion:0,caseData:{id:id2,title:'Invitación pendiente'}})});const pendingEmail=`phase33-pending-${Date.now()}@example.test`;
 const pendingInvite=await json(`/api/collaboration/cases/${id2}/share`,{method:'POST',headers:headers(a.token),body:JSON.stringify({email:pendingEmail,permission:'read'})});assert.equal(pendingInvite.body.invited,true);assert.ok(pendingInvite.body.invitation.id);
 const pendingOwner=await json('/api/collaboration/invitations',{headers:headers(c.token)});assert.equal(pendingOwner.body.invitations.length,0);

});
