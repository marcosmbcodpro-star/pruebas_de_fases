import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
export class ShareCaseDto { @IsString() @MaxLength(160) email!: string; @IsEnum(['read','edit']) permission!: 'read'|'edit'; }
export class UpdateMemberDto { @IsEnum(['read','edit']) permission!: 'read'|'edit'; }
export class PresenceDto { @IsOptional() @IsString() @MaxLength(80) displayName?: string; @IsOptional() @IsString() @MaxLength(40) activity?: string; }
