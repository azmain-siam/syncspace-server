/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectHealth,
  ProjectMemberRole,
  ProjectPriority,
  ProjectVisibility,
  WorkspaceRole,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: any;
  let activityService: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Manager',
    email: 'alice@example.com',
  };

  const mockLeadUser: any = {
    id: 'user-lead-2',
    name: 'Bob Lead',
    email: 'bob@example.com',
  };

  beforeEach(async () => {
    prisma = {
      workspaceMember: {
        findUnique: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectMember: {
        create: jest.fn(),
      },
      board: {
        create: jest.fn(),
      },
      projectLink: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      projectStatusUpdate: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default lead as currentUserId and assign MANAGER role', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        title: 'Core Platform',
        slug: 'core-platform',
        key: 'CORE',
        leadId: 'user-1',
        createdById: 'user-1',
        visibility: ProjectVisibility.PUBLIC,
        health: ProjectHealth.ON_TRACK,
      });

      const result = await service.createProject(
        {
          title: 'Core Platform',
          key: 'CORE',
        },
        'ws-1',
        mockUser.id,
      );

      expect(result.id).toBe('proj-1');
      expect(prisma.project.create).toHaveBeenCalled();
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          userId: mockUser.id,
          role: ProjectMemberRole.MANAGER,
        },
      });
      // Lead is creator, so no secondary projectMember.create call for lead
      expect(prisma.projectMember.create).toHaveBeenCalledTimes(1);
      expect(prisma.board.create).toHaveBeenCalled();
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });

    it('should assign distinct lead as LEAD role when leadId is different from currentUserId', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-2',
        title: 'Mobile App',
        slug: 'mobile-app',
        key: 'MOBL',
        leadId: mockLeadUser.id,
        createdById: 'user-1',
      });

      await service.createProject(
        {
          title: 'Mobile App',
          leadId: mockLeadUser.id,
        },
        'ws-1',
        mockUser.id,
      );

      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-2',
          userId: mockUser.id,
          role: ProjectMemberRole.MANAGER,
        },
      });
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-2',
          userId: mockLeadUser.id,
          role: ProjectMemberRole.LEAD,
        },
      });
      expect(prisma.projectMember.create).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException if project key already exists in workspace', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'existing-proj',
        key: 'CORE',
        slug: 'other-slug',
      });

      await expect(
        service.createProject(
          { title: 'Core V2', key: 'CORE' },
          'ws-1',
          mockUser.id,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if project slug already exists in workspace', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'existing-proj',
        key: 'DIFF',
        slug: 'core-platform',
      });

      await expect(
        service.createProject(
          { title: 'Core Platform', key: 'NEWK' },
          'ws-1',
          mockUser.id,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getWorkspaceProjects', () => {
    it('should query all non-archived projects for OWNER/ADMIN role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      });
      prisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          title: 'Public Project',
          visibility: ProjectVisibility.PUBLIC,
        },
        {
          id: 'proj-2',
          title: 'Private Project',
          visibility: ProjectVisibility.PRIVATE,
        },
      ]);

      const result = await service.getWorkspaceProjects('ws-1', mockUser);

      expect(result).toHaveLength(2);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
          }),
        }),
      );
    });

    it('should filter private projects for regular MEMBER role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      prisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          title: 'Public Project',
          visibility: ProjectVisibility.PUBLIC,
        },
      ]);

      const result = await service.getWorkspaceProjects('ws-1', mockUser);

      expect(result).toHaveLength(1);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
            OR: [
              { visibility: ProjectVisibility.PUBLIC },
              { projectMembers: { some: { userId: mockUser.id } } },
            ],
          }),
        }),
      );
    });
  });

  describe('getProject', () => {
    it('should return project if public', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Public Project',
        visibility: ProjectVisibility.PUBLIC,
        projectMembers: [],
      });

      const result = await service.getProject(
        'ws-1',
        '00000000-0000-0000-0000-000000000001',
        mockUser,
      );

      expect(result.id).toBe('00000000-0000-0000-0000-000000000001');
    });

    it('should throw ForbiddenException if project is PRIVATE and user is not member or admin', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Secret Project',
        visibility: ProjectVisibility.PRIVATE,
        projectMembers: [{ userId: 'other-user' }],
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });

      await expect(
        service.getProject(
          'ws-1',
          '00000000-0000-0000-0000-000000000001',
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow viewing PRIVATE project if user is a ProjectMember', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Secret Project',
        visibility: ProjectVisibility.PRIVATE,
        projectMembers: [{ userId: mockUser.id }],
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });

      const result = await service.getProject(
        'ws-1',
        '00000000-0000-0000-0000-000000000001',
        mockUser,
      );

      expect(result.title).toBe('Secret Project');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProject('ws-1', 'non-existent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProject', () => {
    it('should update project fields and log activity', async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce({
          id: '00000000-0000-0000-0000-000000000001',
          title: 'Old Title',
          slug: 'old-title',
          key: 'OLD',
          visibility: ProjectVisibility.PUBLIC,
          priority: ProjectPriority.LOW,
          health: ProjectHealth.ON_TRACK,
        })
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // key check

      prisma.project.update.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        title: 'New Title',
        slug: 'new-title',
        key: 'NEW',
        health: ProjectHealth.AT_RISK,
      });

      const result = await service.updateProject(
        '00000000-0000-0000-0000-000000000001',
        'ws-1',
        {
          title: 'New Title',
          slug: 'new-title',
          key: 'NEW',
          health: ProjectHealth.AT_RISK,
        },
        mockUser,
      );

      expect(result.title).toBe('New Title');
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });

    it('should throw ConflictException if updated slug is taken by another project', async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce({
          id: '00000000-0000-0000-0000-000000000001',
          title: 'Old Title',
          slug: 'old-title',
          key: 'OLD',
          visibility: ProjectVisibility.PUBLIC,
        })
        .mockResolvedValueOnce({
          id: 'other-project-id',
          slug: 'taken-slug',
        });

      await expect(
        service.updateProject(
          '00000000-0000-0000-0000-000000000001',
          'ws-1',
          { slug: 'taken-slug' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if updated key is taken by another project', async () => {
      prisma.project.findFirst
        .mockResolvedValueOnce({
          id: '00000000-0000-0000-0000-000000000001',
          title: 'Old Title',
          slug: 'old-title',
          key: 'OLD',
          visibility: ProjectVisibility.PUBLIC,
        })
        .mockResolvedValueOnce({
          id: 'other-project-id',
          key: 'TAKEN',
        });

      await expect(
        service.updateProject(
          '00000000-0000-0000-0000-000000000001',
          'ws-1',
          { key: 'TAKEN' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Project Links Sub-resource', () => {
    it('should add a project link', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        visibility: ProjectVisibility.PUBLIC,
      });
      prisma.projectLink.create.mockResolvedValue({
        id: 'link-1',
        projectId: 'proj-1',
        title: 'Figma Design',
        url: 'https://figma.com/file/123',
        type: 'FIGMA',
      });

      const result = await service.addProjectLink(
        'ws-1',
        'proj-1',
        {
          title: 'Figma Design',
          url: 'https://figma.com/file/123',
          type: 'FIGMA',
        },
        mockUser,
      );

      expect(result.id).toBe('link-1');
      expect(prisma.projectLink.create).toHaveBeenCalled();
    });

    it('should delete a project link', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        visibility: ProjectVisibility.PUBLIC,
      });
      prisma.projectLink.findUnique.mockResolvedValue({
        id: 'link-1',
        projectId: 'proj-1',
      });
      prisma.projectLink.delete.mockResolvedValue({});

      const result = await service.deleteProjectLink(
        'ws-1',
        'proj-1',
        'link-1',
        mockUser,
      );

      expect(result.message).toBe('Project link deleted successfully');
      expect(prisma.projectLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
    });
  });

  describe('Project Status Updates Sub-resource', () => {
    it('should create status update and synchronize project health', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        visibility: ProjectVisibility.PUBLIC,
      });
      prisma.projectStatusUpdate.create.mockResolvedValue({
        id: 'update-1',
        projectId: 'proj-1',
        health: ProjectHealth.OFF_TRACK,
        message: 'Blocked on 3rd party API',
      });
      prisma.project.update.mockResolvedValue({});

      const result = await service.createStatusUpdate(
        'ws-1',
        'proj-1',
        {
          health: ProjectHealth.OFF_TRACK,
          message: 'Blocked on 3rd party API',
        },
        mockUser,
      );

      expect(result.id).toBe('update-1');
      expect(prisma.projectStatusUpdate.create).toHaveBeenCalled();
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { health: ProjectHealth.OFF_TRACK },
      });
    });
  });

  describe('getProjectTasks', () => {
    it('should return flat list of tasks with pagination and checklist progress', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        workspaceId: 'ws-1',
        title: 'Backend API',
        key: 'SYNC',
        slug: 'backend-api',
      });

      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Implement Labels',
          key: 'SYNC-1',
          priority: 'HIGH',
          status: 'TODO',
          checklists: [
            { id: 'c-1', isCompleted: true },
            { id: 'c-2', isCompleted: false },
          ],
          labels: [{ id: 'l-1', name: 'Feature', color: '#10B981' }],
        },
      ]);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.getProjectTasks('project-1', {
        page: 1,
        limit: 20,
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].checklistProgress).toEqual({
        total: 2,
        completed: 1,
        percentage: 50,
      });
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.getProjectTasks('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteProject (Soft Delete)', () => {
    it('should soft delete project and log activity', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
      });
      prisma.project.update.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
        deletedAt: new Date(),
        status: 'ARCHIVED',
      });

      const result = await service.deleteProject('project-1', 'ws-1', mockUser);

      expect(result.message).toBe('Project deleted successfully');
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });

  describe('restoreProject', () => {
    it('should restore project and log activity', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
      });
      prisma.project.update.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
        deletedAt: null,
        status: 'ACTIVE',
      });

      const result = await service.restoreProject(
        'project-1',
        'ws-1',
        mockUser,
      );

      expect(result.status).toBe('ACTIVE');
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });
});
