import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type SessionMode = 'redis' | 'memory';
type MemorySession = { refreshId: string; expiresAt: number };

const ROTATE_SESSION = `
  local current = redis.call('GET', KEYS[1])
  if current ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
`;
const REVOKE_SESSION = `
  local current = redis.call('GET', KEYS[1])
  if current ~= ARGV[1] then return 0 end
  return redis.call('DEL', KEYS[1])
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly memorySessions = new Map<string, MemorySession>();
  private mode: SessionMode = 'redis';
  private cleanupTimer: NodeJS.Timeout | undefined;
  readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      connectTimeout: 5_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (attempt) =>
        attempt > 3 ? null : Math.min(attempt * 300, 900),
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      await this.client.ping();
      this.mode = 'redis';
    } catch (error) {
      this.client.disconnect();
      const useMemoryFallback =
        this.config.get('NODE_ENV') === 'development' &&
        this.config.get('REDIS_FALLBACK') === 'memory';

      if (!useMemoryFallback) {
        throw new Error(
          'Redis is unavailable. Start Redis, or enable the development memory fallback.',
          { cause: error },
        );
      }

      this.mode = 'memory';
      this.cleanupTimer = setInterval(
        () => this.removeExpiredSessions(),
        60_000,
      );
      this.cleanupTimer.unref();
      this.logger.warn(
        'Redis is offline; using in-memory sessions for development. Sessions will be lost on restart.',
      );
    }
  }

  async createSession(
    sessionId: string,
    refreshId: string,
    ttlSeconds: number,
  ) {
    if (this.mode === 'memory') {
      this.memorySessions.set(sessionId, {
        refreshId,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    await this.client.set(
      this.sessionKey(sessionId),
      refreshId,
      'EX',
      ttlSeconds,
    );
  }

  async rotateSession(
    sessionId: string,
    currentId: string,
    nextId: string,
    ttlSeconds: number,
  ) {
    if (this.mode === 'memory') {
      const current = this.memorySessions.get(sessionId);
      if (
        !current ||
        current.expiresAt <= Date.now() ||
        current.refreshId !== currentId
      ) {
        this.memorySessions.delete(sessionId);
        return false;
      }
      this.memorySessions.set(sessionId, {
        refreshId: nextId,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return true;
    }
    const result = await this.client.eval(
      ROTATE_SESSION,
      1,
      this.sessionKey(sessionId),
      currentId,
      nextId,
      String(ttlSeconds),
    );
    return result === 1;
  }

  async revokeSession(sessionId: string, refreshId: string) {
    if (this.mode === 'memory') {
      const current = this.memorySessions.get(sessionId);
      if (current?.refreshId !== refreshId) return false;
      this.memorySessions.delete(sessionId);
      return true;
    }
    const result = await this.client.eval(
      REVOKE_SESSION,
      1,
      this.sessionKey(sessionId),
      refreshId,
    );
    return result === 1;
  }

  async hasSession(sessionId: string) {
    if (this.mode === 'memory') {
      const current = this.memorySessions.get(sessionId);
      if (!current) return false;
      if (current.expiresAt <= Date.now()) {
        this.memorySessions.delete(sessionId);
        return false;
      }
      return true;
    }
    return (await this.client.exists(this.sessionKey(sessionId))) === 1;
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.mode === 'redis' && this.client.status === 'ready') {
      await this.client.quit();
      return;
    }
    this.client.disconnect();
  }

  private sessionKey(sessionId: string) {
    return `keke:auth:refresh:${sessionId}`;
  }

  private removeExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.memorySessions) {
      if (session.expiresAt <= now) this.memorySessions.delete(sessionId);
    }
  }
}
