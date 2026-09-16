import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CompleteSprintDto {
  @ApiPropertyOptional({
    description:
      'Target next Sprint UUID to roll unfinished tasks into (if omitted, uncompleted tasks are rolled into the backlog)',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
  })
  @IsOptional()
  @IsUUID('4')
  moveToSprintId?: string;
}
