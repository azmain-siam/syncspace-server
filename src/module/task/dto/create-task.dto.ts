import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Fix authentication token bug' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ example: 'Tokens are not refreshing on timeout' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: TaskPriority.MEDIUM, enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: TaskStatus.TODO, enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'user-uuid-1' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-08-01T12:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
