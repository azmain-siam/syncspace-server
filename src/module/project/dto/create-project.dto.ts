import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'This is my project' })
  @IsString()
  description?: string;
}
