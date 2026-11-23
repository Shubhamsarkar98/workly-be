import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthResolver } from '../graphql/auth.resolver';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  providers: [AuthService, AuthResolver],
})
export class AuthModule {}
