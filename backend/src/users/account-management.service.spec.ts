import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

interface AdminQueryMock {
  setLock: jest.Mock<AdminQueryMock, [string]>;
  where: jest.Mock<AdminQueryMock, [string, { role: UserRole }]>;
  orderBy: jest.Mock<AdminQueryMock, [string, string]>;
  getMany: jest.Mock<Promise<User[]>, []>;
}

interface ManagerMock {
  transaction: jest.Mock<
    Promise<unknown>,
    [(callback: (manager: ManagerMock) => Promise<unknown>) => Promise<unknown>]
  >;
  findOne: jest.Mock<
    Promise<User | null>,
    [typeof User, { where: { id: string }; lock: { mode: string } }]
  >;
  save: jest.Mock<Promise<User>, [User]>;
  delete: jest.Mock<
    Promise<{ affected: number }>,
    [typeof PasswordResetToken, { userId: string }]
  >;
  remove: jest.Mock<Promise<User>, [User]>;
  getRepository: jest.Mock<
    { createQueryBuilder: jest.Mock<AdminQueryMock, [string]> },
    [typeof User]
  >;
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.test',
    passwordHash: '',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    transcriptions: [],
    passwordResetTokens: [],
    ...overrides,
  };
}

function createService(users: User[]) {
  const manager = {} as ManagerMock;
  const query = {} as AdminQueryMock;

  query.setLock = jest.fn(() => query);
  query.where = jest.fn(() => query);
  query.orderBy = jest.fn(() => query);
  query.getMany = jest.fn(() =>
    Promise.resolve(
      users
        .filter((candidate) => candidate.role === UserRole.ADMIN)
        .sort((left, right) => left.id.localeCompare(right.id)),
    ),
  );
  manager.transaction = jest.fn((callback) => callback(manager));
  manager.findOne = jest.fn((_entity, options) =>
    Promise.resolve(
      users.find((candidate) => candidate.id === options.where.id) ?? null,
    ),
  );
  manager.save = jest.fn((value) => Promise.resolve(value));
  manager.delete = jest.fn(() => Promise.resolve({ affected: 1 }));
  manager.remove = jest.fn((value) => {
    const index = users.indexOf(value);
    if (index >= 0) {
      users.splice(index, 1);
    }
    return Promise.resolve(value);
  });
  manager.getRepository = jest.fn(() => ({
    createQueryBuilder: jest.fn(() => query),
  }));
  const repository = { manager };
  const config = new ConfigService<EnvironmentVariables, true>({
    BCRYPT_ROUNDS: 10,
  } as EnvironmentVariables);

  return {
    manager,
    service: new UsersService(repository as never, config),
  };
}

describe('UsersService account management', () => {
  it('does not write or invalidate tokens when normalized profile values are unchanged', async () => {
    const currentUser = user();
    const { manager, service } = createService([currentUser]);

    await expect(
      service.updateOwnProfile('user-id', {
        name: ' Ana ',
        email: ' ANA@EXAMPLE.TEST ',
      }),
    ).resolves.toEqual({
      id: 'user-id',
      name: 'Ana',
      email: 'ana@example.test',
      role: UserRole.USER,
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('updates a normalized email and invalidates pending tokens', async () => {
    const currentUser = user();
    const { manager, service } = createService([currentUser]);

    await service.updateOwnProfile('user-id', { email: ' NOVA@EXAMPLE.TEST ' });

    expect(currentUser.email).toBe('nova@example.test');
    expect(manager.save).toHaveBeenCalledWith(currentUser);
    expect(manager.delete).toHaveBeenCalledWith(expect.any(Function), {
      userId: 'user-id',
    });
  });

  it('maps a profile email uniqueness violation to conflict', async () => {
    const currentUser = user();
    const { manager, service } = createService([currentUser]);
    manager.save.mockRejectedValueOnce({ code: '23505' });

    await expect(
      service.updateOwnProfile('user-id', { email: 'other@example.test' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirms the current password before validating and changing the new password', async () => {
    const currentUser = user({
      passwordHash: await bcrypt.hash('senha-atual-123', 10),
    });
    const { manager, service } = createService([currentUser]);

    await expect(
      service.changeOwnPassword('user-id', {
        currentPassword: 'senha-errada-123',
        newPassword: 'curta',
      }),
    ).rejects.toMatchObject({ message: 'Invalid current password' });
    const originalHash = currentUser.passwordHash;
    await service.changeOwnPassword('user-id', {
      currentPassword: 'senha-atual-123',
      newPassword: 'senha-nova-valida-123',
    });

    expect(currentUser.passwordHash).not.toBe(originalHash);
    await expect(
      bcrypt.compare('senha-nova-valida-123', currentUser.passwordHash),
    ).resolves.toBe(true);
    expect(manager.delete).toHaveBeenCalledWith(expect.any(Function), {
      userId: 'user-id',
    });
  });

  it('rejects an invalid new password without changing the hash', async () => {
    const currentUser = user({
      passwordHash: await bcrypt.hash('senha-atual-123', 10),
    });
    const { manager, service } = createService([currentUser]);

    await expect(
      service.changeOwnPassword('user-id', {
        currentPassword: 'senha-atual-123',
        newPassword: 'curta',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      bcrypt.compare('senha-atual-123', currentUser.passwordHash),
    ).resolves.toBe(true);
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('blocks administrators before deciding whether self-deletion is allowed', async () => {
    const administrator = user({
      id: 'admin-a',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('senha-atual-123', 10),
    });
    const otherAdministrator = user({
      id: 'admin-b',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('senha-outra-123', 10),
    });
    const { manager, service } = createService([
      administrator,
      otherAdministrator,
    ]);

    await service.deleteOwnAccount('admin-a', { password: 'senha-atual-123' });

    expect(manager.getRepository).toHaveBeenCalledWith(User);
    expect(manager.remove).toHaveBeenCalledWith(administrator);
  });

  it('preserves the last administrator', async () => {
    const administrator = user({
      id: 'admin-a',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('senha-atual-123', 10),
    });
    const { manager, service } = createService([administrator]);

    await expect(
      service.deleteOwnAccount('admin-a', { password: 'senha-atual-123' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.remove).not.toHaveBeenCalled();
  });
});
