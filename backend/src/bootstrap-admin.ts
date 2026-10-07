import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrapAdmin() {
  const context = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
  });

  try {
    const result = await context.get(UsersService).ensureFirstAdmin();
    new Logger('BootstrapAdmin').log(
      result.created
        ? 'First administrator created'
        : 'Administrator already exists; nothing was changed',
    );
  } finally {
    await context.close();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  new Logger('BootstrapAdmin').error(
    error instanceof Error ? error.message : 'Bootstrap failed',
  );
  process.exitCode = 1;
});
