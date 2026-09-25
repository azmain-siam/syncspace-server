import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum AnalyticsInterval {
  DAY = 'day',
  WEEK = 'week',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'Number of days to analyze (1 to 90)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 30;

  @ApiPropertyOptional({
    enum: AnalyticsInterval,
    default: AnalyticsInterval.DAY,
    description: 'Grouping interval for time-series data',
  })
  @IsOptional()
  @IsEnum(AnalyticsInterval)
  interval?: AnalyticsInterval = AnalyticsInterval.DAY;
}
