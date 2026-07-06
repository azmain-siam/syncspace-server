import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'John Doe' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  @IsEnum(['USER', 'ADMIN'])
  role!: string;
}
