import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { JsonRepository } from '../common/repository';
export interface UserRecord{id:string;email:string;name:string;passwordHash:string;createdAt:number}
interface UserDb{users:UserRecord[]}
const emailOf=(v:string)=>String(v||'').trim().toLowerCase();
function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function verifyPassword(password:string,stored:string){const [salt,hex]=String(stored).split(':');if(!salt||!hex)return false;const a=scryptSync(password,salt,64),b=Buffer.from(hex,'hex');return a.length===b.length&&timingSafeEqual(a,b);}
function makeId(email:string){return createHash('sha256').update(email).digest('hex').slice(0,24);}
@Injectable() export class AuthService{
 private readonly repo=new JsonRepository<UserDb>('users.json',{users:[]});
 constructor(private readonly jwt:JwtService){}
 register(email:string,password:string,name=''){const e=emailOf(email);if(!e||password.length<8)throw new ConflictException('El email y una contraseña de al menos 8 caracteres son obligatorios.');const db=this.repo.get();if(db.users.some(u=>u.email===e))throw new ConflictException('Ya existe un usuario con ese email.');const user={id:makeId(e),email:e,name:String(name||'').trim().slice(0,80),passwordHash:hashPassword(password),createdAt:Date.now()};db.users.push(user);this.repo.set(db);return this.issue(user);}
 login(email:string,password:string){const user=this.repo.get().users.find(u=>u.email===emailOf(email));if(!user||!verifyPassword(password,user.passwordHash))throw new UnauthorizedException('Credenciales no válidas.');return this.issue(user);}
 verifyToken(token:string){try{const payload=this.jwt.verify<{sub:string}>(token);const user=this.repo.get().users.find(u=>u.id===payload.sub);if(!user)throw new UnauthorizedException('Usuario no encontrado.');return user;}catch{throw new UnauthorizedException('Token no válido o caducado.');}}
 publicUser(user:UserRecord){return{id:user.id,email:user.email,name:user.name,createdAt:user.createdAt};}
 private issue(user:UserRecord){return{accessToken:this.jwt.sign({sub:user.id,email:user.email,name:user.name}),user:this.publicUser(user)};}
}
