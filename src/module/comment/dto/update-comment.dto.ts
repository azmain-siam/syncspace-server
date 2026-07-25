import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updated comment text with revised instructions.',
    description: 'Updated comment content',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 3000)
  content!: string;
}
