import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import type { EnvironmentVariables } from './environment';
import { Transcription } from '../transcriptions/entities/transcription.entity';
import { User } from '../users/entities/user.entity';

export function createTypeOrmOptions(
  config: ConfigService<EnvironmentVariables, true>,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    database: config.get('DB_NAME', { infer: true }),
    username: config.get('DB_USER', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    entities: [User, Transcription, PasswordResetToken],
    synchronize: config.get('NODE_ENV', { infer: true }) === 'development',
    logging: false,
  };
}
