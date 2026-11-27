import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto'; import { JsonRepository } from '../common/repository';
export interface ServerCase{id:string;ownerId:string;version:number;updatedAt:number;clientUpdatedAt?:number;contentHash:string;data:unknown}
interface CaseDb{cases:ServerCase[]}
const digest=(d:unknown)=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
@Injectable() export class CasesService{
 private readonly repo=new JsonRepository<CaseDb>('cases.json',{cases:[]});
 list(ownerId:string){return this.repo.get().cases.filter(c=>c.ownerId===ownerId).map(this.summary);}
 get(ownerId:string,id:string){const c=this.repo.get().cases.find(x=>x.ownerId===ownerId&&x.id===id);if(!c)throw new NotFoundException('Caso no encontrado.');return c;}
 upsert(ownerId:string,id:string,baseVersion:number,data:unknown,clientUpdatedAt?:number){const db=this.repo.get();const current=db.cases.find(c=>c.ownerId===ownerId&&c.id===id);if(current&&Number(baseVersion)!==current.version)throw new ConflictException({code:'SYNC_CONFLICT',message:'El caso cambió en otro dispositivo.',server:current});const next={id,ownerId,version:current?current.version+1:1,updatedAt:Date.now(),clientUpdatedAt,contentHash:digest(data),data};if(current)db.cases[db.cases.indexOf(current)]=next;else db.cases.push(next);this.repo.set(db);return next;}
 resolve(ownerId:string,id:string,baseVersion:number,strategy:'server'|'client',clientData?:unknown){const current=this.get(ownerId,id);if(current.version!==Number(baseVersion))throw new ConflictException({code:'SYNC_CONFLICT',message:'La versión del servidor cambió durante la resolución.',server:current});if(strategy==='client' && typeof clientData==='undefined')throw new BadRequestException('La resolución con la versión cliente requiere caseData.');return strategy==='server'?current:this.upsert(ownerId,id,current.version,clientData,Date.now());}
 private summary(c:ServerCase){return{id:c.id,version:c.version,updatedAt:c.updatedAt,clientUpdatedAt:c.clientUpdatedAt,contentHash:c.contentHash};}
}
