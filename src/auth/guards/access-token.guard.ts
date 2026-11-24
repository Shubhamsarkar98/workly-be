import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';

interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: 'access';
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly sessions: RedisService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = this.getRequest(context);
    const authorization = request.headers?.authorization;
    const match =
      typeof authorization === 'string'
        ? authorization.match(/^Bearer\s+(\S+)$/i)
        : null;
    if (!match) throw new UnauthorizedException('Bearer access token required');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(match[1], {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }

    if (payload.type !== 'access' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException('Access token is invalid or expired');
    }

    const sessionIsActive = await this.sessions.hasSession(payload.sid);
    if (!sessionIsActive) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    const user = await this.users.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException('User is inactive or missing');

    request.user = user;
    return true;
  }

  private getRequest(context: ExecutionContext) {
    if (context.getType<GqlContextType>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }
}
