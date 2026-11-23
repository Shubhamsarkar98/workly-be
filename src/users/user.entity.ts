import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  SUBADMIN = 'SUBADMIN',
  EMPLOYER = 'EMPLOYER',
  MANAGER = 'MANAGER',
}

@Entity({ name: 'users' })
@Index('users_email_unique', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  // Never return passwordHash from an API response.
  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
