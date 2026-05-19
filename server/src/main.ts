import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowList = process.env.CLIENT_ORIGIN?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!allowList || allowList.length === 0) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed`), false);
    },
    credentials: true,
  });

  await app.listen(8080);
}
bootstrap();
