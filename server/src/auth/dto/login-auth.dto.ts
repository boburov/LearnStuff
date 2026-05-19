import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginAuthDto {
  @IsString()
  initData!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;
}
