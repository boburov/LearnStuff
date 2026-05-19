import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AdminRole = 'PENDING' | 'ADMIN' | 'SUPER_ADMIN';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  listUsers(query: { search?: string }) {
    return this.prisma.user.findMany({
      where: query.search
        ? {
            OR: [
              { username: { contains: query.search } },
              { email: { contains: query.search } },
              { tgId: { contains: query.search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tgId: true,
        username: true,
        email: true,
        sourceId: true,
        source: { select: { id: true, label: true } },
        createdAt: true,
      },
    });
  }

  listAdmins(query: { role?: AdminRole; search?: string }) {
    return this.prisma.admin.findMany({
      where: {
        role: query.role,
        OR: query.search
          ? [
              { name: { contains: query.search } },
              { phone: { contains: query.search } },
              { tgId: { contains: query.search } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setAdminRole(
    targetId: number,
    role: AdminRole,
    actorRole: AdminRole,
  ) {
    if (actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can change roles');
    }
    const target = await this.prisma.admin.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Admin not found');
    if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot demote a super admin');
    }
    if (role === 'ADMIN' && !target.phone) {
      throw new BadRequestException(
        'Admin must share phone via bot before approval',
      );
    }
    return this.prisma.admin.update({
      where: { id: targetId },
      data: { role },
    });
  }

  async removeAdmin(targetId: number, actorRole: AdminRole) {
    if (actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can delete admins');
    }
    const target = await this.prisma.admin.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Admin not found');
    if (target.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot delete a super admin');
    }
    await this.prisma.admin.delete({ where: { id: targetId } });
    return { ok: true };
  }

  async removeUser(targetId: number, actorRole: AdminRole) {
    if (actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can delete users');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id: targetId } });
    return { ok: true };
  }

  async stats() {
    const [totalUsers, totalAdmins, pendingAdmins, bySource, recentUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.admin.count({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        }),
        this.prisma.admin.count({ where: { role: 'PENDING' } }),
        this.prisma.user.groupBy({
          by: ['sourceId'],
          _count: { _all: true },
        }),
        this.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            username: true,
            tgId: true,
            createdAt: true,
          },
        }),
      ]);

    const sources = await this.prisma.source.findMany();
    const sourceMap = new Map(sources.map((s) => [s.id, s.label]));

    return {
      totalUsers,
      totalAdmins,
      pendingAdmins,
      bySource: bySource.map((s) => ({
        sourceId: s.sourceId,
        label: s.sourceId
          ? (sourceMap.get(s.sourceId) ?? 'Unknown')
          : 'Unspecified',
        count: s._count._all,
      })),
      recentUsers,
    };
  }
}
