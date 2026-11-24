import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';

@Entity({ name: 'users' })
@Index('users_email_unique', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  // Never return passwordHash from an API response.
  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string;

  @ManyToOne(() => Role, { eager: true, nullable: false })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
