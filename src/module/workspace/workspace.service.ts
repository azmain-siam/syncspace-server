import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { User } from 'src/common/interfaces/user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateWorkspaceSettingsDto } from './dto/update-settings.dto';
import { ActivityAction } from './enums/activity-action.enum';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

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
          slug: createWorkspaceDto.name.toLowerCase().replace(/ /g, '-'),
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      await this.createActivityLog(
        tx,
        workspace.id,
        userId,
        ActivityAction.WORKSPACE_CREATED,
        `Created workspace ${workspace.name}`,
        {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
      );

      return workspace;
    });
  }

  async getMyWorkspaces(userId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        ownerId: userId,
      },
    });

    return workspaces;
  }

  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    currentUserId: string,
  ) {
    // find invited user
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // prevent duplicate members
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

    // create membership and activity log
    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role: dto.role,
        },
      });

      await this.createActivityLog(
        tx,
        workspaceId,
        currentUserId,
        ActivityAction.MEMBER_INVITED,
        `Invited ${user.name} to workspace`,
        {
          workspaceId,
          invitedUserId: user.id,
          invitedUserName: user.name,
        },
      );

      return membership;
    });
  }

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

      await this.createActivityLog(
        tx,
        workspaceId,
        user.id,
        ActivityAction.MEMBER_REMOVED,
        `${user.name} removed ${member.user.name} from workspace`,
        {
          workspaceId,
          removedUserId: member.userId,
          removedUserName: member.user.name,
        },
      );
    });

    return null;
  }

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

    // update role and activity log
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

      await this.createActivityLog(
        tx,
        workspaceId,
        user.id,
        ActivityAction.ROLE_UPDATED,
        `Updated role of ${updatedMember.user.name} to ${dto.role}`,
        {
          workspaceId,
          updatedUserId: member.userId,
          updatedUserName: updatedMember.user.name,
          newRole: dto.role,
        },
      );
    });
  }

  async transferOwnership(
    workspaceId: string,
    dto: TransferOwnershipDto,
    currentOwnerId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // update ownership
      await tx.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          ownerId: dto.memberId,
        },
      });

      // update current owner role to ADMIN
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

      // update new owner role to OWNER
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

      // create activity log
      await this.createActivityLog(
        tx,
        workspaceId,
        currentOwnerId,
        ActivityAction.ROLE_UPDATED,
        `Transferred ownership to ${dto.memberId}`,
        {
          workspaceId,
          transferredUserId: dto.memberId,
        },
      );

      return null;
    });
  }

  async getWorkspaceMembers(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
        ownerId: userId,
      },
    });

    if (!workspace) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: true,
      },
    });

    return members;
  }

  async updateWorkspaceSettings(
    workspaceId: string,
    dto: UpdateWorkspaceSettingsDto,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const updatedWorkspace = await this.prisma.workspace.update({
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

    return updatedWorkspace;
  }

  async createActivityLog(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actorId: string,
    action: string,
    description?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return tx.workspaceActivity.create({
      data: {
        workspaceId,
        actorId,
        action,
        description,
        metadata,
      },
    });
  }
}
