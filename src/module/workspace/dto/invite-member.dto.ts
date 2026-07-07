import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { WorkspaceRole } from '../enums/workspace-role.enum';

export class InviteMemberDto {
  @ApiProperty({ example: 'John Doe' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'USER', enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
