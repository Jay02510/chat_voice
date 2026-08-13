import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class StartPublicSessionDto {
  @IsString()
  @MinLength(10)
  candidateMagicToken: string;

  @IsBoolean()
  consentGiven: boolean;

  @IsOptional()
  @IsInt()
  personaId?: number;
}
