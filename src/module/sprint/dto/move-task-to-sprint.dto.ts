import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class MoveTaskToSprintDto {
  @ApiPropertyOptional({
    description: 'Target Sprint UUID (leave null or omit to move to backlog)',
    example: 'd9b2d63d-a233-4123-8478-8270141f1a5a',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  sprintId?: string | null;

  @ApiPropertyOptional({
    description: 'Explicit backlog flag. If true, removes task from sprint',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBacklog?: boolean;
}
