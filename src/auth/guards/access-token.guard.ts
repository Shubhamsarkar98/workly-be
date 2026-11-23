import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request =
      context.getType<GqlContextType>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Bearer access token required');
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'access' || !payload.sub || !payload.sid)
        throw new Error('Invalid token type');
      // Access tokens stop working as soon as logout deletes this session from Redis.
      if (!(await this.redis.hasSession(payload.sid)))
        throw new Error('Session revoked');
      const user = await this.users.findActiveById(payload.sub);
      if (!user) throw new Error('User is inactive or missing');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Access token is invalid, expired, or revoked',
      );
    }
  }
}
