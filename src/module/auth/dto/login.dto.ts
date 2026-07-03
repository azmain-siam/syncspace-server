import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'test@gmail.com' })
  email!: string;

  @ApiProperty({ example: '123456' })
  password!: string;
}
