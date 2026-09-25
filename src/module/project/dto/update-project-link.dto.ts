import { PartialType } from '@nestjs/swagger';
import { CreateProjectLinkDto } from './create-project-link.dto';

export class UpdateProjectLinkDto extends PartialType(CreateProjectLinkDto) {}
