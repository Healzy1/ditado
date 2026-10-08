import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { PublicConfigController } from './config/public-config.controller';
import { createTypeOrmOptions } from './config/typeorm.config';
import { validateEnvironment } from './config/environment';
import { TranscriptionsModule } from './transcriptions/transcriptions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
      inject: [ConfigService],
    }),
    UsersModule,
    TranscriptionsModule,
  ],
  controllers: [PublicConfigController],
})
export class AppModule {}
