import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { AssignLabelsDto } from './dto/assign-labels.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelService } from './label.service';

@ApiTags('Labels')
@Controller()
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  // Create Workspace Label
  @Post('workspaces/:workspaceId/labels')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Label created successfully')
  @ApiOperation({ summary: 'Create label in workspace' })
  createLabel(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateLabelDto,
    @CurrentUser() user: User,
  ) {
    return this.labelService.createLabel(workspaceId, dto, user);
  }

  // Get Workspace Labels
  @Get('workspaces/:workspaceId/labels')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Labels fetched successfully')
  @ApiOperation({ summary: 'Get all labels in workspace' })
  getWorkspaceLabels(@Param('workspaceId') workspaceId: string) {
    return this.labelService.getWorkspaceLabels(workspaceId);
  }

  // Update Workspace Label
  @Patch('workspaces/:workspaceId/labels/:labelId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Label updated successfully')
  @ApiOperation({ summary: 'Update label in workspace' })
  updateLabel(
    @Param('workspaceId') workspaceId: string,
    @Param('labelId') labelId: string,
    @Body() dto: UpdateLabelDto,
    @CurrentUser() user: User,
  ) {
    return this.labelService.updateLabel(workspaceId, labelId, dto, user);
  }

  // Delete Workspace Label
  @Delete('workspaces/:workspaceId/labels/:labelId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Label deleted successfully')
  @ApiOperation({ summary: 'Delete label from workspace' })
  deleteLabel(
    @Param('workspaceId') workspaceId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user: User,
  ) {
    return this.labelService.deleteLabel(workspaceId, labelId, user);
  }

  // Attach Label to Task (Shallow Route)
  @Post('tasks/:taskId/labels/:labelId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Label attached to task successfully')
  @ApiOperation({ summary: 'Attach a label to a task' })
  attachLabel(
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user: User,
  ) {
    return this.labelService.attachLabelToTask(taskId, labelId, user);
  }

  // Detach Label from Task (Shallow Route)
  @Delete('tasks/:taskId/labels/:labelId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Label detached from task successfully')
  @ApiOperation({ summary: 'Detach a label from a task' })
  detachLabel(
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user: User,
  ) {
    return this.labelService.detachLabelFromTask(taskId, labelId, user);
  }

  // Sync / Set All Labels on Task (Shallow Route)
  @Put('tasks/:taskId/labels')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task labels updated successfully')
  @ApiOperation({ summary: 'Set/replace all labels on a task' })
  setTaskLabels(
    @Param('taskId') taskId: string,
    @Body() dto: AssignLabelsDto,
    @CurrentUser() user: User,
  ) {
    return this.labelService.setTaskLabels(taskId, dto.labelIds, user);
  }
}
