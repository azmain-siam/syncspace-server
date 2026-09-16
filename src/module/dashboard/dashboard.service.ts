import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

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

  // 1. High-level KPI Summary
  async getWorkspaceSummary(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const now = new Date();

    const [
      projectsCount,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      membersCount,
      activitiesCount,
      totalCapacity,
      completedCapacity,
    ] = await Promise.all([
      // Projects count
      this.prisma.project.count({
        where: { workspaceId, deletedAt: null },
      }),
      // Total tasks
      this.prisma.task.count({
        where: {
          deletedAt: null,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
      }),
      // Completed tasks
      this.prisma.task.count({
        where: {
          deletedAt: null,
          status: TaskStatus.DONE,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
      }),
      // In Progress tasks
      this.prisma.task.count({
        where: {
          deletedAt: null,
          status: TaskStatus.IN_PROGRESS,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
      }),
      // Overdue tasks (dueDate < now AND status != DONE)
      this.prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: { lt: now },
          status: { not: TaskStatus.DONE },
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
      }),
      // Members count
      this.prisma.workspaceMember.count({
        where: { workspaceId },
      }),
      // Total activities logged
      this.prisma.workspaceActivity.count({
        where: { workspaceId },
      }),
      // Total story points and estimated hours
      this.prisma.task.aggregate({
        where: {
          deletedAt: null,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
        _sum: {
          storyPoints: true,
          estimatedHours: true,
        },
      }),
      // Completed story points
      this.prisma.task.aggregate({
        where: {
          deletedAt: null,
          status: TaskStatus.DONE,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        },
        _sum: {
          storyPoints: true,
        },
      }),
    ]);

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      projectsCount,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      membersCount,
      activitiesCount,
      completionPercentage,
      totalStoryPoints: totalCapacity._sum.storyPoints || 0,
      completedStoryPoints: completedCapacity._sum.storyPoints || 0,
      totalEstimatedHours: totalCapacity._sum.estimatedHours || 0,
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

  // 3. Time-Series Productivity Metrics
  async getProductivityMetrics(
    workspaceId: string,
    queryDto: AnalyticsQueryDto,
  ) {
    await this.verifyWorkspace(workspaceId);

    const days = queryDto.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const baseWhere = {
      deletedAt: null,
      column: { board: { project: { workspaceId, deletedAt: null } } },
    };

    const [tasksCreated, tasksCompleted] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          ...baseWhere,
          status: TaskStatus.DONE,
          updatedAt: { gte: startDate },
        },
        select: { updatedAt: true },
      }),
    ]);

    return {
      timeframeDays: days,
      startDate,
      totalCreatedInPeriod: tasksCreated.length,
      totalCompletedInPeriod: tasksCompleted.length,
    };
  }

  // 4. Per-Member Workload Breakdown
  async getMemberWorkload(workspaceId: string) {
    await this.verifyWorkspace(workspaceId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });

    const now = new Date();

    const workloadList = await Promise.all(
      members.map(async (member) => {
        const userId = member.userId;
        const taskWhere = {
          assigneeId: userId,
          deletedAt: null,
          column: { board: { project: { workspaceId, deletedAt: null } } },
        };

        const [
          assignedCount,
          completedCount,
          overdueCount,
          capacityAgg,
          completedCapacityAgg,
        ] = await Promise.all([
          this.prisma.task.count({ where: taskWhere }),
          this.prisma.task.count({
            where: { ...taskWhere, status: TaskStatus.DONE },
          }),
          this.prisma.task.count({
            where: {
              ...taskWhere,
              dueDate: { lt: now },
              status: { not: TaskStatus.DONE },
            },
          }),
          this.prisma.task.aggregate({
            where: taskWhere,
            _sum: {
              storyPoints: true,
              estimatedHours: true,
            },
          }),
          this.prisma.task.aggregate({
            where: { ...taskWhere, status: TaskStatus.DONE },
            _sum: {
              storyPoints: true,
            },
          }),
        ]);

        const completionRate =
          assignedCount > 0
            ? Math.round((completedCount / assignedCount) * 100)
            : 0;

        return {
          memberId: member.id,
          role: member.role,
          user: member.user,
          assignedCount,
          completedCount,
          overdueCount,
          completionRate,
          totalStoryPoints: capacityAgg._sum.storyPoints || 0,
          completedStoryPoints: completedCapacityAgg._sum.storyPoints || 0,
          totalEstimatedHours: capacityAgg._sum.estimatedHours || 0,
        };
      }),
    );

    return workloadList.sort((a, b) => b.assignedCount - a.assignedCount);
  }
}
