import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great progress! @john please review the latest PR.',
    description: 'Comment content text, supporting @username mentions',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 3000)
  content!: string;
}
