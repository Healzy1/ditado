import { ConfigService } from '@nestjs/config';
import { createTypeOrmOptions } from './typeorm.config';
import type { EnvironmentVariables } from './environment';

function configFor(nodeEnv: EnvironmentVariables['NODE_ENV']) {
  return new ConfigService<EnvironmentVariables, true>({
    NODE_ENV: nodeEnv,
    DB_HOST: 'db.example.test',
    DB_PORT: 5432,
    DB_NAME: 'ditado',
    DB_USER: 'ditado',
    DB_PASSWORD: 'not-a-secret',
  } as EnvironmentVariables);
}

describe('createTypeOrmOptions', () => {
  it('enables schema synchronization only in development', () => {
    expect(createTypeOrmOptions(configFor('development')).synchronize).toBe(
      true,
    );
    expect(createTypeOrmOptions(configFor('test')).synchronize).toBe(false);
    expect(createTypeOrmOptions(configFor('production')).synchronize).toBe(
      false,
    );
  });

  it('uses database values from validated configuration', () => {
    const options = createTypeOrmOptions(configFor('development'));

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.example.test',
      port: 5432,
      database: 'ditado',
      username: 'ditado',
    });
  });
});
