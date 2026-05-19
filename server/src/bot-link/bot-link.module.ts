import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotLinkController } from './bot-link.controller';

@Module({
  controllers: [BotLinkController],
  providers: [PrismaService],
})
export class BotLinkModule {}
