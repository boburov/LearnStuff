import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CheckAuthDto } from './dto/check-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { parseAndVerifyInitData, TelegramUser } from './telegram.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private verify(initData: string): TelegramUser {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new BadRequestException('Bot token not configured');
    }
    const tgUser = parseAndVerifyInitData(initData, token);
    if (!tgUser) {
      throw new UnauthorizedException('Invalid Telegram initData');
    }
    return tgUser;
  }

  async check(dto: CheckAuthDto) {
    const tgUser = this.verify(dto.initData);
    const tgId = String(tgUser.id);
    const user = await this.prisma.user.findUnique({ where: { tgId } });
    return {
      exists: !!user,
      tgId,
      suggestedUsername: tgUser.username ?? null,
    };
  }

  async register(dto: RegisterAuthDto) {
    const tgUser = this.verify(dto.initData);
    const tgId = String(tgUser.id);

    const existing = await this.prisma.user.findUnique({ where: { tgId } });
    if (existing) {
      throw new ConflictException('User already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tgId,
        username: dto.username,
        email: dto.email,
        password: hashed,
      },
    });

    return this.issueToken(user.id, user.tgId, user.role);
  }

  async login(dto: LoginAuthDto) {
    const tgUser = this.verify(dto.initData);
    const tgId = String(tgUser.id);

    const user = await this.prisma.user.findUnique({ where: { tgId } });
    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid password');
    }

    return this.issueToken(user.id, user.tgId, user.role);
  }

  private async issueToken(id: number, tgId: string, role: string) {
    const token = await this.jwt.signAsync({ sub: id, tgId, role });
    return { accessToken: token, user: { id, tgId, role } };
  }
}
