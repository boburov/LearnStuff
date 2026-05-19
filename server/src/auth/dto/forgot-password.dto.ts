import { IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  initData!: string;
}
