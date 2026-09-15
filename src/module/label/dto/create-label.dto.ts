import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsHexColor, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({
    example: 'Bug',
    description: 'Name of the label',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;

  @ApiProperty({
    example: '#EF4444',
    description: 'Hex color code for the label (e.g. #EF4444)',
  })
  @IsString()
  @IsNotEmpty()
  @IsHexColor({
    message: 'Color must be a valid hex color code (e.g. #EF4444 or #FFF)',
  })
  color: string;
}
