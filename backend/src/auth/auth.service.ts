import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import type { EnvironmentVariables } from '../config/environment';
import { User } from '../users/entities/user.entity';
import { normalizeEmail } from '../users/user-normalization';
import { PublicUser, UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetEmailService } from './email/password-reset-email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { validatePasswordPolicy } from './password-policy';

export interface JwtPayload {
  id: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokens: Repository<PasswordResetToken>,
    private readonly passwordResetEmail: PasswordResetEmailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser }> {
    return { user: await this.usersService.registerPublicUser(dto) };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: PublicUser; accessToken: string }> {
    const user = await this.usersService.findByNormalizedEmail(
      normalizeEmail(dto.email),
    );
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = this.usersService.toPublicUser(user);
    return {
      user: publicUser,
      accessToken: await this.jwtService.signAsync({
        id: user.id,
        role: user.role,
      } satisfies JwtPayload),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    this.ensurePasswordResetEnabled();

    const user = await this.usersService.findByNormalizedEmail(
      normalizeEmail(dto.email),
    );
    if (user) {
      const issued = await this.passwordResetTokens.manager.transaction(
        async (manager) => {
          const lockedUser = await manager.findOne(User, {
            where: { id: user.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!lockedUser) {
            return undefined;
          }
          const token = randomBytes(32).toString('base64url');
          const tokenHash = this.hashResetToken(token);
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

          await manager.delete(PasswordResetToken, { userId: lockedUser.id });
          await manager.save(
            manager.create(PasswordResetToken, {
              tokenHash,
              expiresAt,
              userId: lockedUser.id,
            }),
          );
          return { email: lockedUser.email, token };
        },
      );

      if (issued) {
        try {
          await this.passwordResetEmail.send(issued.email, issued.token);
        } catch {
          this.logger.error('Unable to send password reset email');
        }
      }
    }

    return {
      message:
        'Se houver uma conta associada a este e-mail, serão enviadas instruções para redefinição da senha.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    this.ensurePasswordResetEnabled();

    try {
      validatePasswordPolicy(dto.newPassword);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid password',
      );
    }
    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      this.config.get('BCRYPT_ROUNDS', { infer: true }),
    );
    const tokenHash = this.hashResetToken(dto.token);

    await this.passwordResetTokens.manager.transaction(async (manager) => {
      const consumed = await manager
        .createQueryBuilder()
        .delete()
        .from(PasswordResetToken)
        .where('"tokenHash" = :tokenHash', { tokenHash })
        .andWhere('"expiresAt" > CURRENT_TIMESTAMP')
        .returning('"userId"')
        .execute();
      const rawUserId = this.returningUserId(consumed);
      if (typeof rawUserId !== 'string') {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      const updated = await manager.update(
        User,
        { id: rawUserId },
        { passwordHash },
      );
      if (updated.affected !== 1) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }
      await manager.delete(PasswordResetToken, { userId: rawUserId });
    });
  }

  private ensurePasswordResetEnabled(): void {
    if (!this.config.get('PASSWORD_RESET_ENABLED', { infer: true })) {
      throw new ForbiddenException(
        'Password reset is not available in this environment',
      );
    }
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private returningUserId(result: unknown): unknown {
    if (!result || typeof result !== 'object' || !('raw' in result)) {
      return undefined;
    }
    const raw = (result as Record<string, unknown>)['raw'];
    if (!Array.isArray(raw)) {
      return undefined;
    }
    const rows: unknown[] = raw;
    const firstRow = rows[0];
    return firstRow && typeof firstRow === 'object' && 'userId' in firstRow
      ? (firstRow as Record<string, unknown>)['userId']
      : undefined;
  }
}
