import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Workspace' })
  @IsString()
  @Length(2, 50)
  name!: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;
}
