import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { UserRole } from '../roles/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AccessTokenGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an account with one of the Keke roles' })
  @ApiCreatedResponse({ type: UserSummaryDto })
  @ApiUnauthorizedResponse({ description: 'A valid access token is required' })
  @ApiForbiddenResponse({ description: 'Only an admin can create accounts' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
