import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({ example: 'dad3dbec-996d-4407-9bb9-da7f87673e88' })
  @IsString()
  memberId!: string;
}
