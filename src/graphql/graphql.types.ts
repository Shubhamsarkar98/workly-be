import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../roles/user-role.enum';

registerEnumType(UserRole, { name: 'UserRole' });

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Field()
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}

@InputType()
export class RefreshInput {
  @Field()
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Field()
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role!: UserRole;
}

@ObjectType()
export class AuthTokens {
  @Field() accessToken!: string;
  @Field() refreshToken!: string;
  @Field() tokenType!: string;
  @Field() expiresIn!: string;
}

@ObjectType()
export class LogoutResult {
  @Field() success!: boolean;
}

@ObjectType()
export class UserProfile {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field(() => UserRole) role!: UserRole;
  @Field() active!: boolean;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
