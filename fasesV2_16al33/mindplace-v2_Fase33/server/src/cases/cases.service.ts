import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { JsonRepository } from '../common/repository';
import { CollaborationService } from '../collaboration/collaboration.service';
import { AuthService } from '../auth/auth.service';
export interface ServerCase{id:string;ownerId:string;version:number;updatedAt:number;clientUpdatedAt?:number;contentHash:string;data:unknown}
interface CaseDb{cases:ServerCase[]}
const digest=(d:unknown)=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
@Injectable() export class CasesService{
 private readonly repo=new JsonRepository<CaseDb>('cases.json',{cases:[]});
 constructor(private readonly collaboration:CollaborationService,private readonly auth:AuthService){}
 private find(id:string){return this.repo.get().cases.find(c=>c.id===id);}
 getAccess(userId:string,id:string){const c=this.find(id);if(!c)throw new NotFoundException('Caso no encontrado.');this.collaboration.registerOwner(c.id,c.ownerId);if(!this.collaboration.canRead(id,userId,c.ownerId))throw new ForbiddenException('No tienes acceso a este caso.');return {case:c,permission:c.ownerId===userId?'owner':this.collaboration.access(id,userId)!};}
 list(userId:string){const all=this.repo.get().cases;for(const c of all)this.collaboration.registerOwner(c.id,c.ownerId);return all.filter(c=>this.collaboration.canRead(c.id,userId,c.ownerId)).map(c=>this.summary(c,userId));}
 get(userId:string,id:string){return this.getAccess(userId,id).case;}
 upsert(userId:string,id:string,baseVersion:number,data:unknown,clientUpdatedAt?:number){
  const db=this.repo.get(); const current=db.cases.find(c=>c.id===id);
  if(current){ if(!this.collaboration.canEdit(id,userId,current.ownerId))throw new ForbiddenException('Este caso está en modo lectura.'); if(Number(baseVersion)!==current.version)throw new ConflictException({code:'SYNC_CONFLICT',message:'El caso cambió en otro dispositivo.',server:current}); }
  const ownerId=current?.ownerId??userId; if(!current)this.collaboration.registerOwner(id,userId); const next={id,ownerId,version:current?current.version+1:1,updatedAt:Date.now(),clientUpdatedAt,contentHash:digest(data),data};
  if(current)db.cases[db.cases.indexOf(current)]=next; else db.cases.push(next); this.repo.set(db); const actor=this.auth.findById(userId); if(actor)this.collaboration.record(id,actor,'case.updated',{contentHash:next.contentHash},next.version); return next;
 }
 resolve(userId:string,id:string,baseVersion:number,strategy:'server'|'client',clientData?:unknown){const current=this.get(userId,id);if(current.version!==Number(baseVersion))throw new ConflictException({code:'SYNC_CONFLICT',message:'La versión del servidor cambió durante la resolución.',server:current});if(strategy==='client'&&!this.collaboration.canEdit(id,userId,current.ownerId))throw new ForbiddenException('No tienes permiso de edición para resolver este conflicto.');if(strategy==='client'&&typeof clientData==='undefined')throw new BadRequestException('La resolución con la versión cliente requiere caseData.');return strategy==='server'?current:this.upsert(userId,id,current.version,clientData,Date.now());}
 private summary(c:ServerCase,userId:string){return{id:c.id,ownerId:c.ownerId,version:c.version,updatedAt:c.updatedAt,clientUpdatedAt:c.clientUpdatedAt,contentHash:c.contentHash,permission:c.ownerId===userId?'owner':this.collaboration.access(c.id,userId)}}
}
