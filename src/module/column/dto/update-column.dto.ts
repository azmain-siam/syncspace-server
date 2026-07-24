import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateColumnDto {
  @ApiPropertyOptional({ example: 'In Review' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  title?: string;
}
