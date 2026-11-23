import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { User } from './users/user.entity';
import { BootstrapAdmin } from './users/bootstrap-admin.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './health.controller';

function validateEnvironment(env: Record<string, string | undefined>) {
  for (const key of ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!env[key]) throw new Error(`${key} is required`);
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if ((env[key]?.length ?? 0) < 32) throw new Error(`${key} must be at least 32 characters`);
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('JWT secrets must be different');
  const refreshTtl = Number(env.JWT_REFRESH_TTL_SECONDS ?? 604800);
  if (!Number.isSafeInteger(refreshTtl) || refreshTtl < 60) throw new Error('JWT_REFRESH_TTL_SECONDS must be an integer of at least 60');
  return env;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: [User],
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    RedisModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [BootstrapAdmin, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

