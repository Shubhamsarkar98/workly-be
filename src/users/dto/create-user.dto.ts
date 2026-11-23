import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../roles/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'manager@keke.local' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({
    example: 'a-secure-password',
    minLength: 12,
    maxLength: 72,
    writeOnly: true,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYER })
  @IsEnum(UserRole)
  role: UserRole;
}
