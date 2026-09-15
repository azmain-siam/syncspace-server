import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class MyTasksQueryDto {
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
    description: 'Filter by specific project ID within the workspace',
    example: 'd83c21a4-9e32-4161-9c3f-912a76fbd14b',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by due date relative window',
    enum: ['today', 'overdue', 'upcoming', 'nodate'],
    example: 'overdue',
  })
  @IsOptional()
  @IsIn(['today', 'overdue', 'upcoming', 'nodate'])
  dueDate?: 'today' | 'overdue' | 'upcoming' | 'nodate';

  @ApiPropertyOptional({
    description: 'Group tasks by dimension in the response payload',
    enum: ['project', 'priority', 'status', 'dueDate'],
    example: 'project',
  })
  @IsOptional()
  @IsIn(['project', 'priority', 'status', 'dueDate'])
  groupBy?: 'project' | 'priority' | 'status' | 'dueDate';

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
    default: 50,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
