import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from './decorators/current-user.decorator';
import { AccessTokenGuard } from './guards/access-token.guard';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() user: User) { return this.users.publicUser(user); }
}

