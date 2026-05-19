import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.source.findMany({ orderBy: { label: 'asc' } });
  }

  async create(label: string) {
    return this.prisma.source.create({ data: { label } });
  }

  async update(id: number, label: string) {
    const existing = await this.prisma.source.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Source not found');
    return this.prisma.source.update({ where: { id }, data: { label } });
  }

  async remove(id: number) {
    const existing = await this.prisma.source.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Source not found');
    await this.prisma.source.delete({ where: { id } });
    return { ok: true };
  }

  async stats() {
    const grouped = await this.prisma.user.groupBy({
      by: ['sourceId'],
      _count: { _all: true },
    });
    const sources = await this.prisma.source.findMany();
    const map = new Map(sources.map((s) => [s.id, s.label]));
    return grouped.map((g) => ({
      sourceId: g.sourceId,
      label: g.sourceId ? (map.get(g.sourceId) ?? 'Unknown') : 'Unspecified',
      count: g._count._all,
    }));
  }
}
