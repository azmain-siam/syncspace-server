import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import {
  ProjectHealth,
  ProjectPriority,
  ProjectVisibility,
} from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ example: 'Auth & SSO Service', description: 'Project title' })
  @IsString()
  @Length(2, 100)
  title!: string;

  @ApiPropertyOptional({
    example: 'AUTH',
    description: 'Human-readable project key for task prefixes (2-10 chars)',
  })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  key?: string;

  @ApiPropertyOptional({
    example: 'auth-and-sso-service',
    description: 'URL-friendly slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Central identity and OAuth gateway',
    description: 'Short project summary',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example:
      '# Project Goals\nDeliver RFC-compliant OAuth2 & SAML2 integration.',
    description: 'Detailed markdown project brief or PRD overview',
  })
  @IsOptional()
  @IsString()
  brief?: string;

  @ApiPropertyOptional({
    example: '🚀',
    description: 'Emoji icon or Lucide icon name (e.g. "shield", "rocket")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Hex color for project theme badge',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    example: ProjectVisibility.PUBLIC,
    enum: ProjectVisibility,
    description:
      'Visibility: PUBLIC (workspace members) or PRIVATE (project members only)',
  })
  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @ApiPropertyOptional({
    example: ProjectPriority.MEDIUM,
    enum: ProjectPriority,
    description: 'Project priority level',
  })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({
    example: ProjectHealth.ON_TRACK,
    enum: ProjectHealth,
    description: 'High-level executive health status',
  })
  @IsOptional()
  @IsEnum(ProjectHealth)
  health?: ProjectHealth;

  @ApiPropertyOptional({
    example: 'd83c21a4-9e32-4161-9c3f-912a76fbd14b',
    description: 'Designated Project Lead / Manager user UUID',
  })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Planned project start date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2026-10-31T00:00:00.000Z',
    description: 'Target project completion deadline',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({
    example: 'https://github.com/syncspace/auth-service',
    description: 'Repository or VCS project link',
  })
  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @ApiPropertyOptional({
    example: { department: 'Engineering', costCenter: 'CC-104' },
    description: 'Extensible metadata / custom attributes',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
