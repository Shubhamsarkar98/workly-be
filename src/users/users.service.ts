import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findForLogin(email: string) {
    return this.repository.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findActiveById(id: string) {
    return this.repository.findOne({ where: { id, active: true } });
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) throw new ConflictException('Email is already in use');
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 bytes when encoded as UTF-8');
    }
    const user = this.repository.create({ email, passwordHash: await bcrypt.hash(dto.password, 12), role: dto.role });
    try {
      const saved = await this.repository.save(user);
      return this.publicUser(saved);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === '23505') {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async ensureBootstrapAdmin(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail && !password) return;
    if (!normalizedEmail || !password || password.length < 12) {
      throw new Error('Set both bootstrap admin variables; password must be at least 12 characters');
    }
    if (await this.findByEmail(normalizedEmail)) return;
    await this.create({ email: normalizedEmail, password, role: UserRole.ADMIN });
  }

  publicUser(user: User) {
    return { id: user.id, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt };
  }
}



