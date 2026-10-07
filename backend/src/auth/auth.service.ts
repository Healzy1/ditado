import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { normalizeEmail } from '../users/user-normalization';
import { PublicUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  id: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
}
