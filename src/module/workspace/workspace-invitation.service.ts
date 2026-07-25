import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, WorkspaceRole } from '@prisma/client';
import { generateSecureToken, hashToken } from 'src/common/utils/token.util';
import { ActivityService } from '../activity/activity.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { DeclineInvitationDto } from './dto/decline-invitation.dto';

@Injectable()
export class WorkspaceInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly activityService: ActivityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Create & send workspace invitation
  async createInvitation(
    workspaceId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Verify inviter role (OWNER or ADMIN)
    const inviterMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: inviterId },
      include: { user: true },
    });

    if (
      !inviterMember ||
      (inviterMember.role !== WorkspaceRole.OWNER &&
        inviterMember.role !== WorkspaceRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only workspace owners or admins can send invitations',
      );
    }

    // Check if user is already a workspace member
    const existingMember = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: {
        workspaceMembers: {
          where: { workspaceId },
        },
      },
    });

    if (existingMember && existingMember.workspaceMembers.length > 0) {
      throw new BadRequestException(
        'User is already a member of this workspace',
      );
    }

    // Check if an active PENDING invitation already exists
    const activeInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: dto.email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeInvitation) {
      throw new BadRequestException(
        'An active invitation for this email already exists',
      );
    }

    const { rawToken, hashedToken } = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedById: inviterId,
        email: dto.email.toLowerCase(),
        role: dto.role,
        tokenHash: hashedToken,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
    });

    // Send invitation email
    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const invitationUrl = `${baseUrl}/invitations/accept?token=${rawToken}`;

    await this.emailService.sendWorkspaceInvitation(
      dto.email,
      inviterMember.user.name,
      workspace.name,
      invitationUrl,
    );

    // Workspace Activity & Platform Audit Log
    await this.activityService.createActivityLog(undefined, {
      workspaceId,
      actorId: inviterId,
      action: 'INVITATION_SENT',
      description: `${inviterMember.user.name} invited ${dto.email} to the workspace as ${dto.role}`,
    });

    await this.auditLogService.log({
      actorId: inviterId,
      action: AuditAction.WORKSPACE_INVITATION_CREATED,
      metadata: {
        workspaceId,
        email: dto.email,
        role: dto.role,
      },
    });

    return {
      message: 'Invitation sent successfully.',
      invitationId: invitation.id,
    };
  }

  // Validate invitation token details (Public)
  async validateInvitation(rawToken: string) {
    const hashed = hashToken(rawToken);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hashed },
      include: {
        workspace: {
          select: { id: true, name: true, logo: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invalid or inactive workspace invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Workspace invitation has expired');
    }

    return {
      workspaceName: invitation.workspace.name,
      workspaceLogo: invitation.workspace.logo,
      invitedEmail: invitation.email,
      role: invitation.role,
      inviterName: invitation.invitedBy.name,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  // Accept workspace invitation (Authenticated)
  async acceptInvitation(userId: string, dto: AcceptInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hashed = hashToken(dto.token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hashed },
      include: {
        workspace: true,
        invitedBy: true,
      },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invalid or inactive workspace invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Workspace invitation has expired');
    }

    // Email match check
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'Invitation email does not match your logged in email address',
      );
    }

    // Check if user is already a member
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
      },
    });

    if (existingMember) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      return { message: 'You are already a member of this workspace.' };
    }

    // Transaction: Create WorkspaceMember, mark invitation ACCEPTED, log activity
    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      });

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId: invitation.workspaceId,
        actorId: user.id,
        action: 'INVITATION_ACCEPTED',
        description: `${user.name} accepted invitation and joined the workspace`,
      });
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.WORKSPACE_INVITATION_ACCEPTED,
      metadata: {
        workspaceId: invitation.workspaceId,
        invitationId: invitation.id,
        email: user.email,
      },
    });

    return {
      message: 'Workspace joined successfully.',
    };
  }

  // Decline workspace invitation (Authenticated)
  async declineInvitation(userId: string, dto: DeclineInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hashed = hashToken(dto.token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hashed },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invalid or inactive workspace invitation');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'Invitation email does not match your logged in email address',
      );
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
      },
    });

    await this.activityService.createActivityLog(undefined, {
      workspaceId: invitation.workspaceId,
      actorId: user.id,
      action: 'INVITATION_DECLINED',
      description: `${user.name} declined the workspace invitation`,
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.WORKSPACE_INVITATION_DECLINED,
      metadata: {
        workspaceId: invitation.workspaceId,
        invitationId: invitation.id,
      },
    });

    return {
      message: 'Invitation declined successfully.',
    };
  }

  // Cancel invitation (Owner or Admin)
  async cancelInvitation(
    workspaceId: string,
    actorId: string,
    invitationId: string,
  ) {
    const actorMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: actorId },
    });

    if (
      !actorMember ||
      (actorMember.role !== WorkspaceRole.OWNER &&
        actorMember.role !== WorkspaceRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only workspace owners or admins can cancel invitations',
      );
    }

    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
      },
    });

    await this.activityService.createActivityLog(undefined, {
      workspaceId,
      actorId,
      action: 'INVITATION_CANCELLED',
      description: `Workspace invitation for ${invitation.email} was cancelled`,
    });

    await this.auditLogService.log({
      actorId,
      action: AuditAction.WORKSPACE_INVITATION_CANCELLED,
      metadata: {
        workspaceId,
        invitationId,
        email: invitation.email,
      },
    });

    return {
      message: 'Invitation cancelled successfully.',
    };
  }
}
