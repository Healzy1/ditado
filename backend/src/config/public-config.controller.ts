import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './environment';

@Controller('config')
export class PublicConfigController {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Get('public')
  getPublicConfig(): { passwordResetEnabled: boolean } {
    return {
      passwordResetEnabled: this.config.get('PASSWORD_RESET_ENABLED', {
        infer: true,
      }),
    };
  }
}
