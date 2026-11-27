import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, CasesModule],
  controllers: [HealthController],
})
export class AppModule {}
