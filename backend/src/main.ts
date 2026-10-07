import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApplication } from './app.setup';
import type { EnvironmentVariables } from './config/environment';

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  configureApplication(app, config);

  await app.listen(config.get('PORT', { infer: true }));
}

const bootstrapLogger = new Logger('Bootstrap');

bootstrap().catch((error: unknown) => {
  bootstrapLogger.error(
    error instanceof Error ? error.message : 'Application failed to start',
  );
  process.exitCode = 1;
});
