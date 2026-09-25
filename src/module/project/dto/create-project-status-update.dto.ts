import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { ProjectHealth } from '@prisma/client';

export class CreateProjectStatusUpdateDto {
  @ApiProperty({
    enum: ProjectHealth,
    example: ProjectHealth.ON_TRACK,
    description: 'Executive health status for this progress report',
  })
  @IsEnum(ProjectHealth)
  health!: ProjectHealth;

  @ApiProperty({
    example:
      'Backend auth endpoints completed ahead of schedule. Starting frontend OAuth integration.',
    description: 'Markdown summary of accomplishments, risks, and next steps',
  })
  @IsString()
  @Length(5, 5000)
  message!: string;
}
