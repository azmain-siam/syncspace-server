import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceRole } from '../enums/workspace-role.enum';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: WorkspaceRole.MEMBER, enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
