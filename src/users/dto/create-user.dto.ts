import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
