import { ApiProperty } from '@nestjs/swagger';

export class UploadAttachmentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Attachment file',
  })
  file!: any;
}
