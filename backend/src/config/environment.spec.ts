import { validateEnvironment } from './environment';

const validEnvironment = (): Record<string, unknown> => ({
  NODE_ENV: 'test',
  PORT: '3000',
  APP_URL: 'http://localhost:5173',
  CORS_ORIGINS: 'http://localhost:5173',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_NAME: 'ditado',
  DB_USER: 'ditado',
  DB_PASSWORD: 'ditado_dev',
  JWT_SECRET: '0123456789abcdef0123456789abcdef',
  JWT_EXPIRES_IN: '1h',
  BCRYPT_ROUNDS: '12',
  GROQ_API_KEY: 'gsk_local_test_key',
  GROQ_TRANSCRIPTION_MODEL: 'whisper-large-v3-turbo',
  PASSWORD_RESET_ENABLED: 'false',
});

describe('validateEnvironment', () => {
  it('parses a valid base configuration', () => {
    const result = validateEnvironment(validEnvironment());

    expect(result.PORT).toBe(3000);
    expect(result.CORS_ORIGINS).toEqual(['http://localhost:5173']);
    expect(result.PASSWORD_RESET_ENABLED).toBe(false);
  });

  it.each([
    ['NODE_ENV', undefined],
    ['CORS_ORIGINS', ''],
    ['DB_PASSWORD', undefined],
    ['JWT_SECRET', ''],
  ])('rejects missing or empty required configuration %s', (name, value) => {
    const environment = validEnvironment();
    environment[name] = value;

    expect(() => validateEnvironment(environment)).toThrow(name);
  });

  it('rejects an unsupported NODE_ENV', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment(), NODE_ENV: 'staging' }),
    ).toThrow('NODE_ENV');
  });

  it('rejects invalid ports and wildcard CORS', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        PORT: '70000',
        CORS_ORIGINS: '*',
      }),
    ).toThrow('CORS_ORIGINS');
  });

  it('checks JWT_SECRET length in UTF-8 bytes', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment(), JWT_SECRET: 'short' }),
    ).toThrow('JWT_SECRET');

    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        JWT_SECRET: 'á'.repeat(16),
      }),
    ).not.toThrow();
  });

  it('rejects an invalid JWT_EXPIRES_IN duration', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        JWT_EXPIRES_IN: 'tomorrow',
      }),
    ).toThrow('JWT_EXPIRES_IN');
  });

  it.each(['9', '16', '12.5', 'not-a-number'])(
    'rejects invalid BCRYPT_ROUNDS value %s',
    (value) => {
      expect(() =>
        validateEnvironment({ ...validEnvironment(), BCRYPT_ROUNDS: value }),
      ).toThrow('BCRYPT_ROUNDS');
    },
  );

  it('defaults BCRYPT_ROUNDS to 12 when absent', () => {
    const environment = validEnvironment();
    delete environment.BCRYPT_ROUNDS;

    expect(validateEnvironment(environment).BCRYPT_ROUNDS).toBe(12);
  });

  it('rejects an invalid PASSWORD_RESET_ENABLED boolean', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        PASSWORD_RESET_ENABLED: 'yes',
      }),
    ).toThrow('PASSWORD_RESET_ENABLED');
  });

  it.each([
    ['GROQ_API_KEY', undefined],
    ['GROQ_API_KEY', ''],
    ['GROQ_API_KEY', 'invalid key'],
    ['GROQ_TRANSCRIPTION_MODEL', undefined],
    ['GROQ_TRANSCRIPTION_MODEL', ''],
    ['GROQ_TRANSCRIPTION_MODEL', 'invalid model!'],
  ])(
    'rejects absent, empty, or invalid Groq configuration %s',
    (name, value) => {
      const environment = validEnvironment();
      environment[name] = value;

      expect(() => validateEnvironment(environment)).toThrow(name);
    },
  );

  it('does not require Brevo configuration when password reset is disabled', () => {
    expect(() => validateEnvironment(validEnvironment())).not.toThrow();
  });

  it.each(['BREVO_API_KEY', 'EMAIL_FROM', 'APP_URL'])(
    'requires %s when password reset is enabled',
    (name) => {
      const environment = {
        ...validEnvironment(),
        PASSWORD_RESET_ENABLED: 'true',
        BREVO_API_KEY: 'local_test_key',
        EMAIL_FROM: 'no-reply@localhost.test',
      };
      delete environment[name];

      expect(() => validateEnvironment(environment)).toThrow(name);
    },
  );

  it('accepts locally valid password reset configuration', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        PASSWORD_RESET_ENABLED: 'true',
        BREVO_API_KEY: 'local_test_key',
        EMAIL_FROM: 'no-reply@localhost.test',
      }),
    ).not.toThrow();
  });

  it('rejects invalid email and URL formats', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        PASSWORD_RESET_ENABLED: 'true',
        BREVO_API_KEY: 'local_test_key',
        EMAIL_FROM: 'invalid',
        APP_URL: 'invalid',
      }),
    ).toThrow('EMAIL_FROM');
  });

  it('rejects non-positive and non-integer rate limits', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        RATE_LIMIT_LOGIN_MAX: '0',
        RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS: '1.5',
      }),
    ).toThrow('RATE_LIMIT_LOGIN_MAX');
  });

  it('does not include secret values in validation errors', () => {
    const secret = 'secret value that must not be printed';

    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        GROQ_API_KEY: secret,
      }),
    ).toThrow('GROQ_API_KEY');

    try {
      validateEnvironment({ ...validEnvironment(), GROQ_API_KEY: secret });
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
