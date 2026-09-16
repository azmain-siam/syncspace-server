import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, SprintStatus, TaskStatus } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { BacklogQueryDto } from './dto/backlog-query.dto';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { MoveTaskToSprintDto } from './dto/move-task-to-sprint.dto';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidationService: EntityValidationService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 1. Create Sprint
  async createSprint(
    projectId: string,
    dto: CreateSprintDto,
    currentUser: User,
  ) {
    const project =
      await this.entityValidationService.verifyProjectById(projectId);

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal,
        startDate,
        endDate,
        status: SprintStatus.PLANNING,
      },
      include: {
        project: {
          select: { id: true, title: true, key: true, workspaceId: true },
        },
      },
    });

    await this.activityService.createActivityLog(this.prisma, {
      workspaceId: project.workspaceId,
      actorId: currentUser.id,
      projectId,
      action: ActivityAction.SPRINT_CREATED,
      description: `${currentUser.name} created sprint "${sprint.name}"`,
      metadata: {
        sprintId: sprint.id,
        name: sprint.name,
        status: sprint.status,
      },
    });

    this.eventEmitter.emit('sprint.created', {
      sprintId: sprint.id,
      projectId,
      workspaceId: project.workspaceId,
      actorId: currentUser.id,
    });

    return sprint;
  }

  // 2. List Sprints for Project with Capacity Metrics
  async getProjectSprints(projectId: string, query: SprintQueryDto) {
    await this.entityValidationService.verifyProjectById(projectId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SprintWhereInput = {
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, sprints] = await Promise.all([
      this.prisma.sprint.count({ where }),
      this.prisma.sprint.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          tasks: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
              storyPoints: true,
              estimatedHours: true,
            },
          },
        },
      }),
    ]);

    const sprintsWithMetrics = sprints.map((sprint) => {
      const totalTasks = sprint.tasks.length;
      const completedTasks = sprint.tasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;
      const totalStoryPoints = sprint.tasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      const completedStoryPoints = sprint.tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const totalEstimatedHours = sprint.tasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );

      const sprintWithoutTasks = { ...sprint } as Record<string, any>;
      delete sprintWithoutTasks.tasks;
      return {
        ...sprintWithoutTasks,
        metrics: {
          totalTasks,
          completedTasks,
          totalStoryPoints,
          completedStoryPoints,
          totalEstimatedHours,
          completionPercentage:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        },
      };
    });

    return {
      data: sprintsWithMetrics,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // 3. Get Sprint by ID with Task Breakdown
  async getSprintById(sprintId: string) {
    await this.entityValidationService.verifySprintById(sprintId);

    const sprintDetails = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          select: { id: true, title: true, key: true, workspaceId: true },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: SAFE_USER_MINIMAL_SELECT },
            column: { select: { id: true, title: true, boardId: true } },
            labels: true,
          },
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!sprintDetails) {
      throw new NotFoundException('Sprint not found');
    }

    const totalTasks = sprintDetails.tasks.length;
    const completedTasks = sprintDetails.tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const totalStoryPoints = sprintDetails.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0,
    );
    const completedStoryPoints = sprintDetails.tasks
      .filter((t) => t.status === TaskStatus.DONE)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const totalEstimatedHours = sprintDetails.tasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0,
    );

    return {
      ...sprintDetails,
      metrics: {
        totalTasks,
        completedTasks,
        totalStoryPoints,
        completedStoryPoints,
        totalEstimatedHours,
        completionPercentage:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    };
  }

  // 4. Update Sprint
  async updateSprint(
    sprintId: string,
    dto: UpdateSprintDto,
    currentUser: User,
  ) {
    const existing =
      await this.entityValidationService.verifySprintById(sprintId);
    const workspaceId = existing.project.workspaceId;
    const projectId = existing.projectId;

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    if (
      dto.status === SprintStatus.ACTIVE &&
      existing.status !== SprintStatus.ACTIVE
    ) {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: {
          projectId,
          status: SprintStatus.ACTIVE,
          deletedAt: null,
          NOT: { id: sprintId },
        },
      });
      if (activeSprint) {
        throw new BadRequestException(
          `Project already has an active sprint: "${activeSprint.name}". Complete it before activating this sprint.`,
        );
      }
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: dto.name ?? existing.name,
        goal: dto.goal !== undefined ? dto.goal : existing.goal,
        startDate,
        endDate,
        status: dto.status ?? existing.status,
      },
      include: {
        project: {
          select: { id: true, title: true, key: true, workspaceId: true },
        },
      },
    });

    await this.activityService.createActivityLog(this.prisma, {
      workspaceId,
      actorId: currentUser.id,
      projectId,
      action: ActivityAction.SPRINT_UPDATED,
      description: `${currentUser.name} updated sprint "${updated.name}"`,
      metadata: {
        sprintId: updated.id,
        changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
      },
    });

    this.eventEmitter.emit('sprint.updated', {
      sprintId: updated.id,
      projectId,
      workspaceId,
      actorId: currentUser.id,
    });

    return updated;
  }

  // 5. Start Sprint (Enforces single active sprint per project)
  async startSprint(sprintId: string, currentUser: User) {
    const sprint =
      await this.entityValidationService.verifySprintById(sprintId);
    const workspaceId = sprint.project.workspaceId;
    const projectId = sprint.projectId;

    if (sprint.status === SprintStatus.ACTIVE) {
      throw new BadRequestException('Sprint is already active');
    }

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot start a completed sprint');
    }

    // Scrum rule: Single active sprint per project
    const activeSprint = await this.prisma.sprint.findFirst({
      where: {
        projectId,
        status: SprintStatus.ACTIVE,
        deletedAt: null,
        NOT: { id: sprintId },
      },
    });

    if (activeSprint) {
      throw new BadRequestException(
        `Project already has an active sprint: "${activeSprint.name}". Complete it before starting a new sprint.`,
      );
    }

    const startedSprint = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: SprintStatus.ACTIVE,
        startDate: sprint.startDate || new Date(),
      },
      include: {
        project: {
          select: { id: true, title: true, key: true, workspaceId: true },
        },
      },
    });

    await this.activityService.createActivityLog(this.prisma, {
      workspaceId,
      actorId: currentUser.id,
      projectId,
      action: ActivityAction.SPRINT_STARTED,
      description: `${currentUser.name} started sprint "${startedSprint.name}"`,
      metadata: { sprintId: startedSprint.id, name: startedSprint.name },
    });

    this.eventEmitter.emit('sprint.started', {
      sprintId: startedSprint.id,
      projectId,
      workspaceId,
      actorId: currentUser.id,
    });

    return startedSprint;
  }

  // 6. Complete Sprint (With unfinished task roll-over to next sprint or backlog)
  async completeSprint(
    sprintId: string,
    dto: CompleteSprintDto,
    currentUser: User,
  ) {
    const sprint =
      await this.entityValidationService.verifySprintById(sprintId);
    const workspaceId = sprint.project.workspaceId;
    const projectId = sprint.projectId;

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Sprint is already completed');
    }

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only active sprints can be completed');
    }

    // If rollover target sprint specified, verify it
    if (dto.moveToSprintId) {
      if (dto.moveToSprintId === sprintId) {
        throw new BadRequestException(
          'Target sprint cannot be the current sprint',
        );
      }

      const targetSprint = await this.prisma.sprint.findFirst({
        where: {
          id: dto.moveToSprintId,
          projectId,
          deletedAt: null,
        },
      });

      if (!targetSprint) {
        throw new NotFoundException(
          'Target sprint for task roll-over not found',
        );
      }

      if (targetSprint.status === SprintStatus.COMPLETED) {
        throw new BadRequestException(
          'Cannot roll over tasks into an already completed sprint',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Find all unfinished active tasks in this sprint
      const unfinishedTasks = await tx.task.findMany({
        where: {
          sprintId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
        },
        select: { id: true, title: true },
      });

      const unfinishedTaskIds = unfinishedTasks.map((t) => t.id);

      // Roll over unfinished tasks
      if (unfinishedTaskIds.length > 0) {
        if (dto.moveToSprintId) {
          await tx.task.updateMany({
            where: { id: { in: unfinishedTaskIds } },
            data: {
              sprintId: dto.moveToSprintId,
              isBacklog: false,
            },
          });
        } else {
          // Push to backlog
          await tx.task.updateMany({
            where: { id: { in: unfinishedTaskIds } },
            data: {
              sprintId: null,
              isBacklog: true,
            },
          });
        }
      }

      // Mark current sprint COMPLETED
      const completedSprint = await tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: SprintStatus.COMPLETED,
          endDate: new Date(),
        },
        include: {
          project: {
            select: { id: true, title: true, key: true, workspaceId: true },
          },
        },
      });

      // Fetch finished tasks count and velocity
      const completedTasks = await tx.task.findMany({
        where: {
          sprintId,
          deletedAt: null,
          status: TaskStatus.DONE,
        },
        select: { storyPoints: true, estimatedHours: true },
      });

      const completedStoryPoints = completedTasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        action: ActivityAction.SPRINT_COMPLETED,
        description: `${currentUser.name} completed sprint "${completedSprint.name}"`,
        metadata: {
          sprintId: completedSprint.id,
          name: completedSprint.name,
          completedTasksCount: completedTasks.length,
          rolledOverTasksCount: unfinishedTaskIds.length,
          completedStoryPoints,
          rolledOverToSprintId: dto.moveToSprintId || null,
        },
      });

      return {
        ...completedSprint,
        summary: {
          completedTasksCount: completedTasks.length,
          rolledOverTasksCount: unfinishedTaskIds.length,
          completedStoryPoints,
          rolledOverTo: dto.moveToSprintId ? 'NEXT_SPRINT' : 'BACKLOG',
        },
      };
    });
  }

  // 7. Delete (Soft delete) Sprint
  async deleteSprint(sprintId: string, currentUser: User) {
    const sprint =
      await this.entityValidationService.verifySprintById(sprintId);
    const workspaceId = sprint.project.workspaceId;
    const projectId = sprint.projectId;

    return this.prisma.$transaction(async (tx) => {
      // Unassign all tasks from sprint and push to backlog
      await tx.task.updateMany({
        where: { sprintId, deletedAt: null },
        data: {
          sprintId: null,
          isBacklog: true,
        },
      });

      await tx.sprint.update({
        where: { id: sprintId },
        data: { deletedAt: new Date() },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        action: ActivityAction.SPRINT_DELETED,
        description: `${currentUser.name} deleted sprint "${sprint.name}"`,
        metadata: { sprintId, name: sprint.name },
      });

      return null;
    });
  }

  // 8. Get Dedicated Project Backlog Triage View
  async getProjectBacklog(projectId: string, query: BacklogQueryDto) {
    await this.entityValidationService.verifyProjectById(projectId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.TaskWhereInput = {
      column: {
        board: {
          project: {
            id: projectId,
            deletedAt: null,
          },
        },
      },
      deletedAt: null,
      OR: [{ isBacklog: true }, { sprintId: null }],
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  { key: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };

    const [total, tasks, capacityAgg] = await Promise.all([
      this.prisma.task.count({ where: baseWhere }),
      this.prisma.task.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
          creator: { select: SAFE_USER_MINIMAL_SELECT },
          column: { select: { id: true, title: true, boardId: true } },
          labels: true,
        },
      }),
      this.prisma.task.aggregate({
        where: baseWhere,
        _sum: {
          storyPoints: true,
          estimatedHours: true,
        },
      }),
    ]);

    return {
      data: tasks,
      meta: {
        ...calculatePaginationMeta(total, page, limit),
        totalStoryPoints: capacityAgg._sum.storyPoints || 0,
        totalEstimatedHours: capacityAgg._sum.estimatedHours || 0,
      },
    };
  }

  // 9. Assign Task to Sprint or Backlog
  async assignTaskToSprint(
    taskId: string,
    dto: MoveTaskToSprintDto,
    currentUser: User,
  ) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;

    if (dto.sprintId) {
      const sprint = await this.prisma.sprint.findFirst({
        where: {
          id: dto.sprintId,
          projectId,
          deletedAt: null,
        },
      });

      if (!sprint) {
        throw new NotFoundException('Sprint not found in this task’s project');
      }

      if (sprint.status === SprintStatus.COMPLETED) {
        throw new BadRequestException(
          'Cannot assign tasks to a completed sprint',
        );
      }
    }

    const isBacklog = dto.isBacklog === true || !dto.sprintId;
    const targetSprintId = isBacklog ? null : dto.sprintId;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        sprintId: targetSprintId,
        isBacklog,
      },
      include: {
        assignee: { select: SAFE_USER_MINIMAL_SELECT },
        column: { select: { id: true, title: true, boardId: true } },
        labels: true,
        sprint: { select: { id: true, name: true, status: true } },
      },
    });

    await this.activityService.createActivityLog(this.prisma, {
      workspaceId,
      actorId: currentUser.id,
      projectId,
      taskId,
      action: ActivityAction.TASK_MOVED_TO_SPRINT,
      description: targetSprintId
        ? `${currentUser.name} moved task ${task.title} to sprint ${updated.sprint?.name}`
        : `${currentUser.name} moved task ${task.title} to backlog`,
      metadata: {
        taskId,
        sprintId: targetSprintId,
        isBacklog,
      },
    });

    this.eventEmitter.emit('task.sprint_changed', {
      taskId,
      sprintId: targetSprintId,
      isBacklog,
      projectId,
      workspaceId,
      actorId: currentUser.id,
    });

    return updated;
  }
}
