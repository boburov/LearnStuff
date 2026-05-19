import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async set(tgId: number, data: unknown, ttl?: number) {
    await this.cache.set(`user:${tgId}`, data, ttl);
  }

  async get<T = unknown>(tgId: number): Promise<T | null> {
    return (await this.cache.get<T>(`user:${tgId}`)) ?? null;
  }

  async del(tgId: number) {
    await this.cache.del(`user:${tgId}`);
  }
}
