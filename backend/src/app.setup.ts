import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { EnvironmentVariables } from './config/environment';

export function configureApplication(
  app: INestApplication,
  config: ConfigService<EnvironmentVariables, true>,
): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }) });
}
