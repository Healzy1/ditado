import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../../config/environment';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  function createStrategy(user: object | null) {
    const users = {
      findById: jest.fn().mockResolvedValue(user),
      toPublicUser: jest.fn((value: object) => value),
    };
    const config = new ConfigService<EnvironmentVariables, true>({
      JWT_SECRET: '0123456789abcdef0123456789abcdef',
    } as EnvironmentVariables);
    return {
      users,
      strategy: new JwtStrategy(config, users as unknown as UsersService),
    };
  }

  it('uses the current persisted account and role', async () => {
    const currentUser = {
      id: 'user-id',
      name: 'Ana',
      email: 'ana@example.test',
      role: UserRole.USER,
    };
    const { strategy } = createStrategy(currentUser);

    await expect(
      strategy.validate({ id: 'user-id', role: UserRole.ADMIN }),
    ).resolves.toEqual(currentUser);
  });

  it('rejects a token for an account removed from persistence', async () => {
    const { strategy } = createStrategy(null);

    await expect(
      strategy.validate({ id: 'removed-user', role: UserRole.USER }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
