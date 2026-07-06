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

  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    userId: string,
  ) {
    // validate current user
    const currentMember = await this.validateWorkspaceAccess(
      workspaceId,
      userId,
    );

    // validate permissions
    this.validateWorkspacePermission(currentMember.role, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

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

  async validateWorkspaceAccess(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member)
      throw new ForbiddenException('You are not a member of this workspace');

    return member;
  }

  validateWorkspacePermission(
    memberRole: WorkspaceRole,
    allowedRoles: WorkspaceRole[],
  ) {
    if (!allowedRoles.includes(memberRole))
      throw new ForbiddenException(
        'You are not allowed to perform this action',
      );
  }

  validateWorkspacePermissio1n(
    memberRole: WorkspaceRole,
    allowedRoles: WorkspaceRole[],
  ) {
    if (!allowedRoles.includes(memberRole))
      throw new ForbiddenException(
        'You are not allowed to perform this action',
      );
  }
}
