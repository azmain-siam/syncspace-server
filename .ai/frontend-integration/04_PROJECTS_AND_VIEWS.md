# Module 4: Projects & Views (`/projects`, `/workspaces/:workspaceId/projects`)

> **Integration Target:** Project List, Project Creation & Settings, Project Archival/Deletion/Restore, and Flat Table/List View with Filters & Sorting  
> **Backend Base URL:** `http://localhost:5000/api/v1`  
> **Auth Type:** Bearer JWT (`Authorization: Bearer <accessToken>`)  

---

## 1. Endpoints Overview

All endpoints in this module require an active session (`Authorization: Bearer <accessToken>`).

| Method | Endpoint | Required Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces/:workspaceId/projects` | Any Member | List active (non-archived, non-deleted) projects in workspace |
| `POST` | `/workspaces/:workspaceId/projects` | `OWNER`, `ADMIN` | Create a new project (Auto-generates project key & slug) |
| `GET` | `/workspaces/:workspaceId/projects/:projectId` | Any Member | Get single project details by UUID or slug |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId` | `OWNER`, `ADMIN` | Update project title, description, priority, color, due date, status |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/archive` | `OWNER` | Archive project (Sets status to `ARCHIVED`) |
| `DELETE` | `/workspaces/:workspaceId/projects/:projectId` | `OWNER`, `ADMIN` | Soft-delete project (Movable to Trash) |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/restore` | `OWNER`, `ADMIN` | Restore soft-deleted / archived project to `ACTIVE` |
| `GET` | `/projects/:projectId/tasks` | Any Member | **Flat Table/List View API** with multi-column sorting, search, & checklist progress |

---

## 2. Core TypeScript Interfaces & Enums

### Enums
```typescript
export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

### Project Model
```typescript
export interface Project {
  id: string;
  workspaceId: string;
  title: string;
  key: string;              // Auto-generated human-readable prefix (e.g. "ENG", "GEN")
  slug: string;             // URL-friendly slug
  taskCounter: number;      // Sequence number for task keys
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  color: string | null;     // Hex color code (e.g. "#4F46E5")
  startDate: string | null; // ISO 8601 Date string
  dueDate: string | null;   // ISO 8601 Date string
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### Flat Table View Task Model
```typescript
export interface TableViewTask {
  id: string;
  key: string;               // e.g. "ENG-42"
  taskNumber: number;        // e.g. 42
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  storyPoints: number | null;
  estimatedHours: number | null;
  dueDate: string | null;
  isBacklog: boolean;
  sprintId: string | null;
  columnId: string;
  createdBy: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  column: {
    id: string;
    title: string;
    order: number;
    board: {
      id: string;
      title: string;
    };
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  checklists: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    order: number;
  }>;
  checklistProgress: {
    total: number;
    completed: number;
    percentage: number;      // 0 to 100
  };
  _count: {
    comments: number;
    attachments: number;
    checklists: number;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProjectTasksTableResponse {
  project: {
    id: string;
    title: string;
    key: string;
    slug: string;
    workspaceId: string;
  };
  tasks: TableViewTask[];
  meta: PaginationMeta;
}
```

---

## 3. Endpoint Specifications

### 3.1 Get Workspace Projects
Fetches all non-archived, non-deleted projects for the active workspace.

- **Route:** `GET /api/v1/workspaces/:workspaceId/projects`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Projects fetched successfully",
  "data": [
    {
      "id": "p1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      "workspaceId": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
      "title": "General",
      "key": "GEN",
      "slug": "general",
      "taskCounter": 2,
      "description": "Default project for team collaboration",
      "status": "ACTIVE",
      "priority": "MEDIUM",
      "color": "#3B82F6",
      "startDate": "2026-09-18T10:00:00.000Z",
      "dueDate": null,
      "createdById": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z",
      "deletedAt": null
    }
  ]
}
```

---

### 3.2 Create Project
Creates a new project within a workspace.  
✨ The backend auto-generates a clean human key (`GEN`, `ENG`, `SYNC`) and a URL-friendly slug.

- **Route:** `POST /api/v1/workspaces/:workspaceId/projects`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface CreateProjectRequest {
  title: string;              // 2 to 100 characters (Required)
  description?: string;       // Max 1000 characters
  dueDate?: string;           // ISO 8601 date string (e.g. "2026-12-31T23:59:59Z")
  color?: string;             // Valid Hex color (e.g. "#4F46E5")
  priority?: ProjectPriority; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" (Default: "MEDIUM")
}
```

