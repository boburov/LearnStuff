import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TelegramNotifierService } from '../auth/telegram-notifier.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_KEY = (phone: string) => `adminotp:${phone}`;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private telegram: TelegramNotifierService,
  ) {}

  async requestOtp(phone: string) {
    const admin = await this.prisma.admin.findUnique({ where: { phone } });
    if (!admin) {
      throw new NotFoundException('No admin with that phone');
    }
    if (admin.role === 'PENDING') {
      throw new UnauthorizedException(
        'Account pending approval by super admin',
      );
    }

    const code = String(randomInt(100000, 1000000));
    const hashed = await bcrypt.hash(code, 10);
    await this.redis.set(
      OTP_KEY(phone),
      { hashed, attempts: 0, adminId: admin.id, tgId: admin.tgId },
      OTP_TTL_MS,
    );

    const sent = await this.telegram.sendMessage(
      admin.tgId,
      `🛡 Admin panel kirish kodi: <b>${code}</b>\n\n5 daqiqa ichida amal qiladi.`,
    );

    return { sent, ttlSeconds: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(phone: string, code: string) {
    const entry = await this.redis.get<{
      hashed: string;
      attempts: number;
      adminId: number;
      tgId: string;
    }>(OTP_KEY(phone));
    if (!entry) {
      throw new BadRequestException('Code expired or not requested');
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      await this.redis.del(OTP_KEY(phone));
      throw new BadRequestException('Too many attempts');
    }

    const ok = await bcrypt.compare(code, entry.hashed);
    if (!ok) {
      await this.redis.set(
        OTP_KEY(phone),
        { ...entry, attempts: entry.attempts + 1 },
        OTP_TTL_MS,
      );
      throw new BadRequestException('Invalid code');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: entry.adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.role === 'PENDING') {
      throw new UnauthorizedException('Account pending approval');
    }

    await this.redis.del(OTP_KEY(phone));

    const token = await this.jwt.signAsync({
      sub: admin.id,
      tgId: admin.tgId,
      role: admin.role,
      kind: 'admin',
    });

    return {
      accessToken: token,
      user: {
        id: admin.id,
        username: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    };
  }
}
