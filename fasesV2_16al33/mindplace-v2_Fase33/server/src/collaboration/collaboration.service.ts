import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JsonRepository } from '../common/repository';
import { AuthService, UserRecord } from '../auth/auth.service';
export type CasePermission='read'|'edit';
export interface CaseShare {id:string;caseId:string;ownerId:string;userId:string;email:string;name:string;permission:CasePermission;createdAt:number;updatedAt:number}
export interface CaseInvitation {id:string;caseId:string;ownerId:string;email:string;permission:CasePermission;createdAt:number;acceptedAt?:number;acceptedBy?:string}
export interface PresenceRecord {caseId:string;userId:string;email:string;name:string;displayName:string;activity:string;updatedAt:number}
export interface CollaborationEvent {id:string;caseId:string;actorId:string;actorName:string;actorEmail:string;action:string;detail:Record<string,unknown>;createdAt:number;version?:number}
interface ShareDb{shares:CaseShare[]} interface OwnerDb{owners:Record<string,string>} interface InvitationDb{invitations:CaseInvitation[]} interface PresenceDb{presence:PresenceRecord[]} interface ActivityDb{events:CollaborationEvent[]}
const emailOf=(v:string)=>String(v||'').trim().toLowerCase();
@Injectable() export class CollaborationService {
 private readonly shares=new JsonRepository<ShareDb>('case-shares.json',{shares:[]});
 private readonly owners=new JsonRepository<OwnerDb>('case-owners.json',{owners:{}});
 private readonly invitations=new JsonRepository<InvitationDb>('case-invitations.json',{invitations:[]});
 private readonly presence=new JsonRepository<PresenceDb>('case-presence.json',{presence:[]});
 private readonly activity=new JsonRepository<ActivityDb>('case-collaboration-events.json',{events:[]});
 constructor(private readonly auth:AuthService){}
 access(caseId:string,userId:string):CasePermission|null{ return this.shares.get().shares.find(s=>s.caseId===caseId&&s.userId===userId)?.permission??null; }
 canRead(caseId:string,userId:string,ownerId:string){return ownerId===userId||this.access(caseId,userId)!==null;}
 canEdit(caseId:string,userId:string,ownerId:string){return ownerId===userId||this.access(caseId,userId)==='edit';}
 registerOwner(caseId:string,ownerId:string){const db=this.owners.get();if(!db.owners[caseId]){db.owners[caseId]=ownerId;this.owners.set(db);}}
 assertRead(caseId:string,userId:string,ownerId?:string){const authoritativeOwner=ownerId??this.owners.get().owners[caseId];if(authoritativeOwner&&authoritativeOwner===userId)return;if(this.access(caseId,userId)===null)throw new ForbiddenException('No tienes acceso a este caso.');}
 assertOwner(caseId:string,userId:string){if(this.owners.get().owners[caseId]!==userId)throw new ForbiddenException('Solo el propietario puede administrar la colaboración.');}
 isOwner(caseId:string,userId:string){ const db=(this.shares.get().shares.find(s=>s.caseId===caseId)?.ownerId); return db===userId || this.ownerOfInvitation(caseId,userId); }
 // CasesService supplies owner id for authoritative checks; controller uses this fallback by looking at an existing share/invitation.
 ownerFromShares(caseId:string){ return this.shares.get().shares.find(s=>s.caseId===caseId)?.ownerId??null; }
 listMembersForAuthorizedCase(caseId:string,userId:string){
  const shares=this.shares.get().shares.filter(s=>s.caseId===caseId); const ownerId=this.owners.get().owners[caseId]??shares[0]?.ownerId;
  if(ownerId!==userId && !shares.some(s=>s.userId===userId)) throw new ForbiddenException('No tienes acceso a este caso.');
  const owner=ownerId?this.auth.findById(ownerId):null; if(!owner) throw new NotFoundException('Propietario no encontrado.');
  return this.listMembers(caseId,owner);
 }
 listMembers(caseId:string,owner:UserRecord){return [{userId:owner.id,email:owner.email,name:owner.name,permission:'owner' as const,createdAt:owner.createdAt},...this.shares.get().shares.filter(s=>s.caseId===caseId).map(s=>({userId:s.userId,email:s.email,name:s.name,permission:s.permission,createdAt:s.createdAt,updatedAt:s.updatedAt}))];}
 share(caseId:string,owner:UserRecord,email:string,permission:CasePermission){
  const targetEmail=emailOf(email); if(!targetEmail) throw new ConflictException('El email del colaborador es obligatorio.'); const target=this.auth.findByEmail(targetEmail);
  if(!target){const invitation=this.upsertInvitation(caseId,owner.id,targetEmail,permission);this.record(caseId,owner,'invitation.created',{email:targetEmail,permission});return {invited:true,invitation};}
  if(target.id===owner.id) throw new ConflictException('El propietario ya tiene acceso de edición.');
  const db=this.shares.get(),now=Date.now();let existing=db.shares.find(s=>s.caseId===caseId&&s.userId===target.id);
  if(existing){existing.permission=permission;existing.updatedAt=now;} else {existing={id:randomUUID(),caseId,ownerId:owner.id,userId:target.id,email:target.email,name:target.name,permission,createdAt:now,updatedAt:now};db.shares.push(existing);}
  this.shares.set(db);this.record(caseId,owner,'member.shared',{userId:target.id,email:target.email,permission});return {invited:false,member:existing};
 }
 update(caseId:string,owner:UserRecord,userId:string,permission:CasePermission){const db=this.shares.get(),s=db.shares.find(x=>x.caseId===caseId&&x.userId===userId);if(!s)throw new NotFoundException('Colaborador no encontrado.');s.permission=permission;s.updatedAt=Date.now();this.shares.set(db);this.record(caseId,owner,'member.permission_changed',{userId,permission});return s;}
 remove(caseId:string,owner:UserRecord,userId:string){const db=this.shares.get(),i=db.shares.findIndex(s=>s.caseId===caseId&&s.userId===userId);if(i<0)throw new NotFoundException('Colaborador no encontrado.');const [removed]=db.shares.splice(i,1);this.shares.set(db);this.record(caseId,owner,'member.removed',{userId:removed.userId,email:removed.email});return {removed:true,userId:removed.userId};}
 listInvitations(user:UserRecord){return this.invitations.get().invitations.filter(i=>i.email===user.email&&!i.acceptedAt);}
 acceptInvitation(user:UserRecord,invitationId:string){const db=this.invitations.get(),inv=db.invitations.find(i=>i.id===invitationId&&i.email===user.email&&!i.acceptedAt);if(!inv)throw new NotFoundException('Invitación no encontrada.');const shares=this.shares.get(),now=Date.now();const existing=shares.shares.find(s=>s.caseId===inv.caseId&&s.userId===user.id);if(existing){existing.permission=inv.permission;existing.updatedAt=now;}else shares.shares.push({id:randomUUID(),caseId:inv.caseId,ownerId:inv.ownerId,userId:user.id,email:user.email,name:user.name,permission:inv.permission,createdAt:now,updatedAt:now});this.shares.set(shares);inv.acceptedAt=now;inv.acceptedBy=user.id;this.invitations.set(db);this.record(inv.caseId,user,'invitation.accepted',{invitationId,permission:inv.permission});return {accepted:true,caseId:inv.caseId,permission:inv.permission};}
 heartbeat(caseId:string,user:UserRecord,displayName?:string,activity='viewing'){const db=this.presence.get(),now=Date.now();let p=db.presence.find(x=>x.caseId===caseId&&x.userId===user.id);if(!p){p={caseId,userId:user.id,email:user.email,name:user.name,displayName:'',activity,updatedAt:now};db.presence.push(p);}p.displayName=String(displayName??user.name??user.email).slice(0,80);p.activity=String(activity||'viewing').slice(0,40);p.updatedAt=now;this.presence.set(db);return p;}
 listPresence(caseId:string,userId:string){const db=this.presence.get(),cutoff=Date.now()-30_000;db.presence=db.presence.filter(p=>p.updatedAt>=cutoff);this.presence.set(db);return db.presence.filter(p=>p.caseId===caseId).map(p=>({...p,me:p.userId===userId}));}
 leave(caseId:string,userId:string){const db=this.presence.get();db.presence=db.presence.filter(p=>!(p.caseId===caseId&&p.userId===userId));this.presence.set(db);return {ok:true};}
 listActivity(caseId:string){return this.activity.get().events.filter(e=>e.caseId===caseId).sort((a,b)=>b.createdAt-a.createdAt).slice(0,100);}
 record(caseId:string,actor:UserRecord,action:string,detail:Record<string,unknown>,version?:number){const db=this.activity.get();db.events.push({id:randomUUID(),caseId,actorId:actor.id,actorName:actor.name||actor.email,actorEmail:actor.email,action,detail,createdAt:Date.now(),version});if(db.events.length>5000)db.events=db.events.slice(-5000);this.activity.set(db);}
 private upsertInvitation(caseId:string,ownerId:string,email:string,permission:CasePermission){const db=this.invitations.get(),existing=db.invitations.find(i=>i.caseId===caseId&&i.email===email&&!i.acceptedAt);if(existing){existing.permission=permission;existing.createdAt=Date.now();this.invitations.set(db);return existing;}const invitation={id:randomUUID(),caseId,ownerId,email,permission,createdAt:Date.now()};db.invitations.push(invitation);this.invitations.set(db);return invitation;}
 private ownerOfInvitation(caseId:string,userId:string){const email=this.auth.findById(userId)?.email;return !!email&&this.invitations.get().invitations.some(i=>i.caseId===caseId&&i.ownerId===userId&&i.email===email);}
}
