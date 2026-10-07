import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './environment';
import { PublicConfigController } from './public-config.controller';

describe('PublicConfigController', () => {
  it('returns only the public password reset capability', () => {
    const config = new ConfigService<EnvironmentVariables, true>({
      PASSWORD_RESET_ENABLED: false,
    } as EnvironmentVariables);

    expect(new PublicConfigController(config).getPublicConfig()).toEqual({
      passwordResetEnabled: false,
    });
  });
});
