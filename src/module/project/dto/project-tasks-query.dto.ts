import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class ProjectTasksQueryDto {
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

  @ApiPropertyOptional({
    description: 'Field to sort tasks by',
    enum: ['dueDate', 'priority', 'status', 'createdAt', 'title', 'order'],
    default: 'order',
  })
  @IsOptional()
  @IsString()
  @IsIn(['dueDate', 'priority', 'status', 'createdAt', 'title', 'order'])
  sortBy?: 'dueDate' | 'priority' | 'status' | 'createdAt' | 'title' | 'order' =
    'order';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: 'Filter by task status',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Filter by task priority',
    enum: TaskPriority,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
  })
  @IsOptional()
  @IsUUID('4')
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by label ID',
    example: 'e8361718-47d0-4d40-9a25-9c5950e18193',
  })
  @IsOptional()
  @IsUUID('4')
  labelId?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive search in task title and description',
    example: 'auth endpoint',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
