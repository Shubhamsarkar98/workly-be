import { DataSource } from 'typeorm';
import 'dotenv/config';
import { User } from '../users/user.entity';
import { InitialAuthSchema1710000000000 } from './migrations/1710000000000-InitialAuthSchema';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: [InitialAuthSchema1710000000000],
  synchronize: false,
});
