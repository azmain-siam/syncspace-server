import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ example: 'Backlog' })
  @IsString()
  @Length(1, 50)
  title!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
