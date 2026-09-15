import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsTimeZone,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'Alex Mercer',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Short user bio / profile tagline',
    example: 'Senior Fullstack Engineer & Tech Lead',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Phone number in international E.164 format',
    example: '+14155552671',
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User IANA timezone identifier',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @IsTimeZone()
  timezone?: string;
}
