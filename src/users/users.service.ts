import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { UserRole } from '../roles/user-role.enum';
import { User } from './user.entity';

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  findByEmail(email: string) {
    return this.users.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findForLogin(email: string) {
    return this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findActiveById(id: string) {
    return this.users.findOne({ where: { id, active: true } });
  }

  async create(input: CreateUserData) {
    const email = input.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException('Email is already in use');
    }
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new BadRequestException(
        'Password must be at most 72 bytes when encoded as UTF-8',
      );
    }

    const role = await this.roles.findOneBy({ name: input.role });
    if (!role) {
      throw new BadRequestException('The selected role does not exist');
    }

    const user = this.users.create({
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role,
    });

    try {
      return this.publicUser(await this.users.save(user));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async ensureBootstrapAdmin(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.findByEmail(normalizedEmail)) return;
    try {
      await this.create({
        email: normalizedEmail,
        password,
        role: UserRole.ADMIN,
      });
    } catch (error) {
      if (
        error instanceof ConflictException &&
        (await this.findByEmail(normalizedEmail))
      ) {
        return;
      }
      throw error;
    }
  }

  publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      active: user.active,
      createdAt: user.createdAt,
    };
  }
}

