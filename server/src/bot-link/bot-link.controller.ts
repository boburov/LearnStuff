import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class AdminRegisterDto {
  @IsString()
  tgId!: string;

  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('bot-link')
export class BotLinkController {
  constructor(private prisma: PrismaService) {}

  @Post('admin-register')
  @HttpCode(200)
  async adminRegister(
    @Body() dto: AdminRegisterDto,
    @Headers('x-bot-secret') secret?: string,
  ) {
    const expected = process.env.BOT_INTERNAL_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid bot secret');
    }

    const superIds = (process.env.SUPER_ADMIN_TG_ID ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isSuper = superIds.includes(dto.tgId);

    const existingByPhone = await this.prisma.admin.findUnique({
      where: { phone: dto.phone },
    });
    if (existingByPhone && existingByPhone.tgId !== dto.tgId) {
      throw new BadRequestException(
        'Phone already linked to another admin account',
      );
    }

    const existing = await this.prisma.admin.findUnique({
      where: { tgId: dto.tgId },
    });

    if (existing) {
      const updated = await this.prisma.admin.update({
        where: { tgId: dto.tgId },
        data: {
          phone: dto.phone,
          name: dto.name ?? existing.name,
          role:
            isSuper && existing.role !== 'SUPER_ADMIN'
              ? 'SUPER_ADMIN'
              : existing.role,
        },
      });
      return { ok: true, role: updated.role, status: 'updated' };
    }

    const created = await this.prisma.admin.create({
      data: {
        tgId: dto.tgId,
        phone: dto.phone,
        name: dto.name,
        role: isSuper ? 'SUPER_ADMIN' : 'PENDING',
      },
    });
    return { ok: true, role: created.role, status: 'created' };
  }
}
