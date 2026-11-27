import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service'; import { CollaborationService } from './collaboration.service'; import { PresenceDto, ShareCaseDto, UpdateMemberDto } from './collaboration.dto';
@Controller('api/collaboration') export class CollaborationController{
 constructor(private readonly auth:AuthService,private readonly collaboration:CollaborationService){}
 private user(header?:string){const token=header?.startsWith('Bearer ')?header.slice(7):'';if(!token)throw new UnauthorizedException('Falta el token.');return this.auth.verifyToken(token);}
 @Get('cases/:id') members(@Headers('authorization') h:string|undefined,@Param('id') id:string){const u=this.user(h);return {members:this.collaboration.listMembersForAuthorizedCase(id,u.id),permission:this.collaboration.access(id,u.id)??(this.collaboration.assertOwner(id,u.id),'owner')};}
 @Post('cases/:id/share') share(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Body() b:ShareCaseDto){const u=this.user(h);this.collaboration.assertOwner(id,u.id);return this.collaboration.share(id,u,b.email,b.permission);}
 @Patch('cases/:id/members/:userId') update(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Param('userId') uid:string,@Body() b:UpdateMemberDto){const u=this.user(h);this.collaboration.assertOwner(id,u.id);return {member:this.collaboration.update(id,u,uid,b.permission)};}
 @Delete('cases/:id/members/:userId') remove(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Param('userId') uid:string){const u=this.user(h);this.collaboration.assertOwner(id,u.id);return this.collaboration.remove(id,u,uid);}
 @Get('invitations') invitations(@Headers('authorization') h:string|undefined){return {invitations:this.collaboration.listInvitations(this.user(h))};}
 @Post('invitations/:id/accept') accept(@Headers('authorization') h:string|undefined,@Param('id') id:string){return this.collaboration.acceptInvitation(this.user(h),id);}
 @Post('cases/:id/presence') heartbeat(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Body() b:PresenceDto){const u=this.user(h);this.collaboration.assertRead(id,u.id);return {presence:this.collaboration.heartbeat(id,u,b.displayName,b.activity)};}
 @Get('cases/:id/presence') presence(@Headers('authorization') h:string|undefined,@Param('id') id:string){const u=this.user(h);this.collaboration.assertRead(id,u.id);return {presence:this.collaboration.listPresence(id,u.id)};}
 @Delete('cases/:id/presence') leave(@Headers('authorization') h:string|undefined,@Param('id') id:string){const u=this.user(h);this.collaboration.assertRead(id,u.id);return this.collaboration.leave(id,u.id);}
 @Get('cases/:id/activity') activity(@Headers('authorization') h:string|undefined,@Param('id') id:string){const u=this.user(h);this.collaboration.assertRead(id,u.id);return {events:this.collaboration.listActivity(id)};}
}
