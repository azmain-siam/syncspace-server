import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignLabelsDto {
  @ApiProperty({
    example: ['e8361718-47d0-4d40-9a25-9c5950e18193'],
    description: 'Array of Label UUIDs to assign to the task',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each labelId must be a valid UUID' })
  labelIds: string[];
}
