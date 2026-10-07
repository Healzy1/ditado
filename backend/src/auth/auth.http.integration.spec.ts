import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../app.setup';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const jwtSecret = '0123456789abcdef0123456789abcdef';

function config(): ConfigService<EnvironmentVariables, true> {
  return new ConfigService<EnvironmentVariables, true>({
    CORS_ORIGINS: ['http://localhost:5173'],
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: '1h',
    RATE_LIMIT_LOGIN_MAX: 10,
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: 900,
    RATE_LIMIT_REGISTER_MAX: 5,
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: 3600,
  } as EnvironmentVariables);
}

function server(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

describe('authentication HTTP integration', () => {
  describe('JWT authentication', () => {
    let app: INestApplication;
    const currentUser = {
      id: 'current-user',
      name: 'Ana',
      email: 'ana@example.test',
      role: UserRole.USER,
      passwordHash: 'not-exposed',
    };
    const users = {
      findById: jest.fn().mockResolvedValue(currentUser),
      toPublicUser: jest.fn((user: typeof currentUser) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
      updateOwnProfile: jest.fn().mockResolvedValue({
        id: 'current-user',
        name: 'Ana Silva',
        email: 'ana.silva@example.test',
        role: UserRole.USER,
      }),
      changeOwnPassword: jest.fn().mockResolvedValue(undefined),
      deleteOwnAccount: jest.fn().mockResolvedValue(undefined),
    };
    const appConfig = config();

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          PassportModule.register({ defaultStrategy: 'jwt' }),
          JwtModule.register({
            secret: jwtSecret,
            signOptions: { expiresIn: '1h' },
          }),
        ],
        controllers: [UsersController],
        providers: [
          JwtAuthGuard,
          JwtStrategy,
          { provide: ConfigService, useValue: appConfig },
          { provide: UsersService, useValue: users },
        ],
      }).compile();

      app = module.createNestApplication();
      configureApplication(app, appConfig);
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('accepts a signed JWT and returns the current persisted public account', async () => {
      const token = await app.get(JwtService).signAsync({
        id: 'current-user',
        role: UserRole.ADMIN,
      });

      const response = await request(server(app))
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(users.findById).toHaveBeenCalledWith('current-user');
      expect(response.body).toEqual({
        id: 'current-user',
        name: 'Ana',
        email: 'ana@example.test',
        role: UserRole.USER,
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('routes authenticated account-management requests without accepting body identity', async () => {
      const token = await app.get(JwtService).signAsync({
        id: 'current-user',
        role: UserRole.ADMIN,
      });

      await request(server(app))
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: ' Ana Silva ' })
        .expect(200)
        .expect({
          id: 'current-user',
          name: 'Ana Silva',
          email: 'ana.silva@example.test',
          role: UserRole.USER,
        });
      expect(users.updateOwnProfile).toHaveBeenCalledWith('current-user', {
        name: 'Ana Silva',
      });

      await request(server(app))
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      await request(server(app))
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ana', role: 'admin' })
        .expect(400);

      await request(server(app))
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'senha-atual-123',
          newPassword: 'senha-nova-valida-123',
        })
        .expect(204);
      expect(users.changeOwnPassword).toHaveBeenCalledWith('current-user', {
        currentPassword: 'senha-atual-123',
        newPassword: 'senha-nova-valida-123',
      });

      await request(server(app))
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'senha-atual-123' })
        .expect(204);
      expect(users.deleteOwnAccount).toHaveBeenCalledWith('current-user', {
        password: 'senha-atual-123',
      });
    });
  });

  describe('login validation', () => {
    let app: INestApplication;
    const auth = { login: jest.fn(), register: jest.fn() };
    const appConfig = config();

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          RateLimitGuard,
          RateLimitService,
          { provide: ConfigService, useValue: appConfig },
          { provide: AuthService, useValue: auth },
        ],
      }).compile();

      app = module.createNestApplication();
      configureApplication(app, appConfig);
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      auth.login.mockClear();
    });

    it.each([
      [{ password: 'senha-descartavel-123' }],
      [{ email: 42, password: 'senha-descartavel-123' }],
      [[]],
      [{ email: { nested: true }, password: 'senha-descartavel-123' }],
    ])(
      'lets invalid login body %p reach the ValidationPipe as 400',
      async (body) => {
        await request(server(app))
          .post('/api/auth/login')
          .send(body)
          .expect(400);
        expect(auth.login).not.toHaveBeenCalled();
      },
    );

    it('rejects malformed JSON before the guard and controller', async () => {
      await request(server(app))
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":')
        .expect(400);
      expect(auth.login).not.toHaveBeenCalled();
    });
  });
});
