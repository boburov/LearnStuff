import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  initData!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  newPassword!: string;
}
