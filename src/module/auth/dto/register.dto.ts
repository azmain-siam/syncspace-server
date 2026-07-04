import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'test@gmail.com' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ example: '12345612322' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}
