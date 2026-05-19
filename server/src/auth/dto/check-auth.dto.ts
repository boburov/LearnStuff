import { IsString } from 'class-validator';

export class CheckAuthDto {
  @IsString()
  initData!: string;
}
