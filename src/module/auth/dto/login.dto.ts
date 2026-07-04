import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'test@gmail.com' })
  @IsString()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  password!: string;
}
