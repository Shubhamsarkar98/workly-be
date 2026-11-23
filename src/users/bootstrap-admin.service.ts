import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BootstrapAdmin implements OnModuleInit {
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}

  async onModuleInit() {
    const email = this.config.get<string>('BOOTSTRAP_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('BOOTSTRAP_ADMIN_PASSWORD');
    if (!email && !password) return;
    if (!email || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Set both bootstrap admin variables; password must be 12 to 72 UTF-8 bytes');
    }
    const repo = this.db.getRepository(User);
    if (await repo.findOne({ where: { email } })) return;
    await repo.save(repo.create({ email, passwordHash: await bcrypt.hash(password, 12), role: UserRole.ADMIN }));
  }
}


