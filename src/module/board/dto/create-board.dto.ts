import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ example: 'Sprint 1 Board' })
  @IsString()
  @Length(2, 100)
  title!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  includeDefaultColumns?: boolean = true;
}
