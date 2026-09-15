import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({
    example: 'Critical Bug',
    description: 'Updated name of the label',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @ApiPropertyOptional({
    example: '#DC2626',
    description: 'Updated hex color code for the label',
  })
  @IsOptional()
  @IsString()
  @IsHexColor({
    message: 'Color must be a valid hex color code (e.g. #DC2626 or #FFF)',
  })
  color?: string;
}
