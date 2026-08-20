import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;
}
