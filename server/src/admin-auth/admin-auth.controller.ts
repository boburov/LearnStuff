import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';

class RequestOtpDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'phone must be E.164 digits' })
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('request-otp')
  @HttpCode(200)
  request(@Body() dto: RequestOtpDto) {
    return this.adminAuth.requestOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(200)
  verify(@Body() dto: VerifyOtpDto) {
    return this.adminAuth.verifyOtp(dto.phone, dto.code);
  }
}
