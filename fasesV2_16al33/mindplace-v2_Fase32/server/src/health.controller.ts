import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  get() {
    return { status: 'ok', service: 'mindplace-api', version: 'phase-32', now: new Date().toISOString() };
  }
}
