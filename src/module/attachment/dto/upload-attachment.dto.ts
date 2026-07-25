import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UploadAttachmentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Attachment file',
  })
  @IsOptional()
  file?: any;
}
