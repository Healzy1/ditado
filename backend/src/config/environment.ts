const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

type NodeEnvironment = (typeof NODE_ENV_VALUES)[number];

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  APP_URL?: string;
  CORS_ORIGINS: string[];
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  GROQ_API_KEY: string;
  GROQ_TRANSCRIPTION_MODEL: string;
  PASSWORD_RESET_ENABLED: boolean;
  BREVO_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME: string;
  ADMIN_NAME?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: number;
  RATE_LIMIT_LOGIN_MAX: number;
  RATE_LIMIT_REGISTER_WINDOW_SECONDS: number;
  RATE_LIMIT_REGISTER_MAX: number;
  RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: number;
  RATE_LIMIT_FORGOT_PASSWORD_MAX: number;
  RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS: number;
  RATE_LIMIT_RESET_PASSWORD_MAX: number;
  RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS: number;
  RATE_LIMIT_TRANSCRIPTION_MAX: number;
}

function requiredString(
  environment: Record<string, unknown>,
  name: string,
  errors: string[],
): string {
  const value = environment[name];

  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${name} is required and cannot be empty`);
    return '';
  }

  return value.trim();
}

function optionalString(
  environment: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = environment[name];

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  return value.trim();
}

function integer(
  environment: Record<string, unknown>,
  name: string,
  errors: string[],
  options: { defaultValue?: number; min?: number; max?: number } = {},
): number {
  const rawValue = environment[name];

  if (rawValue === undefined && options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  const value = typeof rawValue === 'number' ? String(rawValue) : rawValue;

  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    errors.push(`${name} must be an integer`);
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    errors.push(`${name} must be a safe integer`);
    return 0;
  }

  if (options.min !== undefined && parsed < options.min) {
    errors.push(`${name} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    errors.push(`${name} must be at most ${options.max}`);
  }

  return parsed;
}

