import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AccessTokenGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
}
