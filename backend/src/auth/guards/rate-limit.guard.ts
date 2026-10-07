import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { EnvironmentVariables } from '../../config/environment';
import { isEmail, normalizeEmail } from '../../users/user-normalization';
import { RateLimitService } from '../rate-limit.service';
import { RATE_LIMIT_KIND, type RateLimitKind } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const kind = this.reflector.getAllAndOverride<RateLimitKind>(
      RATE_LIMIT_KIND,
      [context.getHandler(), context.getClass()],
    );
    if (!kind) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const origin = request.ip || 'unknown';
    const key = this.keyFor(kind, origin, request.body);
    if (!key) {
      return true;
    }

    const retryAfter = this.rateLimitService.consume(
      key,
      this.config.get(
        kind === 'login' ? 'RATE_LIMIT_LOGIN_MAX' : 'RATE_LIMIT_REGISTER_MAX',
        { infer: true },
      ),
      this.config.get(
        kind === 'login'
          ? 'RATE_LIMIT_LOGIN_WINDOW_SECONDS'
          : 'RATE_LIMIT_REGISTER_WINDOW_SECONDS',
        { infer: true },
      ),
    );
    if (retryAfter === null) {
      return true;
    }

    response.setHeader('Retry-After', String(retryAfter));
    throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }

  private keyFor(
    kind: RateLimitKind,
    origin: string,
    body: unknown,
  ): string | undefined {
    if (kind === 'register') {
      return `register:${origin}`;
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return undefined;
    }
    const email = (body as Record<string, unknown>).email;
    if (typeof email !== 'string') {
      return undefined;
    }
    const normalizedEmail = normalizeEmail(email);
    return isEmail(normalizedEmail)
      ? `login:${origin}:${normalizedEmail}`
      : undefined;
  }
}
