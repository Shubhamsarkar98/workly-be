import { UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly redis: RedisService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findForLogin(email);
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      // Same response for unknown email and wrong password avoids account enumeration.
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const sessionId = randomUUID();
    const refreshId = randomUUID();
    const ttl = Number(
      this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800,
    );
    await this.redis.createSession(sessionId, refreshId, ttl);

    return this.tokens(user, sessionId, refreshId);
  }

  async refresh(rawToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    if (
      payload.type !== 'refresh' ||
      !payload.sub ||
      !payload.sid ||
      !payload.jti
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    const user = await this.users.findActiveById(payload.sub);
    if (!user)
      throw new UnauthorizedException('Refresh token is invalid or expired');
    const nextId = randomUUID();
    const ttl = Number(
      this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800,
    );
    const tokenPair = await this.tokens(user, payload.sid, nextId);
    const swapped = await this.redis.rotateSession(
      payload.sid,
      payload.jti,
      nextId,
      ttl,
    );
    if (!swapped)
      throw new UnauthorizedException(
        'Refresh token was already used or revoked',
      );
    return tokenPair;
  }

  async logout(rawToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      if (payload.type === 'refresh' && payload.sid && payload.jti) {
        await this.redis.revokeSession(payload.sid, payload.jti);
      }
    } catch {
      // Logout is idempotent: an expired or invalid token is already unusable.
    }
    return { success: true };
  }

  private async tokens(user: User, sessionId: string, refreshId: string) {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = Number(
      this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800,
    );
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role.name,
          sid: sessionId,
          type: 'access',
        },
        { secret: accessSecret, expiresIn: accessExpiresIn as any },
      ),
      this.jwt.signAsync(
        { sub: user.id, sid: sessionId, jti: refreshId, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshTtl },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
    };
  }
}
