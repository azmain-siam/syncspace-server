import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ProjectPriority } from '../enums/project-priority.enum';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  @Length(2, 100)
  title!: string;

  @ApiPropertyOptional({ example: 'This is my project' })
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-07-11T15:45:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: ProjectPriority.LOW, enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;
}
