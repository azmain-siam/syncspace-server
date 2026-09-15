import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MoveTaskDto {
  @ApiProperty({ example: 'target-column-uuid' })
  @IsString()
  targetColumnId!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  targetOrder!: number;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.DONE,
    description:
      'Optional target task status. If omitted, status will be automatically inferred from target column title.',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
