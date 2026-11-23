import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../roles/user-role.enum';
import { UsersService } from './users.service';
import { CreateUserInput, UserProfile } from '../graphql/graphql.types';

@Resolver()
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Mutation(() => UserProfile)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createUser(@Args('input') input: CreateUserInput) {
    return this.users.create(input);
  }
}
