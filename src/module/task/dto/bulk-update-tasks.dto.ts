import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkUpdateTaskFieldsDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Assignee User UUID (or null to unassign)',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  assigneeId?: string | null;

  @ApiPropertyOptional({
    description: 'Sprint UUID (or null to unassign from sprint)',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  sprintId?: string | null;

  @ApiPropertyOptional({
    description: 'Destination column UUID (moves tasks to column)',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
  })
  @IsOptional()
  @IsUUID('4')
  columnId?: string;

  @ApiPropertyOptional({
    description: 'Set backlog state',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isBacklog?: boolean;

  @ApiPropertyOptional({
    description: 'Story points (0-100)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  storyPoints?: number;

  @ApiPropertyOptional({
    description: 'Estimated hours',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Array of Label UUIDs to assign to all selected tasks',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds?: string[];
}

export class BulkUpdateTasksDto {
  @ApiProperty({
    description: 'List of task UUIDs to update',
    example: ['7b29a14e-f823-4211-92b4-7bb9cf88ef4a'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  taskIds: string[];

  @ApiProperty({
    description: 'Fields to update across all specified tasks',
    type: BulkUpdateTaskFieldsDto,
  })
  @ValidateNested()
  @Type(() => BulkUpdateTaskFieldsDto)
  data: BulkUpdateTaskFieldsDto;
}
