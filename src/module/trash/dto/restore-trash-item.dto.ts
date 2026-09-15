import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RestoreTrashItemDto {
  @ApiProperty({
    description: 'Type of item to restore',
    enum: ['TASK', 'PROJECT'],
    example: 'TASK',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TASK', 'PROJECT'])
  itemType: 'TASK' | 'PROJECT';

  @ApiProperty({
    description: 'UUID of the item to restore',
    example: '7b29a14e-f823-4211-92b4-7bb9cf88ef4a',
  })
  @IsUUID('4')
  @IsNotEmpty()
  itemId: string;
}
