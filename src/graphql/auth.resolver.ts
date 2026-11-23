import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import {
  AuthTokens,
  LoginInput,
  LogoutResult,
  RefreshInput,
  UserProfile,
} from './graphql.types';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Mutation(() => AuthTokens)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Args('input') input: LoginInput) {
    return this.auth.login(input.email, input.password);
  }

  @Mutation(() => AuthTokens)
  refresh(@Args('input') input: RefreshInput) {
    return this.auth.refresh(input.refreshToken);
  }

  @Mutation(() => LogoutResult)
  logout(@Args('input') input: RefreshInput) {
    return this.auth.logout(input.refreshToken);
  }

  @Query(() => UserProfile)
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() user: User) {
    return this.users.publicUser(user);
  }
}
