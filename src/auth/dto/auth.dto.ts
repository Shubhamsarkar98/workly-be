import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@keke.local' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({
    example: 'your-secure-password',
    minLength: 12,
    maxLength: 72,
    writeOnly: true,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'A refresh token returned by login or refresh.' })
  @IsString()
  @MinLength(20)
  refreshToken: string;
}

export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: string;
  @ApiProperty({ example: '15m' }) expiresIn: string;
}
