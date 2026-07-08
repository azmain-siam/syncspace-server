import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  @Length(2, 100)
  title!: string;

  @ApiProperty({ example: 'This is my project' })
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '2023-01-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({ example: '#FF0000' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
