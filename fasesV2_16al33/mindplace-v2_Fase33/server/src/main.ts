import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  return app;
}

export async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`MindPlace API escuchando en http://localhost:${port}`);
  return app;
}

if (require.main === module) {
  void bootstrap().catch((error) => {
    console.error('No se pudo iniciar MindPlace API.', error);
    process.exitCode = 1;
  });
}
