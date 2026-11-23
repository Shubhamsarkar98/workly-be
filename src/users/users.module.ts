import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), JwtModule.register({})],
  providers: [UsersService, UsersResolver, AccessTokenGuard, RolesGuard],
  exports: [UsersService, AccessTokenGuard, RolesGuard],
})
export class UsersModule {}
