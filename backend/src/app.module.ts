import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from './config/typeorm.config';
import { validateEnvironment } from './config/environment';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AppModule {}
