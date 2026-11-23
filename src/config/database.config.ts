import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.getOrThrow<string>('DB_USER'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_NAME'),
    autoLoadEntities: true,
    synchronize: false,
  };
}
