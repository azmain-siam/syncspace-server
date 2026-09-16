import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ToggleReactionDto {
  @ApiProperty({
    description: 'Emoji character for the reaction (e.g. 👍, 🚀, ❤️, 🎉, 👀)',
    example: '👍',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  emoji: string;
}
