import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { RoomType } from './join-room.dto';

export class LeaveRoomDto {
  @IsEnum(RoomType)
  @IsNotEmpty()
  roomType!: RoomType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
