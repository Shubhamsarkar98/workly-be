import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../roles/user-role.enum';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request =
      context.getType<GqlContextType>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    if (!roles.includes(request.user?.role?.name))
      throw new ForbiddenException('Your role cannot perform this action');
    return true;
  }
}
