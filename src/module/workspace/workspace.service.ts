import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

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

  async inviteMember(workspaceId: string, dto: InviteMemberDto) {
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

    // create membership
    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: dto.role,
      },
    });
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string) {
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
      throw new BadRequestException('Owner cannot be removed');
    }

    await this.prisma.workspaceMember.delete({
      where: {
        id: memberId,
      },
    });

    return null;
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
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

    const updatedMember = await this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
      data: {
        role: dto.role,
      },
    });

    return updatedMember;
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
}
