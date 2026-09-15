import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'a1b2c3d4...' })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token!: string;
}
