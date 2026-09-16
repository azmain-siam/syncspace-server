import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteTasksDto {
  @ApiProperty({
    description: 'List of task UUIDs to soft-delete',
    example: ['7b29a14e-f823-4211-92b4-7bb9cf88ef4a'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  taskIds: string[];
}
