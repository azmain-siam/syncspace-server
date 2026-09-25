import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class WorkspaceTasksQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by task status (supports single value or comma-separated list e.g. IN_PROGRESS,REVIEW)',
    example: 'IN_PROGRESS,REVIEW',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | string[] => {
    if (typeof value === 'string') {
      return value.includes(',')
        ? value.split(',').map((v) => v.trim())
        : value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim());
    }
    return String(value);
  })
  status?: TaskStatus | TaskStatus[];

  @ApiPropertyOptional({
    description:
      'Filter by task priority (supports single value or comma-separated list e.g. HIGH,URGENT)',
    example: 'HIGH,URGENT',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | string[] => {
    if (typeof value === 'string') {
      return value.includes(',')
        ? value.split(',').map((v) => v.trim())
        : value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim());
    }
    return String(value);
  })
  priority?: TaskPriority | TaskPriority[];

  @ApiPropertyOptional({
    description:
      'Filter by assigned user UUID, "me" for caller, or "unassigned"/"none" for unassigned tasks',
    example: 'me',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by project UUID within the workspace (supports comma-separated list)',
    example: 'd83c21a4-9e32-4161-9c3f-912a76fbd14b',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | string[] => {
    if (typeof value === 'string') {
      return value.includes(',')
        ? value.split(',').map((v) => v.trim())
        : value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim());
    }
    return String(value);
  })
  projectId?: string | string[];

  @ApiPropertyOptional({
    description: 'Filter by sprint UUID, or "none" for non-sprint tasks',
    example: 'd83c21a4-9e32-4161-9c3f-912a76fbd14b',
  })
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional({
    description: 'Filter by backlog state',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isBacklog?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by due date relative window',
    enum: [
      'today',
      'overdue',
      'upcoming',
      'this_week',
      'nodate',
      'no_due_date',
    ],
    example: 'overdue',
  })
  @IsOptional()
  @IsIn(['today', 'overdue', 'upcoming', 'this_week', 'nodate', 'no_due_date'])
  dueDate?:
    | 'today'
    | 'overdue'
    | 'upcoming'
    | 'this_week'
    | 'nodate'
    | 'no_due_date';

  @ApiPropertyOptional({
    description: 'Search term across task title, description, and human key',
    example: 'auth',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: [
      'dueDate',
      'priority',
      'status',
      'createdAt',
      'updatedAt',
      'title',
      'order',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([
    'dueDate',
    'priority',
    'status',
    'createdAt',
    'updatedAt',
    'title',
    'order',
  ])
  sortBy?:
    | 'dueDate'
    | 'priority'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'title'
    | 'order' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Group tasks by dimension in the response payload',
    enum: ['none', 'project', 'priority', 'status', 'dueDate', 'assignee'],
    example: 'status',
  })
  @IsOptional()
  @IsIn(['none', 'project', 'priority', 'status', 'dueDate', 'assignee'])
  groupBy?: 'none' | 'project' | 'priority' | 'status' | 'dueDate' | 'assignee';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
