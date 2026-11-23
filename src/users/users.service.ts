import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { UserRole } from '../roles/user-role.enum';
import { Role } from '../roles/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';

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

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException('Email is already in use');
    }
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException(
        'Password must be at most 72 bytes when encoded as UTF-8',
      );
    }

    const role = await this.roles.findOneBy({ name: dto.role });
    if (!role)
      throw new BadRequestException('The selected role does not exist');

    const user = this.users.create({
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role,
    });

    try {
      const saved = await this.users.save(user);
      return this.publicUser(saved);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === '23505'
      ) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async ensureBootstrapAdmin(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail && !password) return;
    if (!normalizedEmail || !password || password.length < 12) {
      throw new Error(
        'Set both bootstrap admin variables; password must be at least 12 characters',
      );
    }
    if (await this.findByEmail(normalizedEmail)) return;
    await this.create({
      email: normalizedEmail,
      password,
      role: UserRole.ADMIN,
    });
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
