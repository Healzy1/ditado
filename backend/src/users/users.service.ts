import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { validatePasswordPolicy } from '../auth/password-policy';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { isEmail, normalizeEmail, normalizeName } from './user-normalization';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async ensureFirstAdmin(): Promise<{ created: boolean }> {
    const rawName = this.config.get('ADMIN_NAME', { infer: true });
    const rawEmail = this.config.get('ADMIN_EMAIL', { infer: true });
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });

    if (!rawName || !rawEmail || !password) {
      throw new Error(
        'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set to run the bootstrap',
      );
    }

    const name = normalizeName(rawName);
    const email = normalizeEmail(rawEmail);
    if (!name) {
      throw new Error('ADMIN_NAME cannot be empty');
    }
    if (!isEmail(email)) {
      throw new Error('ADMIN_EMAIL must be a valid email');
    }

    validatePasswordPolicy(password);

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      return this.handleExistingAdmin(existing);
    }

    const passwordHash = await bcrypt.hash(
      password,
      this.config.get('BCRYPT_ROUNDS', { infer: true }),
    );

    try {
      await this.usersRepository.save(
        this.usersRepository.create({
          name,
          email,
          passwordHash,
          role: UserRole.ADMIN,
        }),
      );
      return { created: true };
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const racedUser = await this.usersRepository.findOne({
        where: { email },
      });
      if (!racedUser) {
        throw error;
      }
      return this.handleExistingAdmin(racedUser);
    }
  }

  private handleExistingAdmin(user: User): { created: false } {
    if (user.role === UserRole.ADMIN) {
      return { created: false };
    }
    throw new Error(
      'ADMIN_EMAIL already belongs to a non-admin account and will not be promoted',
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
