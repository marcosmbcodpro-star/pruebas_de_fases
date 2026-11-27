import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CasesService } from './cases.service';
import { PullSyncDto, PushSyncDto } from './cases.dto';

@Controller('api/sync')
export class SyncController {
  constructor(private readonly auth: AuthService, private readonly cases: CasesService) {}

  private user(header?: string) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Falta el token.');
    return this.auth.verifyToken(token);
  }

  @Post('push')
  push(@Headers('authorization') header: string | undefined, @Body() body: PushSyncDto) {
    const user = this.user(header);
    return { case: this.cases.upsert(user.id, body.caseId, body.baseVersion, body.caseData, body.clientUpdatedAt) };
  }

  @Post('pull')
  pull(@Headers('authorization') header: string | undefined, @Body() body: PullSyncDto) {
    const user = this.user(header);
    return { cases: body.caseIds.map((id) => { try { return this.cases.get(user.id, id); } catch { return null; } }).filter(Boolean) };
  }
}
