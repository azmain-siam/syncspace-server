import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AuditAction } from '../enums/audit-action.enum';

export class WorkspaceAuditQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by actor User UUID',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
  })
  @IsOptional()
  @IsUUID('4')
  actorId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter logs created on or after this ISO date',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter logs created on or before this ISO date',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
