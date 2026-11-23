import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Injectable()
export class BootstrapAdmin implements OnModuleInit {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config
      .get<string>('BOOTSTRAP_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    const password = this.config.get<string>('BOOTSTRAP_ADMIN_PASSWORD');
    if (!email && !password) return;
    if (
      !email ||
      !password ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw new Error(
        'Set both bootstrap admin variables; password must be 12 to 72 UTF-8 bytes',
      );
    }
    await this.users.ensureBootstrapAdmin(email, password);
  }
}