#### Request Example
```json
{
  "title": "Core Platform API",
  "description": "Backend API development, auth, and database scaling",
  "priority": "HIGH",
  "color": "#6366F1",
  "dueDate": "2026-12-31T00:00:00.000Z"
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Project created successfully",
  "data": {
    "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
    "workspaceId": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
    "title": "Core Platform API",
    "key": "COR",
    "slug": "core-platform-api",
    "taskCounter": 0,
    "description": "Backend API development, auth, and database scaling",
    "status": "ACTIVE",
    "priority": "HIGH",
    "color": "#6366F1",
    "startDate": "2026-09-18T14:00:00.000Z",
    "dueDate": "2026-12-31T00:00:00.000Z",
    "createdById": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
    "createdAt": "2026-09-18T14:00:00.000Z",
    "updatedAt": "2026-09-18T14:00:00.000Z",
    "deletedAt": null
  }
}
```

#### Errors
- `400 Bad Request`: Validation failure (e.g. `["title must be longer than or equal to 2 characters", "color must be a hexadecimal color"]`).
- `403 Forbidden`: User is a `MEMBER` or `GUEST` (Only Owner and Admin can create projects).

---

### 3.3 Get Project by ID or Slug
- **Route:** `GET /api/v1/workspaces/:workspaceId/projects/:projectId`  
  *(Accepts either UUID `e4f5a6b7-...` or slug `core-platform-api`)*
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
Returns the single `Project` object.

#### Errors
- `404 Not Found`: `"Project not found"`

---

### 3.4 Update Project
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  color?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus; // "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED"
}
```

#### Success Response (200 OK)
Returns the updated `Project` object.

---

### 3.5 Archive Project
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/archive`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER` only.

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project archived successfully",
  "data": {
    "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
    "status": "ARCHIVED"
  }
}
```

---

