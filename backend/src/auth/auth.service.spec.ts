import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const publicUser = {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.test',
    role: UserRole.USER,
  };

  function createService(user: { passwordHash: string } | null = null) {
    const users = {
      registerPublicUser: jest.fn().mockResolvedValue(publicUser),
      findByNormalizedEmail: jest.fn().mockResolvedValue(user),
      toPublicUser: jest.fn().mockReturnValue(publicUser),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    return {
      users,
      jwt,
      service: new AuthService(
        users as unknown as UsersService,
        jwt as JwtService,
      ),
    };
  }

  it('returns only public data after registration', async () => {
    const { service } = createService();

    await expect(
      service.register({
        name: 'Ana',
        email: 'ana@example.test',
        password: 'senha-descartavel-123',
      }),
    ).resolves.toEqual({ user: publicUser });
  });

  it('returns public data and a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('senha-descartavel-123', 10);
    const { jwt, service, users } = createService({
      ...publicUser,
      passwordHash,
    });

    await expect(
      service.login({
        email: ' ANA@EXAMPLE.TEST ',
        password: 'senha-descartavel-123',
      }),
    ).resolves.toEqual({ user: publicUser, accessToken: 'signed-token' });
    expect(users.findByNormalizedEmail).toHaveBeenCalledWith(
      'ana@example.test',
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({
      id: 'user-id',
      role: UserRole.USER,
    });
  });

  it('uses the same public error for a missing user and wrong password', async () => {
    const missing = createService();
    const passwordHash = await bcrypt.hash('senha-descartavel-123', 10);
    const wrongPassword = createService({ ...publicUser, passwordHash });
    const dto = { email: 'ana@example.test', password: 'wrong-password' };

    await expect(missing.service.login(dto)).rejects.toEqual(
      new UnauthorizedException('Invalid email or password'),
    );
    await expect(wrongPassword.service.login(dto)).rejects.toEqual(
      new UnauthorizedException('Invalid email or password'),
    );
  });
});
