import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class MoveTaskDto {
  @ApiProperty({ example: 'target-column-uuid' })
  @IsString()
  targetColumnId!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  targetOrder!: number;
}
