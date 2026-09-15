import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({
    description: 'Checklist item acceptance criteria or title',
    example: 'Write unit tests for token refresh flow',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Optional user ID assigned to complete this checklist item',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Display order / sequence number',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
