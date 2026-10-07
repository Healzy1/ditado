import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PasswordResetToken } from '../src/auth/entities/password-reset-token.entity';
import { UserRole } from '../src/common/enums/user-role.enum';
import type { EnvironmentVariables } from '../src/config/environment';
import { Transcription } from '../src/transcriptions/entities/transcription.entity';
import { User } from '../src/users/entities/user.entity';

describe('Application foundation (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  const fixtureUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(
      app,
      app.get(ConfigService<EnvironmentVariables, true>),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (fixtureUserIds.length > 0) {
      await dataSource.getRepository(User).delete(fixtureUserIds);
    }
    await app.close();
  });

  async function createUser(
    email: string,
    password: string,
    role = UserRole.USER,
  ): Promise<User> {
    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'E2E User',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
      }),
    );
    fixtureUserIds.push(user.id);
    return user;
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  }

  it('returns a safe 404 under the global API prefix', async () => {
    const response = await request(server)
      .get('/api/foundation-probe')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'Cannot GET /api/foundation-probe',
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('allows only the configured development origin', async () => {
    await request(server)
      .get('/api/foundation-probe')
      .set('Origin', 'http://localhost:5173')
      .expect('access-control-allow-origin', 'http://localhost:5173')
      .expect(404);

    const response = await request(server)
      .get('/api/foundation-probe')
      .set('Origin', 'http://untrusted.test')
      .expect(404);

    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('exposes only public configuration and protects the current user route', async () => {
    await request(server)
      .get('/api/config/public')
      .expect(200)
      .expect({ passwordResetEnabled: false });

    await request(server).get('/api/users/me').expect(401);
    await request(server)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('updates a profile, invalidates pending tokens, and uses the new email for login', async () => {
    const password = 'senha-e2e-atual-123';
    const newEmail = `e2e-profile-new-${Date.now()}@example.test`;
    const conflictingEmail = `e2e-profile-conflict-${Date.now()}@example.test`;
    const user = await createUser(
      `e2e-profile-${Date.now()}@example.test`,
      password,
    );
    const conflictingUser = await createUser(conflictingEmail, password);
    await dataSource.getRepository(PasswordResetToken).save({
      tokenHash: 'controlled-token-hash',
      userId: user.id,
    });
    const token = await login(user.email, password);

    await request(server)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: ` ${conflictingEmail.toUpperCase()} ` })
      .expect(409);
    await expect(
      dataSource.getRepository(User).findOneByOrFail({ id: user.id }),
    ).resolves.toMatchObject({ email: user.email });
    expect(conflictingUser.email).toBe(conflictingEmail);

    const response = await request(server)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  E2E  Updated  ', email: ` ${newEmail.toUpperCase()} ` })
      .expect(200);

    expect(response.body).toMatchObject({
      id: user.id,
      name: 'E2E  Updated',
      email: newEmail,
      role: UserRole.USER,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(401);
    await expect(login(newEmail, password)).resolves.toEqual(
      expect.any(String),
    );
    await expect(
      dataSource.getRepository(PasswordResetToken).count({
        where: { userId: user.id },
      }),
    ).resolves.toBe(0);
  });

  it('changes a password and deletes an account with its dependent records', async () => {
    const currentPassword = 'senha-e2e-atual-456';
    const newPassword = 'senha-e2e-nova-456';
    const user = await createUser(
      `e2e-delete-${Date.now()}@example.test`,
      currentPassword,
    );
    await dataSource.getRepository(PasswordResetToken).save({
      tokenHash: 'controlled-delete-token-hash',
      userId: user.id,
    });
    await dataSource.getRepository(Transcription).save({
      text: 'Controlled transcription',
      originalFilename: 'controlled.ogg',
      language: 'pt',
      userId: user.id,
    });
    const token = await login(user.email, currentPassword);

    await request(server)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword, newPassword })
      .expect(204);
    await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: currentPassword })
      .expect(401);
    const tokenWithNewPassword = await login(user.email, newPassword);

    await request(server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${tokenWithNewPassword}`)
      .send({ password: newPassword })
      .expect(204);
    await request(server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenWithNewPassword}`)
      .expect(401);
    await expect(
      dataSource.getRepository(PasswordResetToken).count({
        where: { userId: user.id },
      }),
    ).resolves.toBe(0);
    await expect(
      dataSource.getRepository(Transcription).count({
        where: { userId: user.id },
      }),
    ).resolves.toBe(0);
  });

  it('preserves an account and its related records when deletion password is incorrect', async () => {
    const password = 'senha-e2e-preservada-789';
    const user = await createUser(
      `e2e-preserve-${Date.now()}@example.test`,
      password,
    );
    const passwordHash = user.passwordHash;
    await dataSource.getRepository(PasswordResetToken).save({
      tokenHash: 'controlled-preserved-token-hash',
      userId: user.id,
    });
    await dataSource.getRepository(Transcription).save({
      text: 'Preserved transcription',
      originalFilename: 'preserved.ogg',
      language: 'pt',
      userId: user.id,
    });
    const token = await login(user.email, password);

    await request(server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'senha-incorreta-789' })
      .expect(400);

    await expect(
      dataSource.getRepository(User).findOneByOrFail({ id: user.id }),
    ).resolves.toMatchObject({ passwordHash });
    await expect(
      dataSource.getRepository(PasswordResetToken).count({
        where: { userId: user.id },
      }),
    ).resolves.toBe(1);
    await expect(
      dataSource.getRepository(Transcription).count({
        where: { userId: user.id },
      }),
    ).resolves.toBe(1);
  });

  it('preserves an administrator when two administrators delete themselves concurrently', async () => {
    const password = 'senha-e2e-admin-789';
    const existingAdministratorCount = await dataSource
      .getRepository(User)
      .count({ where: { role: UserRole.ADMIN } });
    const firstAdministrator = await createUser(
      `e2e-admin-first-${Date.now()}@example.test`,
      password,
      UserRole.ADMIN,
    );
    const secondAdministrator = await createUser(
      `e2e-admin-second-${Date.now()}@example.test`,
      password,
      UserRole.ADMIN,
    );
    const [firstToken, secondToken] = await Promise.all([
      login(firstAdministrator.email, password),
      login(secondAdministrator.email, password),
    ]);

    const responses = await Promise.all([
      request(server)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${firstToken}`)
        .send({ password }),
      request(server)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${secondToken}`)
        .send({ password }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual(
      existingAdministratorCount === 0 ? [204, 409] : [204, 204],
    );
    await expect(
      dataSource.getRepository(User).count({
        where: { role: UserRole.ADMIN },
      }),
    ).resolves.toBeGreaterThanOrEqual(1);
  });
});
