import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(20)
  refreshToken: string;
}
