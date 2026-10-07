import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import type { EnvironmentVariables } from '../src/config/environment';

describe('Application foundation (e2e)', () => {
  let app: INestApplication;
  let server: Server;

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
  });

  afterAll(async () => {
    await app.close();
  });

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
});
