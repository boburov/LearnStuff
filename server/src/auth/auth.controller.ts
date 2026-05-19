import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CheckAuthDto } from './dto/check-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('check')
  @HttpCode(200)
  check(@Body() dto: CheckAuthDto) {
    return this.authService.check(dto);
  }

  @Post('me')
  @HttpCode(200)
  me(
    @Body() dto: CheckAuthDto,
    @Headers('authorization') auth?: string,
  ) {
    const token = auth?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return this.authService.me(dto.initData, token);
  }

  @Post('register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
