import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthSchema1710000000000 implements MigrationInterface {
  name = 'InitialAuthSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query("CREATE TYPE user_role AS ENUM ('ADMIN', 'SUBADMIN', 'EMPLOYER', 'MANAGER')");
    await queryRunner.query(`CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      email varchar(320) NOT NULL,
      password_hash varchar NOT NULL,
      role user_role NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE UNIQUE INDEX users_email_unique ON users (email)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TYPE user_role');
  }
}