function boolean(
  environment: Record<string, unknown>,
  name: string,
  errors: string[],
  defaultValue: boolean,
): boolean {
  const value = environment[name];

  if (value === undefined) {
    return defaultValue;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  errors.push(`${name} must be either true or false`);
  return defaultValue;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isOrigin(value: string): boolean {
  if (value === '*' || !isHttpUrl(value)) {
    return false;
  }

  return new URL(value).origin === value;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): EnvironmentVariables {
  const errors: string[] = [];
  const nodeEnv = requiredString(environment, 'NODE_ENV', errors);

  if (!NODE_ENV_VALUES.includes(nodeEnv as NodeEnvironment)) {
    errors.push(`NODE_ENV must be one of: ${NODE_ENV_VALUES.join(', ')}`);
  }

  const corsOriginsValue = requiredString(environment, 'CORS_ORIGINS', errors);
  const corsOrigins = corsOriginsValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (
    corsOrigins.length === 0 ||
    corsOrigins.some((origin) => !isOrigin(origin))
  ) {
    errors.push('CORS_ORIGINS must contain valid origins and cannot contain *');
  }

  const appUrl = optionalString(environment, 'APP_URL');
  if (appUrl !== undefined && !isHttpUrl(appUrl)) {
    errors.push('APP_URL must be a valid HTTP or HTTPS URL');
  }

  const jwtSecretValue = environment.JWT_SECRET;
  const jwtSecret = typeof jwtSecretValue === 'string' ? jwtSecretValue : '';
  if (jwtSecret.trim() === '') {
    errors.push('JWT_SECRET is required and cannot be empty');
  } else if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    errors.push('JWT_SECRET must contain at least 32 bytes in UTF-8');
  }

  let jwtExpiresIn = '1h';
  if (environment.JWT_EXPIRES_IN !== undefined) {
    if (typeof environment.JWT_EXPIRES_IN !== 'string') {
      errors.push('JWT_EXPIRES_IN must be a valid duration');
      jwtExpiresIn = '';
    } else {
      jwtExpiresIn = environment.JWT_EXPIRES_IN.trim();
    }
  }
  if (!/^\d+(?:ms|s|m|h|d|w|y)$/.test(jwtExpiresIn)) {
    errors.push('JWT_EXPIRES_IN must be a valid duration');
  }

  const groqApiKey = requiredString(environment, 'GROQ_API_KEY', errors);
  if (
    groqApiKey !== '' &&
    [...groqApiKey].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return /\s/.test(character) || codePoint < 32 || codePoint === 127;
    })
  ) {
    errors.push('GROQ_API_KEY has an invalid local format');
  }

  const groqModel = requiredString(
    environment,
    'GROQ_TRANSCRIPTION_MODEL',
    errors,
  );
  if (groqModel !== '' && !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(groqModel)) {
    errors.push('GROQ_TRANSCRIPTION_MODEL has an invalid local format');
  }

  const passwordResetEnabled = boolean(
    environment,
    'PASSWORD_RESET_ENABLED',
    errors,
    false,
  );
  const brevoApiKey = optionalString(environment, 'BREVO_API_KEY');
  const emailFrom = optionalString(environment, 'EMAIL_FROM');
  const emailFromName =
    optionalString(environment, 'EMAIL_FROM_NAME') ?? 'Ditado';

  if (passwordResetEnabled) {
    if (brevoApiKey === undefined) {
      errors.push('BREVO_API_KEY is required when password reset is enabled');
    }
    if (emailFrom === undefined || !isEmail(emailFrom)) {
      errors.push(
        'EMAIL_FROM must be a valid email when password reset is enabled',
      );
    }
    if (appUrl === undefined || !isHttpUrl(appUrl)) {
      errors.push('APP_URL must be a valid URL when password reset is enabled');
    }
  } else if (emailFrom !== undefined && !isEmail(emailFrom)) {
    errors.push('EMAIL_FROM must be a valid email when provided');
  }

  const adminEmail = optionalString(environment, 'ADMIN_EMAIL');
  if (adminEmail !== undefined && !isEmail(adminEmail)) {
    errors.push('ADMIN_EMAIL must be a valid email when provided');
  }

  const result: EnvironmentVariables = {
    NODE_ENV: nodeEnv as NodeEnvironment,
    PORT: integer(environment, 'PORT', errors, {
      defaultValue: 3000,
      min: 1,
      max: 65535,
    }),
    APP_URL: appUrl,
    CORS_ORIGINS: corsOrigins,
    DB_HOST: optionalString(environment, 'DB_HOST') ?? '127.0.0.1',
    DB_PORT: integer(environment, 'DB_PORT', errors, {
      defaultValue: 5432,
      min: 1,
      max: 65535,
    }),
    DB_NAME: optionalString(environment, 'DB_NAME') ?? 'ditado',
    DB_USER: optionalString(environment, 'DB_USER') ?? 'ditado',
    DB_PASSWORD: requiredString(environment, 'DB_PASSWORD', errors),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    BCRYPT_ROUNDS: integer(environment, 'BCRYPT_ROUNDS', errors, {
      defaultValue: 12,
      min: 10,
      max: 15,
    }),
    GROQ_API_KEY: groqApiKey,
    GROQ_TRANSCRIPTION_MODEL: groqModel,
    PASSWORD_RESET_ENABLED: passwordResetEnabled,
    BREVO_API_KEY: brevoApiKey,
    EMAIL_FROM: emailFrom,
    EMAIL_FROM_NAME: emailFromName,
    ADMIN_NAME: optionalString(environment, 'ADMIN_NAME'),
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD:
      typeof environment.ADMIN_PASSWORD === 'string' &&
      environment.ADMIN_PASSWORD !== ''
        ? environment.ADMIN_PASSWORD
        : undefined,
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: integer(
      environment,
      'RATE_LIMIT_LOGIN_WINDOW_SECONDS',
      errors,
      { defaultValue: 900, min: 1 },
    ),
    RATE_LIMIT_LOGIN_MAX: integer(environment, 'RATE_LIMIT_LOGIN_MAX', errors, {
      defaultValue: 10,
      min: 1,
    }),
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: integer(
      environment,
      'RATE_LIMIT_REGISTER_WINDOW_SECONDS',
      errors,
      { defaultValue: 3600, min: 1 },
    ),
    RATE_LIMIT_REGISTER_MAX: integer(
      environment,
      'RATE_LIMIT_REGISTER_MAX',
      errors,
      { defaultValue: 5, min: 1 },
    ),
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: integer(
      environment,
      'RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS',
      errors,
      { defaultValue: 3600, min: 1 },
    ),
    RATE_LIMIT_FORGOT_PASSWORD_MAX: integer(
      environment,
      'RATE_LIMIT_FORGOT_PASSWORD_MAX',
      errors,
      { defaultValue: 5, min: 1 },
    ),
    RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS: integer(
      environment,
      'RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS',
      errors,
      { defaultValue: 900, min: 1 },
    ),
    RATE_LIMIT_RESET_PASSWORD_MAX: integer(
      environment,
      'RATE_LIMIT_RESET_PASSWORD_MAX',
      errors,
      { defaultValue: 10, min: 1 },
    ),
    RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS: integer(
      environment,
      'RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS',
      errors,
      { defaultValue: 3600, min: 1 },
    ),
    RATE_LIMIT_TRANSCRIPTION_MAX: integer(
      environment,
      'RATE_LIMIT_TRANSCRIPTION_MAX',
      errors,
      { defaultValue: 20, min: 1 },
    ),
  };

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return result;
}
