import { PartialType } from '@nestjs/swagger';
import { CreateTaskLinkDto } from './create-task-link.dto';

export class UpdateTaskLinkDto extends PartialType(CreateTaskLinkDto) {}
