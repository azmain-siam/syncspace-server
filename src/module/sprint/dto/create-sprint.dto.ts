import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateSprintDto {
  @ApiProperty({
    example: 'Sprint 1',
    description: 'Name of the sprint',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;

  @ApiPropertyOptional({
    example: 'Deliver auth overhaul and workspace roles',
    description: 'Goal or focus of the sprint',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  goal?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Planned start date of the sprint',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-15T23:59:59.999Z',
    description: 'Planned end date of the sprint',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
