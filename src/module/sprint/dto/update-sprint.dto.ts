import { ApiPropertyOptional } from '@nestjs/swagger';
import { SprintStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateSprintDto {
  @ApiPropertyOptional({
    example: 'Sprint 1 - Hardened',
    description: 'Updated name of the sprint',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @ApiPropertyOptional({
    example: 'Deliver auth overhaul, guest roles and trash management',
    description: 'Updated sprint goal',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  goal?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Updated start date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-15T23:59:59.999Z',
    description: 'Updated end date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: SprintStatus,
    description: 'Status of the sprint',
  })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;
}
