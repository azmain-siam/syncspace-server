import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateProjectLinkDto {
  @ApiProperty({
    example: 'Product PRD on Notion',
    description: 'Title or description of the external resource',
  })
  @IsString()
  @Length(2, 100)
  title!: string;

  @ApiProperty({
    example: 'https://notion.so/workspace/auth-prd-123',
    description: 'Destination URL',
  })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({
    enum: LinkType,
    default: LinkType.OTHER,
    example: LinkType.NOTION,
    description: 'Category/type of external link',
  })
  @IsOptional()
  @IsEnum(LinkType)
  type?: LinkType = LinkType.OTHER;
}
