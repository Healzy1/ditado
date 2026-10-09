import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment';
import { PasswordResetEmailService } from './password-reset-email.service';

describe('PasswordResetEmailService', () => {
  const config = new ConfigService<EnvironmentVariables, true>({
    APP_URL: 'http://localhost:5173',
    BREVO_API_KEY: 'test-key',
    EMAIL_FROM: 'no-reply@example.test',
    EMAIL_FROM_NAME: 'Ditado',
  } as EnvironmentVariables);

  afterEach(() => jest.restoreAllMocks());

  it('sends the configured sender and a reset link through Brevo', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));

    await new PasswordResetEmailService(config).send(
      'ana@example.test',
      'controlled-token',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': 'test-key',
        },
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        body: JSON.stringify({
          sender: { email: 'no-reply@example.test', name: 'Ditado' },
          to: [{ email: 'ana@example.test' }],
          subject: 'Redefinição de senha',
          textContent:
            'Use o link para redefinir sua senha: http://localhost:5173/reset-password?token=controlled-token',
        }),
      }),
    );
  });

  it('does not expose provider responses when delivery fails', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('provider detail', { status: 500 }));

    await expect(
      new PasswordResetEmailService(config).send('ana@example.test', 'token'),
    ).rejects.toThrow('Unable to send password reset email');
  });
});
