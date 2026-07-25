import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ColumnOrderItemDto {
  @ApiProperty({ example: 'column-uuid-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderColumnsDto {
  @ApiProperty({ type: [ColumnOrderItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderItemDto)
  columnOrders!: ColumnOrderItemDto[];
}
