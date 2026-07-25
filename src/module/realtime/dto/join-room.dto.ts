import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export enum RoomType {
  WORKSPACE = 'workspace',
  BOARD = 'board',
  TASK = 'task',
}

export class JoinRoomDto {
  @IsEnum(RoomType)
  @IsNotEmpty()
  roomType!: RoomType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
