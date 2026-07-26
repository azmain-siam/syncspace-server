import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { slugify } from 'src/common/utils/slug.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateWorkspaceSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Create workspace
  async createWorkspace(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          ownerId: userId,
          name: createWorkspaceDto.name,
          logo: createWorkspaceDto.logo,
          slug: slugify(createWorkspaceDto.name),
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId: workspace.id,
        actorId: userId,
        action: ActivityAction.WORKSPACE_CREATED,
        description: `Created workspace ${workspace.name}`,
        metadata: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
      });

      return workspace;
    });
  }

  // Get my workspaces
  async getMyWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Invite member
  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    currentUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User already a member');
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role: dto.role,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUserId,
        action: ActivityAction.MEMBER_INVITED,
        description: `Invited ${user.name} to workspace`,
        metadata: {
          workspaceId,
          invitedUserId: user.id,
          invitedUserName: user.name,
        },
      });

      return membership;
    });
  }

  // Remove member
  async removeWorkspaceMember(
    workspaceId: string,
    memberId: string,
    user: User,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Owner cannot be removed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: memberId,
          },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: user.id,
        action: ActivityAction.MEMBER_REMOVED,
        description: `${user.name} removed ${member.user.name} from workspace`,
        metadata: {
          workspaceId,
          removedUserId: member.userId,
          removedUserName: member.user.name,
        },
      });
    });

    return null;
  }

  // Update member role
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    user: User,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Ownership transfer required');
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedMember = await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: memberId,
          },
        },
        data: {
          role: dto.role,
        },
        include: {
          user: true,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: user.id,
        action: ActivityAction.ROLE_UPDATED,
        description: `Updated role of ${updatedMember.user.name} to ${dto.role}`,
        metadata: {
          workspaceId,
          updatedUserId: member.userId,
          updatedUserName: updatedMember.user.name,
          newRole: dto.role,
        },
      });
    });
  }

  // Transfer ownership
  async transferOwnership(
    workspaceId: string,
    dto: TransferOwnershipDto,
    currentOwnerId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          ownerId: dto.memberId,
        },
      });

      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: currentOwnerId,
          },
        },
        data: {
          role: WorkspaceRole.ADMIN,
        },
      });

      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.memberId,
          },
        },
        data: {
          role: WorkspaceRole.OWNER,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentOwnerId,
        action: ActivityAction.ROLE_UPDATED,
        description: `Transferred ownership to ${dto.memberId}`,
        metadata: {
          workspaceId,
          transferredUserId: dto.memberId,
        },
      });

      return null;
    });
  }

  // Get workspace members
  async getWorkspaceMembers(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: {
          select: SAFE_USER_MINIMAL_SELECT,
        },
      },
    });
  }

  // Update workspace settings
  async updateWorkspaceSettings(
    workspaceId: string,
    dto: UpdateWorkspaceSettingsDto,
    currentUser: User,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedWorkspace = await tx.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          name: dto.name ?? workspace.name,
          description: dto.description ?? workspace.description,
          logo: dto.logo ?? workspace.logo,
          visibility: dto.visibility ?? workspace.visibility,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        action: ActivityAction.SETTINGS_UPDATED,
        description: `${currentUser.name} updated workspace settings`,
        metadata: { workspaceId },
      });

      return updatedWorkspace;
    });
  }
}
