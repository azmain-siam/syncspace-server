import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  @IsEnum(WorkspaceRole, { message: 'Invalid workspace role' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: WorkspaceRole;
}
