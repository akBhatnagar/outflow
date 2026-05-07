import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset-password email link' })
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  password!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the verification email link' })
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}
