import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseOptions } from './config/database.config';
import { environmentSchema } from './config/environment.schema';
import { HealthController } from './health.controller';
import { RedisModule } from './redis/redis.module';
import { BootstrapAdmin } from './users/bootstrap-admin.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: environmentSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseOptions,
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
