import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminModule } from './admin/admin.module';
import { BotLinkModule } from './bot-link/bot-link.module';
import { PrismaModule } from './prisma/prisma.module';
import { SourcesModule } from './sources/sources.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { RedisService } from './redis/redis.service';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    AdminModule,
    BotLinkModule,
    SourcesModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: 5000,
        stores: [
          new KeyvRedis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule {}
