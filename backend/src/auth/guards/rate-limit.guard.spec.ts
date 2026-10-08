import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

function createGuard(kind: 'login' | 'register' | 'transcription', max = 2) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(kind) };
  const config = new ConfigService<EnvironmentVariables, true>({
    RATE_LIMIT_LOGIN_MAX: max,
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: 900,
    RATE_LIMIT_REGISTER_MAX: max,
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: 3600,
    RATE_LIMIT_TRANSCRIPTION_MAX: max,
    RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS: 3600,
  } as EnvironmentVariables);
  return new RateLimitGuard(reflector as never, new RateLimitService(), config);
}

function context(
  body: unknown,
  headers: Record<string, string>,
  user?: { id: string },
) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ ip: '127.0.0.1', body, user }),
      getResponse: () => ({
        setHeader: (key: string, value: string) => (headers[key] = value),
      }),
    }),
  };
}

describe('RateLimitGuard', () => {
  it('shares one login counter for equivalent normalized emails', () => {
    const guard = createGuard('login', 1);
    const headers: Record<string, string> = {};

    expect(
      guard.canActivate(
        context({ email: ' ANA@EXAMPLE.TEST ' }, headers) as never,
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        context({ email: 'ana@example.test' }, headers) as never,
      ),
    ).toThrow(HttpException);
    expect(headers['Retry-After']).toBeDefined();
  });

  it.each([undefined, 42, {}, []])(
    'does not consume or throw for invalid login input %p',
    (body) => {
      const guard = createGuard('login', 1);
      const headers: Record<string, string> = {};

      expect(() =>
        guard.canActivate(context(body, headers) as never),
      ).not.toThrow();
      expect(
        guard.canActivate(
          context({ email: 'ana@example.test' }, headers) as never,
        ),
      ).toBe(true);
    },
  );

  it('limits registration by origin and adds Retry-After', () => {
    const guard = createGuard('register', 1);
    const headers: Record<string, string> = {};

    expect(guard.canActivate(context({}, headers) as never)).toBe(true);
    expect(() => guard.canActivate(context({}, headers) as never)).toThrow(
      HttpException,
    );
    expect(headers['Retry-After']).toMatch(/^\d+$/);
  });

  it('limits transcriptions independently for each authenticated user', () => {
    const guard = createGuard('transcription', 1);
    const headers: Record<string, string> = {};

    expect(
      guard.canActivate(context({}, headers, { id: 'first-user' }) as never),
    ).toBe(true);
    expect(
      guard.canActivate(context({}, headers, { id: 'second-user' }) as never),
    ).toBe(true);
    expect(() =>
      guard.canActivate(context({}, headers, { id: 'first-user' }) as never),
    ).toThrow(HttpException);
    expect(headers['Retry-After']).toMatch(/^\d+$/);
  });
});
