import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment';

@Injectable()
export class PasswordResetEmailService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async send(email: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', { infer: true });
    const resetUrl = new URL('/reset-password', appUrl);
    resetUrl.searchParams.set('token', token);

    let response: Response;
    try {
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.config.get('BREVO_API_KEY', { infer: true }),
        },
        body: JSON.stringify({
          sender: {
            email: this.config.get('EMAIL_FROM', { infer: true }),
            name: this.config.get('EMAIL_FROM_NAME', { infer: true }),
          },
          to: [{ email }],
          subject: 'Redefinição de senha',
          textContent: `Use o link para redefinir sua senha: ${resetUrl.toString()}`,
        }),
      });
    } catch {
      throw new Error('Unable to send password reset email');
    }

    if (!response.ok) {
      throw new Error('Unable to send password reset email');
    }
  }
}
