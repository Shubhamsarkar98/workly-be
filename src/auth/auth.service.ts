import { UnauthorizedException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly sessions: RedisService,
  ) {}

  async login(email: string, password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const user = await this.users.findForLogin(email);
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const sessionId = randomUUID();
    const refreshId = randomUUID();
    const tokens = await this.createTokens(user, sessionId, refreshId);
    await this.sessions.createSession(
      sessionId,
      refreshId,
      this.refreshTtlSeconds,
    );
    return tokens;
  }

  async refresh(rawToken: string) {
    const payload = await this.verifyRefreshToken(rawToken);
    const user = await this.users.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const nextRefreshId = randomUUID();
    const tokens = await this.createTokens(user, payload.sid, nextRefreshId);
    const rotated = await this.sessions.rotateSession(
      payload.sid,
      payload.jti,
      nextRefreshId,
      this.refreshTtlSeconds,
    );
    if (!rotated) {
      throw new UnauthorizedException(
        'Refresh token was already used or revoked',
      );
    }
    return tokens;
  }

  async logout(rawToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.verifyRefreshToken(rawToken);
    } catch {
      return { success: true };
    }

    await this.sessions.revokeSession(payload.sid, payload.jti);
    return { success: true };
  }

  private async verifyRefreshToken(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.sid ||
        !payload.jti
      ) {
        throw new Error('Unexpected refresh token payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private async createTokens(user: User, sessionId: string, refreshId: string) {
    const accessExpiresIn = this.config.getOrThrow<string>('JWT_ACCESS_TTL');
    const refreshExpiresIn = this.refreshTtlSeconds;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role.name,
          sid: sessionId,
          type: 'access',
        },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
        },
      ),
      this.jwt.signAsync(
        { sub: user.id, sid: sessionId, jti: refreshId, type: 'refresh' },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
    };
  }

  private get refreshTtlSeconds() {
    return this.config.get<number>('JWT_REFRESH_TTL_SECONDS', 604800);
  }
}
