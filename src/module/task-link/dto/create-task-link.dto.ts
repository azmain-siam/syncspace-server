import { ApiProperty } from '@nestjs/swagger';
import { LinkType } from '@prisma/client';
import { IsEnum, IsString, IsUrl, Length } from 'class-validator';

export class CreateTaskLinkDto {
  @ApiProperty({ example: 'Figma Design Mockups' })
  @IsString()
  @Length(2, 100, { message: 'Title must be between 2 and 100 characters' })
  title!: string;

  @ApiProperty({ example: 'https://figma.com/file/xyz123' })
  @IsUrl({}, { message: 'URL must be a valid web address' })
  url!: string;

  @ApiProperty({ enum: LinkType, example: LinkType.FIGMA })
  @IsEnum(LinkType, { message: 'Invalid link type' })
  type!: LinkType;
}
