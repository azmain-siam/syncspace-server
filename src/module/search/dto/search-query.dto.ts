import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum SearchType {
  ALL = 'ALL',
  PROJECTS = 'PROJECTS',
  TASKS = 'TASKS',
  COMMENTS = 'COMMENTS',
  MEMBERS = 'MEMBERS',
}

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'backend' })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  q!: string;

  @ApiPropertyOptional({ enum: SearchType, default: SearchType.ALL })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
