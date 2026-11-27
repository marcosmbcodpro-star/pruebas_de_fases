import { Body, Controller, Get, Headers, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CasesService } from './cases.service';
import { ResolveCaseDto, UpsertCaseDto } from './cases.dto';

@Controller('api/cases')
export class CasesController {
  constructor(private readonly auth: AuthService, private readonly cases: CasesService) {}

  private user(header?: string) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Falta el token.');
    return this.auth.verifyToken(token);
  }

  @Get()
  list(@Headers('authorization') header?: string) {
    return { cases: this.cases.list(this.user(header).id) };
  }

  @Get(':id')
  get(@Headers('authorization') header: string | undefined, @Param('id') id: string) {
    return { case: this.cases.get(this.user(header).id, id) };
  }

  @Put(':id')
  put(@Headers('authorization') header: string | undefined, @Param('id') id: string, @Body() body: UpsertCaseDto) {
    const user = this.user(header);
    return { case: this.cases.upsert(user.id, id, body.baseVersion, body.caseData, body.clientUpdatedAt) };
  }

  @Post(':id/resolve')
  resolve(@Headers('authorization') header: string | undefined, @Param('id') id: string, @Body() body: ResolveCaseDto) {
    const user = this.user(header);
    return { case: this.cases.resolve(user.id, id, body.baseVersion, body.strategy, body.caseData) };
  }
}
