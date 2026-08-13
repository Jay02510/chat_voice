import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLogDto {
  @IsInt()
  callSessionId: number;

  @IsString()
  @MaxLength(4000)
  message: string;

  @IsIn(['TRANSCRIPT_USER', 'TRANSCRIPT_AI', 'ERROR', 'EVENT'])
  type: string;

  @IsOptional()
  @IsString()
  sessionToken?: string;
}
