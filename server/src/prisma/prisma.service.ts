import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.DB_HOST ?? 'localhost',
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'your_db',
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect().then(() =>
      console.log(`prisma->status => successfully connected to database`),
    ).catch((err) => console.log(
      `${Date.now()} => error while connectiong database => ${err.message}`,
    ),
    );
  }
}