import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  initData!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;

  @IsOptional()
  @IsString()
  email?: string;
}
