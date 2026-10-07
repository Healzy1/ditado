import { ValidationPipe } from '@nestjs/common';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('authentication DTOs', () => {
  it('normalizes registration fields before validation', async () => {
    await expect(
      pipe.transform(
        {
          name: ' Ana ',
          email: ' ANA@EXAMPLE.TEST ',
          password: 'senha-descartavel-123',
        },
        { type: 'body', metatype: RegisterDto },
      ),
    ).resolves.toMatchObject({ name: 'Ana', email: 'ana@example.test' });
  });

  it('rejects role and invalid login bodies as 400 validation failures', async () => {
    await expect(
      pipe.transform(
        {
          name: 'Ana',
          email: 'ana@example.test',
          password: 'senha-descartavel-123',
          role: 'admin',
        },
        { type: 'body', metatype: RegisterDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        { password: 'senha-descartavel-123' },
        { type: 'body', metatype: LoginDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
