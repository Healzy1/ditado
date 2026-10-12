import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';
import type { PublicUser } from '../../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: PublicUser }>();

    return request.user?.role === UserRole.ADMIN;
  }
}
