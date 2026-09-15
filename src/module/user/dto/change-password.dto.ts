import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current account password',
    example: 'OldP@ssw0rd123',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New account password (min 8 characters)',
    example: 'NewSecureP@ssw0rd456',
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of new account password',
    example: 'NewSecureP@ssw0rd456',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
