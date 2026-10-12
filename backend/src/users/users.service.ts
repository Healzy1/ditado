import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { validatePasswordPolicy } from '../auth/password-policy';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { UserRole } from '../common/enums/user-role.enum';
import type { EnvironmentVariables } from '../config/environment';
import { isEmail, normalizeEmail, normalizeName } from './user-normalization';
import { User } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';

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

  async registerPublicUser(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<PublicUser> {
    const name = normalizeName(input.name);
    const email = normalizeEmail(input.email);
    if (!name || !isEmail(email)) {
      throw new BadRequestException('Invalid registration data');
    }

    try {
      validatePasswordPolicy(input.password);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid password',
      );
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      this.config.get('BCRYPT_ROUNDS', { infer: true }),
    );

    try {
      const user = await this.usersRepository.save(
        this.usersRepository.create({
          name,
          email,
          passwordHash,
          role: UserRole.USER,
        }),
      );
      return this.toPublicUser(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async findByNormalizedEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAllForAdmin(): Promise<AdministrativeUser[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.toAdministrativeUser(user));
  }

  async findOneForAdmin(id: string): Promise<AdministrativeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toAdministrativeUser(user);
  }

  async updateUserByAdmin(
    administratorId: string,
    userId: string,
    input: UpdateUserByAdminDto,
  ): Promise<AdministrativeUser> {
    if (administratorId === userId) {
      throw new ForbiddenException(
        'Administrators must manage their own account through /users/me',
      );
    }

    try {
      return await this.usersRepository.manager.transaction(async (manager) => {
        const administrators = await this.lockAdministrators(manager);
        const user =
          administrators.find((administrator) => administrator.id === userId) ??
          (await manager.findOne(User, {
            where: { id: userId },
            lock: { mode: 'pessimistic_write' },
          }));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const name =
          input.name === undefined ? user.name : normalizeName(input.name);
        const email =
          input.email === undefined ? user.email : normalizeEmail(input.email);
        const role = input.role === undefined ? user.role : input.role;
        const emailChanged = email !== user.email;
        const changed =
          name !== user.name || emailChanged || role !== user.role;

        if (!changed) {
          return this.toAdministrativeUser(user);
        }
        if (
          user.role === UserRole.ADMIN &&
          role !== UserRole.ADMIN &&
          administrators.length === 1
        ) {
          throw new ConflictException('Cannot demote the last administrator');
        }

        user.name = name;
        user.email = email;
        user.role = role;
        const updatedUser = await manager.save(user);
        if (emailChanged) {
          await manager.delete(PasswordResetToken, { userId });
        }
        return this.toAdministrativeUser(updatedUser);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async deleteUserByAdmin(
    administratorId: string,
    userId: string,
  ): Promise<void> {
    if (administratorId === userId) {
      throw new ForbiddenException(
        'Administrators must manage their own account through /users/me',
      );
    }

    await this.usersRepository.manager.transaction(async (manager) => {
      const administrators = await this.lockAdministrators(manager);
      const user =
        administrators.find((administrator) => administrator.id === userId) ??
        (await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        }));
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.role === UserRole.ADMIN && administrators.length === 1) {
        throw new ConflictException('Cannot delete the last administrator');
      }

      await manager.remove(user);
    });
  }

  async updateOwnProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<PublicUser> {
    try {
      return await this.usersRepository.manager.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) {
          throw new UnauthorizedException();
        }

        const name =
          input.name === undefined ? user.name : normalizeName(input.name);
        const email =
          input.email === undefined ? user.email : normalizeEmail(input.email);
        const emailChanged = email !== user.email;
        const profileChanged = name !== user.name || emailChanged;

        if (!profileChanged) {
          return this.toPublicUser(user);
        }

        user.name = name;
        user.email = email;
        const updatedUser = await manager.save(user);
        if (emailChanged) {
          await manager.delete(PasswordResetToken, { userId });
        }
        return this.toPublicUser(updatedUser);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async changeOwnPassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<void> {
    await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException();
      }
      if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
        throw new BadRequestException('Invalid current password');
      }
      try {
        validatePasswordPolicy(input.newPassword);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid password',
        );
      }

      user.passwordHash = await bcrypt.hash(
        input.newPassword,
        this.config.get('BCRYPT_ROUNDS', { infer: true }),
      );
      await manager.save(user);
      await manager.delete(PasswordResetToken, { userId });
    });
  }

  async deleteOwnAccount(
    userId: string,
    input: DeleteAccountDto,
  ): Promise<void> {
    await this.usersRepository.manager.transaction(async (manager) => {
      const administrators = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.role = :role', { role: UserRole.ADMIN })
        .orderBy('user.id', 'ASC')
        .getMany();
      const user =
        administrators.find((administrator) => administrator.id === userId) ??
        (await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        }));
      if (!user) {
        throw new UnauthorizedException();
      }
      if (!(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new BadRequestException('Invalid current password');
      }
      if (user.role === UserRole.ADMIN && administrators.length === 1) {
        throw new ConflictException('Cannot delete the last administrator');
      }

      await manager.remove(user);
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  toAdministrativeUser(user: User): AdministrativeUser {
    return {
      ...this.toPublicUser(user),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async lockAdministrators(
    manager: Repository<User>['manager'],
  ): Promise<User[]> {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .where('user.role = :role', { role: UserRole.ADMIN })
      .orderBy('user.id', 'ASC')
      .getMany();
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

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AdministrativeUser extends PublicUser {
  createdAt: Date;
  updatedAt: Date;
}
