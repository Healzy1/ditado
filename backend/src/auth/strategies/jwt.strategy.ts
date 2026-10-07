import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { EnvironmentVariables } from '../../config/environment';
import { PublicUser, UsersService } from '../../users/users.service';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    if (!payload || typeof payload.id !== 'string') {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.usersService.toPublicUser(user);
  }
}
