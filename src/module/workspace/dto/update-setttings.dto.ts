import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkspaceVisibility } from '../enums/workspace-visibility.enum';

export class UpdateWorkspaceSettingsDto {
  @ApiProperty({ example: 'My Workspace' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'This is my workspace' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    example: WorkspaceVisibility.PUBLIC,
    enum: WorkspaceVisibility,
  })
  @IsOptional()
  @IsEnum(WorkspaceVisibility)
  visibility?: WorkspaceVisibility;
}
