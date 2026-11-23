import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseOptions } from './config/database.config';
import { environmentSchema } from './config/environment.schema';
import { HealthController } from './health.controller';
import { RedisModule } from './redis/redis.module';
import { BootstrapAdmin } from './users/bootstrap-admin.service';
import { UsersModule } from './users/users.module';
import { GraphqlAwareThrottlerGuard } from './graphql/graphql-throttler.guard';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      context: ({ req, res }) => ({ req, res }),
      graphiql: process.env.NODE_ENV !== 'production',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    RedisModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    BootstrapAdmin,
    { provide: APP_GUARD, useClass: GraphqlAwareThrottlerGuard },
  ],
})
export class AppModule {}
