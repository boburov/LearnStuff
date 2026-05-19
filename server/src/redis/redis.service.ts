import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async set(key: string, data: unknown, ttlMs?: number) {
    await this.cache.set(key, data, ttlMs);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return (await this.cache.get<T>(key)) ?? null;
  }

  async del(key: string) {
    await this.cache.del(key);
  }
}
