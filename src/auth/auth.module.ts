import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { UsersController } from '../users/users.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController, UsersController],
  providers: [AuthService, AccessTokenGuard, RolesGuard],
  exports: [JwtModule, AccessTokenGuard, RolesGuard],
})
export class AuthModule {}
