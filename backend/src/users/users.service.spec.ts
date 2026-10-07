import { ConfigService } from '@nestjs/config';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const validConfig = {
  ADMIN_NAME: '  Administrador  ',
  ADMIN_EMAIL: '  ADMIN@Example.TEST  ',
  ADMIN_PASSWORD: 'senha-administrativa-123',
  BCRYPT_ROUNDS: 10,
};

function createService(existing: User | null = null) {
  const repository = {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn((user: Partial<User>) => user),
    save: jest
      .fn()
      .mockImplementation((user: Partial<User>) => Promise.resolve(user)),
  };
  const config = new ConfigService<EnvironmentVariables, true>(
    validConfig as EnvironmentVariables,
  );

  return {
    repository,
    service: new UsersService(repository as never, config),
  };
}

describe('UsersService.ensureFirstAdmin', () => {
  it('normalizes and creates the first administrator with bcrypt', async () => {
    const { repository, service } = createService();

    await expect(service.ensureFirstAdmin()).resolves.toEqual({
      created: true,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Administrador',
        email: 'admin@example.test',
        role: UserRole.ADMIN,
        passwordHash: expect.any(String) as string,
      }),
    );
  });

  it('is idempotent for an existing administrator', async () => {
    const { repository, service } = createService({
      role: UserRole.ADMIN,
    } as User);

    await expect(service.ensureFirstAdmin()).resolves.toEqual({
      created: false,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not promote an existing user', async () => {
    const { service } = createService({ role: UserRole.USER } as User);

    await expect(service.ensureFirstAdmin()).rejects.toThrow(
      'will not be promoted',
    );
  });

  it('is idempotent when a concurrent insert wins the unique constraint race', async () => {
    const { repository, service } = createService();
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ role: UserRole.ADMIN });
    repository.save.mockRejectedValueOnce({ code: '23505' });

    await expect(service.ensureFirstAdmin()).resolves.toEqual({
      created: false,
    });
  });

  it('rejects a missing bootstrap value before database access', async () => {
    const { repository } = createService();
    const config = new ConfigService<EnvironmentVariables, true>({
      ...validConfig,
      ADMIN_PASSWORD: undefined,
    } as EnvironmentVariables);
    const service = new UsersService(repository as never, config);

    await expect(service.ensureFirstAdmin()).rejects.toThrow('must be set');
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('validates the password before database access and hashing', async () => {
    const { repository } = createService();
    const config = new ConfigService<EnvironmentVariables, true>({
      ...validConfig,
      ADMIN_PASSWORD: 'short',
    } as EnvironmentVariables);
    const service = new UsersService(repository as never, config);

    await expect(service.ensureFirstAdmin()).rejects.toThrow('at least 12');
    expect(repository.findOne).not.toHaveBeenCalled();
  });
});

describe('UsersService.registerPublicUser', () => {
  it('normalizes input and always persists the user role', async () => {
    const { repository, service } = createService();

    await service.registerPublicUser({
      name: '  Ana  ',
      email: ' ANA@EXAMPLE.TEST ',
      password: 'senha-descartavel-123',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana',
        email: 'ana@example.test',
        role: UserRole.USER,
        passwordHash: expect.any(String) as string,
      }),
    );
  });

  it('rejects invalid passwords before creating a hash or saving', async () => {
    const { repository, service } = createService();

    await expect(
      service.registerPublicUser({
        name: 'Ana',
        email: 'ana@example.test',
        password: 'short',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('maps the normalized email unique constraint to conflict', async () => {
    const { repository, service } = createService();
    repository.save.mockRejectedValueOnce({ code: '23505' });

    await expect(
      service.registerPublicUser({
        name: 'Ana',
        email: ' ANA@EXAMPLE.TEST ',
        password: 'senha-descartavel-123',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
