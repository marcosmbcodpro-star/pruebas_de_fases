import { IsDefined, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, IsArray, ArrayMaxSize } from 'class-validator';

export class UpsertCaseDto {
  @IsInt()
  @Min(0)
  baseVersion = 0;

  @IsDefined()
  caseData!: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  clientUpdatedAt?: number;
}

export class ResolveCaseDto {
  @IsInt()
  @Min(1)
  baseVersion!: number;

  @IsEnum(['server', 'client'])
  strategy!: 'server' | 'client';

  @IsOptional()
  @IsDefined()
  caseData?: unknown;
}

export class PushSyncDto {
  @IsString()
  @MaxLength(160)
  caseId!: string;

  @IsInt()
  @Min(0)
  baseVersion = 0;

  @IsDefined()
  caseData!: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  clientUpdatedAt?: number;
}

export class PullSyncDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  caseIds!: string[];
}
