import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ProjectStatus,
  SprintStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsInterval,
  AnalyticsQueryDto,
} from './dto/analytics-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Verify workspace existence
  private async verifyWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  // 1. High-level KPI Summary with Historical Baseline & Deltas
  async getWorkspaceSummary(workspaceId: string, queryDto?: AnalyticsQueryDto) {
    await this.verifyWorkspace(workspaceId);

    const days = queryDto?.days || 30;
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(
      now.getTime() - 2 * days * 24 * 60 * 60 * 1000,
    );

    const [projectsCount, membersCount, activitiesCount, tasks] =
      await Promise.all([
        this.prisma.project.count({
          where: { workspaceId, deletedAt: null },
        }),
        this.prisma.workspaceMember.count({
          where: { workspaceId },
        }),
        this.prisma.workspaceActivity.count({
          where: { workspaceId },
        }),
        this.prisma.task.findMany({
          where: {
            deletedAt: null,
            column: { board: { project: { workspaceId, deletedAt: null } } },
          },
          select: {
            id: true,
            status: true,
            dueDate: true,
            storyPoints: true,
            estimatedHours: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

    // Current lifetime totals
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
    ).length;

    const totalStoryPoints = tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0,
    );
    const completedStoryPoints = tasks
      .filter((t) => t.status === TaskStatus.DONE)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const totalEstimatedHours = tasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0,
    );

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Trailing Period T_0 (periodStart to now)
    const currentCreatedTasks = tasks.filter(
      (t) => t.createdAt >= periodStart && t.createdAt <= now,
    ).length;
    const currentCompletedTasks = tasks.filter(
      (t) =>
        t.status === TaskStatus.DONE &&
        t.updatedAt >= periodStart &&
        t.updatedAt <= now,
    ).length;
    const currentCompletedStoryPoints = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.DONE &&
          t.updatedAt >= periodStart &&
          t.updatedAt <= now,
      )
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Preceding Period T_-1 (prevPeriodStart to periodStart)
    const prevCreatedTasks = tasks.filter(
      (t) => t.createdAt >= prevPeriodStart && t.createdAt < periodStart,
    ).length;
    const prevCompletedTasks = tasks.filter(
      (t) =>
        t.status === TaskStatus.DONE &&
        t.updatedAt >= prevPeriodStart &&
        t.updatedAt < periodStart,
    ).length;
    const prevCompletedStoryPoints = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.DONE &&
          t.updatedAt >= prevPeriodStart &&
          t.updatedAt < periodStart,
      )
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Deltas
    const createdTasksDelta = currentCreatedTasks - prevCreatedTasks;
    const completedTasksDelta = currentCompletedTasks - prevCompletedTasks;
    const completedStoryPointsDelta =
      currentCompletedStoryPoints - prevCompletedStoryPoints;

    return {
      projectsCount,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      membersCount,
      activitiesCount,
      completionPercentage,
      totalStoryPoints,
      completedStoryPoints,
      totalEstimatedHours,
      periodDays: days,
      currentPeriod: {
        startDate: periodStart.toISOString(),
        endDate: now.toISOString(),
        createdTasks: currentCreatedTasks,
        completedTasks: currentCompletedTasks,
        completedStoryPoints: currentCompletedStoryPoints,
      },
      previousPeriod: {
        startDate: prevPeriodStart.toISOString(),
        endDate: periodStart.toISOString(),
        createdTasks: prevCreatedTasks,
        completedTasks: prevCompletedTasks,
        completedStoryPoints: prevCompletedStoryPoints,
      },
      deltas: {
        createdTasksDelta,
        completedTasksDelta,
        completedStoryPointsDelta,
      },
    };
  }

  // 2. Task Distribution by Status & Priority
  async getTaskDistribution(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const baseWhere = {
      deletedAt: null,
      column: { board: { project: { workspaceId, deletedAt: null } } },
    };

    const [byStatus, byPriority] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: { id: true },
      }),
    ]);

    // Format all statuses (including 0 count defaults)
    const statusFormatted = Object.values(TaskStatus).map((status) => {
      const match = byStatus.find((item) => item.status === status);
      return {
        status,
        count: match ? match._count.id : 0,
      };
    });

    // Format all priorities (including 0 count defaults)
    const priorityFormatted = Object.values(TaskPriority).map((priority) => {
      const match = byPriority.find((item) => item.priority === priority);
      return {
        priority,
        count: match ? match._count.id : 0,
      };
    });

    return {
      byStatus: statusFormatted,
      byPriority: priorityFormatted,
    };
  }

  // 3. Time-Series Productivity Metrics with Zero-Filled Buckets
  async getProductivityMetrics(
    workspaceId: string,
    queryDto: AnalyticsQueryDto,
  ) {
    await this.verifyWorkspace(workspaceId);

    const days = queryDto.days || 30;
    const interval = queryDto.interval || AnalyticsInterval.DAY;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    const baseWhere = {
      deletedAt: null,
      column: { board: { project: { workspaceId, deletedAt: null } } },
    };

    const tasks = await this.prisma.task.findMany({
      where: {
        ...baseWhere,
        OR: [
          { createdAt: { gte: startDate } },
          { status: TaskStatus.DONE, updatedAt: { gte: startDate } },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tasksCreated = tasks.filter((t) => t.createdAt >= startDate);
    const tasksCompleted = tasks.filter(
      (t) => t.status === TaskStatus.DONE && t.updatedAt >= startDate,
    );

    // Map counts by date key YYYY-MM-DD
    const createdMap = new Map<string, number>();
    for (const task of tasksCreated) {
      const key = task.createdAt.toISOString().slice(0, 10);
      createdMap.set(key, (createdMap.get(key) || 0) + 1);
    }

    const completedMap = new Map<string, number>();
    for (const task of tasksCompleted) {
      const key = task.updatedAt.toISOString().slice(0, 10);
      completedMap.set(key, (completedMap.get(key) || 0) + 1);
    }

    const timeline: Array<{
      date: string;
      label: string;
      createdCount: number;
      completedCount: number;
      accumulatedCreated: number;
      accumulatedCompleted: number;
      netVelocity: number;
    }> = [];

    let runningCreated = 0;
    let runningCompleted = 0;

    if (interval === AnalyticsInterval.WEEK) {
      // Step in 7-day increments
      let currentWeekStart = new Date(startDate);
      while (currentWeekStart <= now) {
        const weekEnd = new Date(
          Math.min(
            currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000,
            now.getTime(),
          ),
        );
        const startKey = currentWeekStart.toISOString().slice(0, 10);

        let weekCreated = 0;
        let weekCompleted = 0;

        for (
          let d = new Date(currentWeekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const dayKey = d.toISOString().slice(0, 10);
          weekCreated += createdMap.get(dayKey) || 0;
          weekCompleted += completedMap.get(dayKey) || 0;
        }

        runningCreated += weekCreated;
        runningCompleted += weekCompleted;

        const label = `${new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(currentWeekStart)} - ${new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(weekEnd)}`;

        timeline.push({
          date: startKey,
          label,
          createdCount: weekCreated,
          completedCount: weekCompleted,
          accumulatedCreated: runningCreated,
          accumulatedCompleted: runningCompleted,
          netVelocity: weekCompleted - weekCreated,
        });

        currentWeekStart = new Date(
          currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
        );
      }
    } else {
      // Default: daily sequence
      const dayCount = Math.ceil(
        (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      for (let i = 0; i <= dayCount; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        if (d > now) break;

        const key = d.toISOString().slice(0, 10);
        const createdCount = createdMap.get(key) || 0;
        const completedCount = completedMap.get(key) || 0;

        runningCreated += createdCount;
        runningCompleted += completedCount;

        const label = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(d);

        timeline.push({
          date: key,
          label,
          createdCount,
          completedCount,
          accumulatedCreated: runningCreated,
          accumulatedCompleted: runningCompleted,
          netVelocity: completedCount - createdCount,
        });
      }
    }

    return {
      timeframeDays: days,
      interval,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalCreatedInPeriod: tasksCreated.length,
      totalCompletedInPeriod: tasksCompleted.length,
      netVelocity: tasksCompleted.length - tasksCreated.length,
      avgThroughputPerDay: Number(
        (tasksCompleted.length / Math.max(1, days)).toFixed(2),
      ),
      timeline,
    };
  }

  // 4. Workspace Active Sprint Rollup & Health Indicators
  async getWorkspaceSprintHealth(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const now = new Date();

    const activeSprints = await this.prisma.sprint.findMany({
      where: {
        status: SprintStatus.ACTIVE,
        deletedAt: null,
        project: {
          workspaceId,
          deletedAt: null,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            key: true,
            slug: true,
            color: true,
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            priority: true,
            storyPoints: true,
            estimatedHours: true,
            dueDate: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    const sprintsHealth = activeSprints.map((sprint) => {
      const tasks = sprint.tasks;
      const totalTasks = tasks.length;
      const todoTasks = tasks.filter(
        (t) => t.status === TaskStatus.TODO,
      ).length;
      const inProgressTasks = tasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS,
      ).length;
      const reviewTasks = tasks.filter(
        (t) => t.status === TaskStatus.REVIEW,
      ).length;
      const doneTasks = tasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;

      const totalStoryPoints = tasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      const completedStoryPoints = tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const inProgressStoryPoints = tasks
        .filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const remainingStoryPoints = totalStoryPoints - completedStoryPoints;

      const totalEstimatedHours = tasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );
      const completedEstimatedHours = tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

      // Duration & time progression
      let totalDays: number | null = null;
      let daysRemaining: number | null = null;
      let timeElapsedPercentage = 0;
      let isOverdue = false;

      if (sprint.startDate && sprint.endDate) {
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        const durationMs = end.getTime() - start.getTime();
        totalDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));

        const remainingMs = end.getTime() - now.getTime();
        daysRemaining = Math.round(remainingMs / (1000 * 60 * 60 * 24));
        isOverdue = now > end && doneTasks < totalTasks;

        const elapsedMs = now.getTime() - start.getTime();
        timeElapsedPercentage = Math.min(
          100,
          Math.max(0, Math.round((elapsedMs / durationMs) * 100)),
        );
      } else if (sprint.endDate) {
        const end = new Date(sprint.endDate);
        daysRemaining = Math.round(
          (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        isOverdue = now > end && doneTasks < totalTasks;
      }

      const completionPercentage =
        totalStoryPoints > 0
          ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
          : totalTasks > 0
            ? Math.round((doneTasks / totalTasks) * 100)
            : 0;

      // Health status calculation
      let healthStatus: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'OVERDUE' =
        'ON_TRACK';
      if (isOverdue) {
        healthStatus = 'OVERDUE';
      } else if (timeElapsedPercentage === 0) {
        healthStatus = 'ON_TRACK';
      } else if (completionPercentage >= timeElapsedPercentage) {
        healthStatus = 'ON_TRACK';
      } else if (completionPercentage >= timeElapsedPercentage - 20) {
        healthStatus = 'AT_RISK';
      } else {
        healthStatus = 'BEHIND';
      }

      return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        project: sprint.project,
        taskCounts: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          review: reviewTasks,
          done: doneTasks,
        },
        storyPoints: {
          total: totalStoryPoints,
          completed: completedStoryPoints,
          inProgress: inProgressStoryPoints,
          remaining: remainingStoryPoints,
        },
        estimatedHours: {
          total: totalEstimatedHours,
          completed: completedEstimatedHours,
        },
        totalDays,
        daysRemaining,
        timeElapsedPercentage,
        completionPercentage,
        isOverdue,
        healthStatus,
      };
    });

    const totalCommittedStoryPoints = sprintsHealth.reduce(
      (sum, s) => sum + s.storyPoints.total,
      0,
    );
    const totalCompletedStoryPoints = sprintsHealth.reduce(
      (sum, s) => sum + s.storyPoints.completed,
      0,
    );
    const overallSprintProgressPercentage =
      totalCommittedStoryPoints > 0
        ? Math.round(
            (totalCompletedStoryPoints / totalCommittedStoryPoints) * 100,
          )
        : 0;

    return {
      activeSprintsCount: sprintsHealth.length,
      totalCommittedStoryPoints,
      totalCompletedStoryPoints,
      overallSprintProgressPercentage,
      sprints: sprintsHealth,
    };
  }

  // 5. Per-Project Health & Capacity Rollups
  async getProjectRollups(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const now = new Date();

    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
        _count: {
          select: {
            projectMembers: true,
            boards: true,
          },
        },
        sprints: {
          where: { status: SprintStatus.ACTIVE, deletedAt: null },
          take: 1,
          include: {
            tasks: {
              where: { deletedAt: null },
              select: { id: true, status: true, storyPoints: true },
            },
          },
        },
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  where: { deletedAt: null },
                  select: {
                    id: true,
                    status: true,
                    priority: true,
                    storyPoints: true,
                    estimatedHours: true,
                    dueDate: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });

    return projects.map((project) => {
      const allTasks = project.boards.flatMap((b) =>
        b.columns.flatMap((c) => c.tasks),
      );

      const totalTasks = allTasks.length;
      const todoTasks = allTasks.filter(
        (t) => t.status === TaskStatus.TODO,
      ).length;
      const inProgressTasks = allTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS,
      ).length;
      const reviewTasks = allTasks.filter(
        (t) => t.status === TaskStatus.REVIEW,
      ).length;
      const doneTasks = allTasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;
      const overdueTasks = allTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== TaskStatus.DONE,
      ).length;

      const totalStoryPoints = allTasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      const completedStoryPoints = allTasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const inProgressStoryPoints = allTasks
        .filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const totalEstimatedHours = allTasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );

      const completionPercentage =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      // Active Sprint Info
      const activeSprintEntity = project.sprints[0];
      const activeSprint = activeSprintEntity
        ? {
            id: activeSprintEntity.id,
            name: activeSprintEntity.name,
            startDate: activeSprintEntity.startDate,
            endDate: activeSprintEntity.endDate,
            status: activeSprintEntity.status,
            totalTasks: activeSprintEntity.tasks.length,
            completedTasks: activeSprintEntity.tasks.filter(
              (t) => t.status === TaskStatus.DONE,
            ).length,
            completionPercentage:
              activeSprintEntity.tasks.length > 0
                ? Math.round(
                    (activeSprintEntity.tasks.filter(
                      (t) => t.status === TaskStatus.DONE,
                    ).length /
                      activeSprintEntity.tasks.length) *
                      100,
                  )
                : 0,
          }
        : null;

      // Health status calculation
      let healthStatus:
        | 'HEALTHY'
        | 'NEEDS_ATTENTION'
        | 'CRITICAL'
        | 'ON_HOLD'
        | 'COMPLETED' = 'HEALTHY';

      if (project.status === ProjectStatus.COMPLETED) {
        healthStatus = 'COMPLETED';
      } else if (
        project.status === ProjectStatus.ON_HOLD ||
        project.status === ProjectStatus.ARCHIVED
      ) {
        healthStatus = 'ON_HOLD';
      } else if (
        overdueTasks > 0 ||
        (project.dueDate &&
          new Date(project.dueDate) < now &&
          completionPercentage < 100)
      ) {
        healthStatus = 'CRITICAL';
      } else if (
        project.dueDate &&
        new Date(project.dueDate).getTime() - now.getTime() <
          7 * 24 * 60 * 60 * 1000 &&
        completionPercentage < 50
      ) {
        healthStatus = 'NEEDS_ATTENTION';
      } else {
        healthStatus = 'HEALTHY';
      }

      return {
        id: project.id,
        title: project.title,
        key: project.key,
        slug: project.slug,
        description: project.description,
        status: project.status,
        priority: project.priority,
        color: project.color,
        startDate: project.startDate,
        dueDate: project.dueDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy,
        membersCount: project._count.projectMembers,
        boardsCount: project._count.boards,
        taskCounts: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          review: reviewTasks,
          done: doneTasks,
          overdue: overdueTasks,
        },
        capacity: {
          totalStoryPoints,
          completedStoryPoints,
          inProgressStoryPoints,
          totalEstimatedHours,
        },
        completionPercentage,
        activeSprint,
        healthStatus,
      };
    });
  }

  // 6. Per-Member Workload Breakdown with WIP Limits & Capacity Status
  async getMemberWorkload(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const [members, tasks] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: { select: SAFE_USER_MINIMAL_SELECT },
        },
      }),
      this.prisma.task.findMany({
        where: {
          deletedAt: null,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
        select: {
          id: true,
          assigneeId: true,
          status: true,
          dueDate: true,
          storyPoints: true,
          estimatedHours: true,
        },
      }),
    ]);

    const now = new Date();

    const workloadList = members.map((member) => {
      const userId = member.userId;
      const userTasks = tasks.filter((t) => t.assigneeId === userId);

      const assignedCount = userTasks.length;
      const todoCount = userTasks.filter(
        (t) => t.status === TaskStatus.TODO,
      ).length;
      const inProgressCount = userTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS,
      ).length;
      const reviewCount = userTasks.filter(
        (t) => t.status === TaskStatus.REVIEW,
      ).length;
      const completedCount = userTasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;
      const overdueCount = userTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== TaskStatus.DONE,
      ).length;

      const totalStoryPoints = userTasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      const completedStoryPoints = userTasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const inProgressStoryPoints = userTasks
        .filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const totalEstimatedHours = userTasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );

      const completionRate =
        assignedCount > 0
          ? Math.round((completedCount / assignedCount) * 100)
          : 0;

      // Capacity Status
      let capacityStatus: 'OPTIMAL' | 'OVERLOADED' | 'UNDERLOADED' = 'OPTIMAL';
      const remainingStoryPoints = totalStoryPoints - completedStoryPoints;

      if (
        inProgressCount >= 5 ||
        overdueCount >= 3 ||
        remainingStoryPoints >= 30
      ) {
        capacityStatus = 'OVERLOADED';
      } else if (assignedCount === 0) {
        capacityStatus = 'UNDERLOADED';
      } else {
        capacityStatus = 'OPTIMAL';
      }

      return {
        memberId: member.id,
        role: member.role,
        user: member.user,
        assignedCount,
        todoCount,
        inProgressCount,
        reviewCount,
        completedCount,
        overdueCount,
        completionRate,
        totalStoryPoints,
        completedStoryPoints,
        inProgressStoryPoints,
        totalEstimatedHours,
        capacityStatus,
      };
    });

    return workloadList.sort((a, b) => b.assignedCount - a.assignedCount);
  }
}
