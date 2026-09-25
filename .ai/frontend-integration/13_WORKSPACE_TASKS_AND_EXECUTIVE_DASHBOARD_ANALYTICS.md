# Module 13: Workspace Tasks & Executive Dashboard Analytics

> **Prefix**: `/api/v1`  
> **Target Audience**: Frontend Engineers / Frontend AI Agents  
> **Auth Required**: Bearer JWT (`Authorization: Bearer <accessToken>`)  
> **Response Wrapper**: All successful JSON responses follow the standardized envelope `{ success: true, statusCode: number, message: string, data: T }`.

---

## 🎯 1. Overview & Purpose

Module 13 provides the two high-leverage data surfaces for enterprise project management:
1. **Workspace-Wide Task Query (`/workspaces/:id/tasks`)**: Cross-project task querying, filtering (status, priority, assignee, due date, sprint, overdue, search), sorting, pagination, and multi-dimensional grouping (`groupBy: 'project' | 'priority' | 'status' | 'dueDate' | 'assignee' | 'none'`).
2. **Executive Dashboard Analytics (`/workspaces/:id/dashboard/*`)**:
   - `/summary`: KPI summary cards (total tasks, completion rate, overdue count, active projects, active sprints) with comparative period trend deltas (`comparisonPeriod: '7d' | '30d' | 'previous_period' | 'none'`).
   - `/timeseries`: Velocity & completion trends over daily, weekly, or monthly intervals.
   - `/projects`: Executive multi-project rollup cards with progress percentages, health badges (`ON_TRACK`, `AT_RISK`, `OFF_TRACK`), assigned leads, project icons, visibility, repo URLs, and overdue alerts.
   - `/members`: Workload & velocity distribution across workspace team members.

---

## 🏗️ 2. TypeScript Types & Enums

```typescript
export enum ProjectHealth {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  OFF_TRACK = 'OFF_TRACK',
}

export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ProjectRollup {
  id: string;
  title: string;
  key: string;
  slug: string;
  color: string;
  icon: string | null;
  brief: string | null;
  visibility: ProjectVisibility;
  executiveHealth: ProjectHealth;
  repoUrl: string | null;
  lead: UserMinimal | null;
  status: string;
  taskCounts: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
  progressPercentage: number;
  dueDate: string | null;
}

export interface DashboardSummary {
  kpis: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number; // 0 - 100
    overdueTasks: number;
    activeProjects: number;
    activeSprints: number;
  };
  trends?: {
    taskDelta: number; // e.g. +12
    completionRateDelta: number; // e.g. +4.2 pts
    overdueDelta: number; // e.g. -2
  };
}

export interface WorkspaceTaskItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  order: number;
  storyPoints: number | null;
  estimatedHours: number | null;
  isOverdue: boolean;
  assignee: UserMinimal | null;
  project: {
    id: string;
    title: string;
    key: string;
    slug: string;
    color: string;
  };
  column: {
    id: string;
    title: string;
    board: { id: string; title: string };
  };
  labels: Array<{ id: string; name: string; color: string }>;
  checklistProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

export interface WorkspaceTasksResponse {
  tasks?: WorkspaceTaskItem[];
  groups?: Array<{
    groupKey: string;
    groupLabel: string;
    total: number;
    tasks: WorkspaceTaskItem[];
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

---

## 📡 3. Endpoints

### 3.1 Workspace Task Query & Multi-Dimensional Grouping
- **Method**: `GET`
- **URL**: `/api/v1/workspaces/:workspaceId/tasks`
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
  - `status`: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE` (or comma-separated)
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT` (or comma-separated)
  - `projectId`: string (Project UUID)
  - `assigneeId`: string (User UUID or `unassigned`)
  - `sprintId`: string (Sprint UUID)
  - `isOverdue`: boolean (`true` | `false`)
  - `search`: string
  - `sortBy`: `dueDate` | `priority` | `status` | `createdAt` | `title` | `order`
  - `sortOrder`: `asc` | `desc`
  - `groupBy`: `none` | `project` | `priority` | `status` | `dueDate` | `assignee`

---

### 3.2 Executive Project Rollups
- **Method**: `GET`
- **URL**: `/api/v1/workspaces/:workspaceId/dashboard/projects`
- **Permissions**: Workspace member

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project rollups retrieved successfully",
  "data": [
    {
      "id": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
      "title": "Auth & SSO Service",
      "key": "AUTH",
      "slug": "auth-and-sso-service",
      "color": "#3B82F6",
      "icon": "shield-check",
      "brief": "# Scope\nDeliver Okta & Google OAuth2 SSO.",
      "visibility": "PUBLIC",
      "executiveHealth": "ON_TRACK",
      "repoUrl": "https://github.com/syncspace/auth-service",
      "status": "ACTIVE",
      "lead": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Alex Techlead",
        "email": "alex@syncspace.io",
        "avatarUrl": null
      },
      "taskCounts": {
        "total": 12,
        "completed": 8,
        "inProgress": 3,
        "todo": 1,
        "overdue": 0
      },
      "progressPercentage": 67,
      "dueDate": "2026-12-15T00:00:00.000Z"
    }
  ]
}
```

---

### 3.3 Dashboard KPI Summary with Comparative Baseline
- **Method**: `GET`
- **URL**: `/api/v1/workspaces/:workspaceId/dashboard/summary`
- **Query Parameters**:
  - `compareTo`: `7d` | `30d` | `previous_period` | `none`

---

### 3.4 Velocity & Completion Time Series
- **Method**: `GET`
- **URL**: `/api/v1/workspaces/:workspaceId/dashboard/timeseries`
- **Query Parameters**:
  - `interval`: `day` | `week` | `month`
  - `startDate`: ISO 8601 Date String
  - `endDate`: ISO 8601 Date String

---

### 3.5 Member Workload & Velocity Distribution
- **Method**: `GET`
- **URL**: `/api/v1/workspaces/:workspaceId/dashboard/members`
