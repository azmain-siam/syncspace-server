/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    let workspaceId = request.params.workspaceId || request.body?.workspaceId;

    if (!workspaceId) {
      if (request.params.taskId) {
        const taskId = String(request.params.taskId);
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            taskId,
          );
        const task = await this.prisma.task.findFirst({
          where: isUuid ? { id: taskId } : { key: taskId.toUpperCase() },
          select: {
            column: {
              select: {
                board: {
                  select: {
                    project: {
                      select: { workspaceId: true },
                    },
                  },
                },
              },
            },
          },
        });
        workspaceId = task?.column?.board?.project?.workspaceId;
        if (workspaceId) {
          request.params.workspaceId = workspaceId;
        }
      } else if (request.params.sprintId) {
        const sprint = await this.prisma.sprint.findUnique({
          where: { id: request.params.sprintId },
          select: {
            project: {
              select: { workspaceId: true },
            },
          },
        });
        workspaceId = sprint?.project?.workspaceId;
        if (workspaceId) {
          request.params.workspaceId = workspaceId;
        }
      } else if (request.params.columnId) {
        const column = await this.prisma.boardColumn.findUnique({
          where: { id: request.params.columnId },
          select: {
            board: {
              select: {
                project: {
                  select: { workspaceId: true },
                },
              },
            },
          },
        });
        workspaceId = column?.board?.project?.workspaceId;
        if (workspaceId) {
          request.params.workspaceId = workspaceId;
        }
      } else if (request.params.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: request.params.projectId },
          select: { workspaceId: true },
        });
        workspaceId = project?.workspaceId;
        if (workspaceId) {
          request.params.workspaceId = workspaceId;
        }
      }
    }

    if (!workspaceId) {
      throw new ForbiddenException('Workspace access denied');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Workspace access denied');
    }

    const hasPermission = requiredRoles.includes(member.role);

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
