import { Injectable, NotFoundException } from '@nestjs/common';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // Workspace-scoped Search
  async searchWorkspace(workspaceId: string, queryDto: SearchQueryDto) {
    const { q, type = SearchType.ALL, limit = 20 } = queryDto;

    // Verify workspace existence
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const searchTerm = q.trim();

    const results: {
      projects?: any[];
      tasks?: any[];
      comments?: any[];
      members?: any[];
    } = {};

    const perCategoryLimit = limit;

    // Search Projects
    if (type === SearchType.ALL || type === SearchType.PROJECTS) {
      results.projects = await this.prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { slug: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: perCategoryLimit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      });
    }

    // Search Tasks
    if (type === SearchType.ALL || type === SearchType.TASKS) {
      results.tasks = await this.prisma.task.findMany({
        where: {
          deletedAt: null,
          column: {
            board: {
              project: {
                workspaceId,
                deletedAt: null,
              },
            },
          },
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: perCategoryLimit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          columnId: true,
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
          column: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  id: true,
                  title: true,
                  projectId: true,
                },
              },
            },
          },
        },
      });
    }

    // Search Comments
    if (type === SearchType.ALL || type === SearchType.COMMENTS) {
      results.comments = await this.prisma.comment.findMany({
        where: {
          deletedAt: null,
          content: { contains: searchTerm, mode: 'insensitive' },
          task: {
            deletedAt: null,
            column: {
              board: {
                project: {
                  workspaceId,
                  deletedAt: null,
                },
              },
            },
          },
        },
        take: perCategoryLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          isEdited: true,
          createdAt: true,
          taskId: true,
          user: { select: SAFE_USER_MINIMAL_SELECT },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    }

    // Search Members
    if (type === SearchType.ALL || type === SearchType.MEMBERS) {
      const members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          user: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { username: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
        take: perCategoryLimit,
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      results.members = members.map((m) => ({
        memberId: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        ...m.user,
      }));
    }

    return {
      query: searchTerm,
      type,
      results,
    };
  }
}
