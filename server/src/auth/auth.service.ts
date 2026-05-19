import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CheckAuthDto } from './dto/check-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TelegramNotifierService } from './telegram-notifier.service';
import { parseAndVerifyInitData, TelegramUser } from './telegram.util';

const RESET_TTL_MS = 5 * 60 * 1000;
const RESET_KEY = (tgId: string) => `pwreset:${tgId}`;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private telegram: TelegramNotifierService,
  ) {}

  private verify(initData: string): TelegramUser {
    if (process.env.AUTH_DEV_BYPASS === 'true') {
      try {
        const parsed = JSON.parse(initData) as TelegramUser;
        if (!parsed.id) throw new Error('missing id');
        return parsed;
      } catch {
        throw new BadRequestException(
          'AUTH_DEV_BYPASS on: initData must be JSON with at least { id }',
        );
      }
    }

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

  async me(initData: string, token: string) {
    const tgUser = this.verify(initData);
    const tgId = String(tgUser.id);

    let payload: { sub: number; tgId: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.tgId !== tgId) {
      throw new UnauthorizedException('Token does not match current user');
    }

    const user = await this.prisma.user.findUnique({ where: { tgId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user: { id: user.id, tgId: user.tgId, role: user.role } };
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
        sourceId: dto.sourceId,
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const tgUser = this.verify(dto.initData);
    const tgId = String(tgUser.id);

    const user = await this.prisma.user.findUnique({ where: { tgId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const code = String(randomInt(100000, 1000000));
    const hashed = await bcrypt.hash(code, 10);
    await this.redis.set(
      RESET_KEY(tgId),
      { hashed, attempts: 0 },
      RESET_TTL_MS,
    );

    const sent = await this.telegram.sendMessage(
      tgId,
      `🔐 Parolni tiklash kodingiz: <b>${code}</b>\n\n5 daqiqa ichida amal qiladi. Agar siz so'ramagan bo'lsangiz, e'tibor bermang.`,
    );

    return {
      sent,
      ttlSeconds: RESET_TTL_MS / 1000,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tgUser = this.verify(dto.initData);
    const tgId = String(tgUser.id);

    const entry = await this.redis.get<{ hashed: string; attempts: number }>(
      RESET_KEY(tgId),
    );
    if (!entry) {
      throw new BadRequestException('Code expired or not requested');
    }

    if (entry.attempts >= 5) {
      await this.redis.del(RESET_KEY(tgId));
      throw new BadRequestException('Too many attempts');
    }

    const ok = await bcrypt.compare(dto.code, entry.hashed);
    if (!ok) {
      await this.redis.set(
        RESET_KEY(tgId),
        { ...entry, attempts: entry.attempts + 1 },
        RESET_TTL_MS,
      );
      throw new BadRequestException('Invalid code');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    const user = await this.prisma.user.update({
      where: { tgId },
      data: { password: hashed },
    });

    await this.redis.del(RESET_KEY(tgId));
    return this.issueToken(user.id, user.tgId, user.role);
  }

  private async issueToken(id: number, tgId: string, role: string) {
    const token = await this.jwt.signAsync({ sub: id, tgId, role });
    return { accessToken: token, user: { id, tgId, role } };
  }
}
