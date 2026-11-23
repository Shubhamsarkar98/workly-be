import { DataSource } from 'typeorm';
import 'dotenv/config';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { InitialAuthSchema1710000000000 } from './migrations/1710000000000-InitialAuthSchema';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Role],
  migrations: [InitialAuthSchema1710000000000],
  synchronize: false,
});
