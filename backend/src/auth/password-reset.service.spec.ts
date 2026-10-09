import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordResetEmailService } from './email/password-reset-email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const user = {
  id: 'user-id',
  name: 'Ana',
  email: 'ana@example.test',
  passwordHash: 'old-hash',
  role: UserRole.USER,
};

function createService(
  options: { enabled?: boolean; existingUser?: boolean } = {},
) {
  let createdToken: PasswordResetToken | undefined;
  let deliveredToken: string | undefined;
  let updatedPasswordHash: string | undefined;
  const manager = {
    findOne: jest.fn().mockResolvedValue(user),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    create: jest.fn(
      (_entity: unknown, value: PasswordResetToken): PasswordResetToken => {
        createdToken = value;
        return value;
      },
    ),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn(
      (
        _entity: unknown,
        _criteria: unknown,
        value: { passwordHash: string },
      ) => {
        updatedPasswordHash = value.passwordHash;
        return Promise.resolve({ affected: 1 });
      },
    ),
    createQueryBuilder: jest.fn(),
  };
  const query = {
    delete: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn().mockResolvedValue({ raw: [{ userId: user.id }] }),
  };
  query.delete.mockReturnValue(query);
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.andWhere.mockReturnValue(query);
  query.returning.mockReturnValue(query);
  manager.createQueryBuilder.mockReturnValue(query);
  const repository = {
    manager: {
      transaction: jest.fn(
        (callback: (value: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    },
  };
  const users = {
    findByNormalizedEmail: jest
      .fn()
      .mockResolvedValue(options.existingUser === false ? null : user),
  };
  const email = {
    send: jest.fn((_email: string, token: string) => {
      deliveredToken = token;
      return Promise.resolve();
    }),
  };
  const config = new ConfigService<EnvironmentVariables, true>({
    PASSWORD_RESET_ENABLED: options.enabled ?? true,
    BCRYPT_ROUNDS: 10,
  } as EnvironmentVariables);

  return {
    manager,
    query,
    repository,
    users,
    email,
    getCreatedToken: () => createdToken,
    getDeliveredToken: () => deliveredToken,
    getUpdatedPasswordHash: () => updatedPasswordHash,
    service: new AuthService(
      users as unknown as UsersService,
      {} as never,
      repository as never,
      email as unknown as PasswordResetEmailService,
      config,
    ),
  };
}

describe('AuthService password reset', () => {
  it('persists only a hash, invalidates prior tokens, and sends a random token', async () => {
    const { getCreatedToken, getDeliveredToken, manager, service } =
      createService();

    await expect(
      service.forgotPassword({ email: ' ANA@EXAMPLE.TEST ' }),
    ).resolves.toEqual({
      message:
        'Se houver uma conta associada a este e-mail, serão enviadas instruções para redefinição da senha.',
    });

    const token = getDeliveredToken();
    const created = getCreatedToken();
    expect(token).toEqual(expect.any(String));
    expect(created).toBeDefined();
    if (!token || !created) {
      throw new Error('Password reset token was not created');
    }
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(created.tokenHash).not.toBe(token);
    expect(created.tokenHash).toHaveLength(64);
    expect(created.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * 60 * 1000,
    );
    expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 30 * 60 * 1000 + 1000,
    );
    expect(manager.findOne).toHaveBeenCalledWith(User, {
      where: { id: user.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.delete).toHaveBeenCalledWith(PasswordResetToken, {
      userId: user.id,
    });
  });

  it('uses the same public response without persisting or emailing an unknown account', async () => {
    const { email, manager, service } = createService({ existingUser: false });

    await expect(
      service.forgotPassword({ email: 'missing@example.test' }),
    ).resolves.toEqual({
      message:
        'Se houver uma conta associada a este e-mail, serão enviadas instruções para redefinição da senha.',
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('keeps the generic response when email delivery fails', async () => {
    const { email, service } = createService();
    email.send.mockRejectedValueOnce(new Error('provider details'));

    await expect(
      service.forgotPassword({ email: user.email }),
    ).resolves.toEqual({
      message:
        'Se houver uma conta associada a este e-mail, serão enviadas instruções para redefinição da senha.',
    });
  });

  it('rejects disabled recovery before looking up or consuming a token', async () => {
    const { query, service, users } = createService({ enabled: false });

    await expect(
      service.forgotPassword({ email: user.email }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.resetPassword({
        token: 'a-token',
        newPassword: 'senha-nova-123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.findByNormalizedEmail).not.toHaveBeenCalled();
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('validates the new password before consuming a token', async () => {
    const { query, service } = createService();

    await expect(
      service.resetPassword({ token: 'a-token', newPassword: 'short' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('atomically consumes a valid token, changes the password, and removes remaining tokens', async () => {
    const { getUpdatedPasswordHash, manager, query, service } = createService();

    await expect(
      service.resetPassword({
        token: 'a-token',
        newPassword: 'senha-nova-123',
      }),
    ).resolves.toBeUndefined();

    expect(query.where).toHaveBeenCalled();
    expect(query.andWhere).toHaveBeenCalledWith(
      '"expiresAt" > CURRENT_TIMESTAMP',
    );
    expect(manager.update).toHaveBeenCalled();
    const passwordHash = getUpdatedPasswordHash();
    expect(passwordHash).toEqual(expect.any(String));
    if (!passwordHash) {
      throw new Error('Password hash was not updated');
    }
    await expect(bcrypt.compare('senha-nova-123', passwordHash)).resolves.toBe(
      true,
    );
    expect(manager.delete).toHaveBeenCalledWith(PasswordResetToken, {
      userId: user.id,
    });
  });

  it('rejects an invalid, expired, or concurrently consumed token without changing a password', async () => {
    const { manager, query, service } = createService();
    query.execute.mockResolvedValueOnce({ raw: [] });

    await expect(
      service.resetPassword({
        token: 'a-token',
        newPassword: 'senha-nova-123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });
});