### 3.6 Soft-Delete Project (Move to Trash)
- **Route:** `DELETE /api/v1/workspaces/:workspaceId/projects/:projectId`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project deleted successfully",
  "data": {
    "message": "Project deleted successfully",
    "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b"
  }
}
```

---

### 3.7 Restore Soft-Deleted / Archived Project
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/restore`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project restored successfully",
  "data": {
    "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
    "status": "ACTIVE",
    "deletedAt": null
  }
}
```

---

### 3.8 Project Flat Table / List View API
This endpoint powers the **Project Table View / List View**, offering multi-column sorting, multi-attribute filtering, subtask checklist progress, and search.

- **Route:** `GET /api/v1/projects/:projectId/tasks`  
  *(Also accessible via `GET /api/v1/workspaces/:workspaceId/projects/:projectId/tasks`)*
- **Headers:** `Authorization: Bearer <accessToken>`

#### Query Parameters
| Param | Type | Default | Options / Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Min: 1 | Current pagination page |
| `limit` | `number` | `20` | Min: 1, Max: 100 | Items per page |
| `sortBy` | `string` | `'order'` | `'dueDate' \| 'priority' \| 'status' \| 'createdAt' \| 'title' \| 'order'` | Sort field |
| `sortOrder` | `string` | `'asc'` | `'asc' \| 'desc'` | Sort direction |
| `status` | `string` | Optional | `'TODO' \| 'IN_PROGRESS' \| 'IN_REVIEW' \| 'DONE' \| 'CANCELLED'` | Filter by status |
| `priority` | `string` | Optional | `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'URGENT'` | Filter by priority |
| `assigneeId`| `string` | Optional | UUID string | Filter by assigned user |
| `labelId` | `string` | Optional | UUID string | Filter by label tag |
| `search` | `string` | Optional | Text or Key | Search in title, description, or key (`GEN-1`) |

#### Example Query URL
```text
GET /api/v1/projects/core-platform-api/tasks?page=1&limit=20&sortBy=dueDate&sortOrder=asc&priority=HIGH&search=auth
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project tasks fetched successfully",
  "data": {
    "project": {
      "id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
      "title": "Core Platform API",
      "key": "COR",
      "slug": "core-platform-api",
      "workspaceId": "f29a1b02-5e48-47e2-8926-d62194f1c93a"
    },
    "tasks": [
      {
        "id": "t1a2b3c4-1111-2222-3333-444455556666",
        "key": "COR-1",
        "taskNumber": 1,
        "title": "Implement JWT Refresh Token Rotation",
        "description": "Ensure refresh tokens are hashed and stored in database",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "order": 0,
        "storyPoints": 5,
        "estimatedHours": 8,
        "dueDate": "2026-09-25T18:00:00.000Z",
        "isBacklog": false,
        "sprintId": "sp_12345",
        "columnId": "col_progress",
        "createdBy": "user_1",
        "assigneeId": "user_1",
        "createdAt": "2026-09-18T14:10:00.000Z",
        "updatedAt": "2026-09-18T14:30:00.000Z",
        "assignee": {
          "id": "user_1",
          "name": "Alex Johnson",
          "email": "alex@example.com",
          "avatar": "https://res.cloudinary.com/.../avatar.png"
        },
        "column": {
          "id": "col_progress",
          "title": "In Progress",
          "order": 1,
          "board": {
            "id": "board_main",
            "title": "Main Board"
          }
        },
        "labels": [
          {
            "id": "lbl_auth",
            "name": "Security",
            "color": "#EF4444"
          }
        ],
        "checklists": [
          {
            "id": "chk_1",
            "title": "Create VerificationToken model",
            "isCompleted": true,
            "order": 0
          },
          {
            "id": "chk_2",
            "title": "Add refresh rotation endpoint",
            "isCompleted": true,
            "order": 1
          }
        ],
        "checklistProgress": {
          "total": 2,
          "completed": 2,
          "percentage": 100
        },
        "_count": {
          "comments": 4,
          "attachments": 1,
          "checklists": 2
        }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## 4. Frontend AI Agent Recipes

### 4.1 Zod Validation Schemas
```typescript
import { z } from 'zod';
import { ProjectPriority, ProjectStatus } from '@/types/project';

export const createProjectSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code').optional().or(z.literal('')),
  priority: z.nativeEnum(ProjectPriority).default(ProjectPriority.MEDIUM),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});
```

---

### 4.2 TanStack Query Hooks Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, Project, ProjectTasksTableResponse, CreateProjectRequest, UpdateProjectRequest } from '@/types/project';

// 1. Fetch Projects for active workspace
export const useWorkspaceProjects = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'projects'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Project[]>>(
        `/workspaces/${workspaceId}/projects`
      );
      return response.data.data;
    },
    enabled: !!workspaceId,
  });
};

// 2. Fetch Single Project by UUID or slug
export const useProject = (workspaceId: string, projectIdOrSlug: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'projects', projectIdOrSlug],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Project>>(
        `/workspaces/${workspaceId}/projects/${projectIdOrSlug}`
      );
      return response.data.data;
    },
    enabled: !!workspaceId && !!projectIdOrSlug,
  });
};

// 3. Fetch Flat Table View of Project Tasks
export const useProjectTasksTable = (
  projectIdOrSlug: string,
  queryParams: Record<string, any> = {}
) => {
  return useQuery({
    queryKey: ['projects', projectIdOrSlug, 'tasks-table', queryParams],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ProjectTasksTableResponse>>(
        `/projects/${projectIdOrSlug}/tasks`,
        { params: queryParams }
      );
      return response.data.data;
    },
    enabled: !!projectIdOrSlug,
  });
};

// 4. Create Project Mutation
export const useCreateProject = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectRequest) => {
      const response = await apiClient.post<ApiResponse<Project>>(
        `/workspaces/${workspaceId}/projects`,
        dto
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'projects'] });
    },
  });
};

// 5. Delete Project Mutation (Soft Delete)
export const useDeleteProject = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'projects'] });
    },
  });
};
```
