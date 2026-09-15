import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({
    description: 'Updated title of the checklist item',
    example: 'Write comprehensive integration tests',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Completion status of the checklist item',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Assigned user ID for this checklist item',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Display order / sequence number',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
