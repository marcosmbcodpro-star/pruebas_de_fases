import { Module } from '@nestjs/common'; import { AuthModule } from '../auth/auth.module'; import { CasesController } from './cases.controller'; import { SyncController } from './sync.controller'; import { CasesService } from './cases.service';
@Module({imports:[AuthModule],controllers:[CasesController,SyncController],providers:[CasesService]}) export class CasesModule{}
