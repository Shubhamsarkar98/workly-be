import { UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

const SWAP_SESSION = `
  local current = redis.call('GET', KEYS[1])
  if current ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
`;
const DELETE_SESSION = `
  local current = redis.call('GET', KEYS[1])
  if current ~= ARGV[1] then return 0 end
  return redis.call('DEL', KEYS[1])
`;

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
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      // Same response for unknown email and wrong password avoids account enumeration.
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const sessionId = randomUUID();
    const refreshId = randomUUID();
    const ttl = Number(this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800);
    await this.redis.client.set(this.sessionKey(sessionId), refreshId, 'EX', ttl);
    return this.tokens(user, sessionId, refreshId);
  }

  async refresh(rawToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(rawToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    if (payload.type !== 'refresh' || !payload.sub || !payload.sid || !payload.jti) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    const user = await this.users.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException('Refresh token is invalid or expired');
    const nextId = randomUUID();
    const ttl = Number(this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800);
    const tokenPair = await this.tokens(user, payload.sid, nextId);
    const swapped = await this.redis.client.eval(
      SWAP_SESSION, 1, this.sessionKey(payload.sid), payload.jti, nextId, String(ttl),
    );
    if (swapped !== 1) throw new UnauthorizedException('Refresh token was already used or revoked');
    return tokenPair;
  }

  async logout(rawToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(rawToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
      if (payload.type === 'refresh' && payload.sid && payload.jti) {
        await this.redis.client.eval(DELETE_SESSION, 1, this.sessionKey(payload.sid), payload.jti);
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
    const refreshTtl = Number(this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, sid: sessionId, type: 'access' },
        { secret: accessSecret, expiresIn: accessExpiresIn as any }),
      this.jwt.signAsync({ sub: user.id, sid: sessionId, jti: refreshId, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshTtl }),
    ]);
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessExpiresIn };
  }

  private sessionKey(sessionId: string) { return `keke:auth:refresh:${sessionId}`; }
}





