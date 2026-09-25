# Module 13: Workspace Task Intelligence & Executive Dashboard Analytics

This document is the comprehensive, definitive frontend integration guide for the **Workspace-Wide Task Intelligence Engine and Executive Dashboard Analytics** in SyncSpace. It brings together cross-project task querying, KPI card drill-downs, historical trend baselines, zero-filled time-series velocity, active sprint health monitors, project portfolio rollups, and team member workload balancing with WIP limits.

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed | Primary Frontend View |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/tasks` | Workspace task explorer & KPI drill-down query engine | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | Cross-Project Task Explorer / KPI Modal |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/summary` | High-level workspace KPI cards with historical trend deltas | `OWNER`, `ADMIN`, `MEMBER` | Dashboard Executive KPI Cards |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/task-distribution` | Task distribution grouped by status & priority | `OWNER`, `ADMIN`, `MEMBER` | Status Donut & Priority Stacked Bar |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/productivity` | Contiguous zero-filled daily/weekly time series | `OWNER`, `ADMIN`, `MEMBER` | Burn-Up & Velocity Area Charts |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/sprint-health` | Active sprint rollups, progress %, and health indicators | `OWNER`, `ADMIN`, `MEMBER` | Active Sprint Health Banner |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/project-rollups` | Per-project health, capacity, task counts & active sprint | `OWNER`, `ADMIN`, `MEMBER` | Portfolio Health & Progress Table |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/member-workload` | Member assignment, WIP limits, overdue & capacity breakdown | `OWNER`, `ADMIN`, `MEMBER` | Team Workload & Capacity Table |

---

## 2. TypeScript Interfaces, Types & Enums

```typescript
// ==========================================
// 2.1 Enums
// ==========================================

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum AnalyticsInterval {
  DAY = 'day',
  WEEK = 'week',
}

export enum WorkspaceTasksGroupBy {
  NONE = 'none',
  STATUS = 'status',
  PRIORITY = 'priority',
  PROJECT = 'project',
  ASSIGNEE = 'assignee',
}

export enum WorkspaceTasksDueDateFilter {
  OVERDUE = 'overdue',
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  NO_DUE_DATE = 'no_due_date',
}

export type SprintHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'OVERDUE';
export type ProjectHealthStatus = 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'ON_HOLD' | 'COMPLETED';
export type MemberCapacityStatus = 'OPTIMAL' | 'OVERLOADED' | 'UNDERLOADED';

// ==========================================
// 2.2 Shared Models
// ==========================================

export interface UserMinimal {
  id: string;
  username?: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface TaskLabelMinimal {
  id: string;
  name: string;
  color: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==========================================
// 2.3 Workspace Tasks Query Models
// ==========================================

export interface WorkspaceTasksQueryDto {
  status?: TaskStatus | TaskStatus[] | string;
  priority?: TaskPriority | TaskPriority[] | string;
  assigneeId?: string; // UUID, 'me', or 'unassigned' / 'none'
  projectId?: string | string[];
  sprintId?: string; // UUID or 'none'
  isBacklog?: boolean;
  dueDate?: 'today' | 'overdue' | 'upcoming' | 'this_week' | 'nodate' | 'no_due_date';
  search?: string;
  sortBy?: 'dueDate' | 'priority' | 'status' | 'createdAt' | 'updatedAt' | 'title' | 'order';
  sortOrder?: 'asc' | 'desc';
  groupBy?: 'none' | 'project' | 'priority' | 'status' | 'dueDate' | 'assignee';
  page?: number;
  limit?: number;
}

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export interface WorkspaceTaskItem {
  id: string;
  key: string | null;
  taskNumber: number | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  order: number;
  isBacklog: boolean;
  storyPoints: number | null;
  estimatedHours: number | null;
  createdAt: string;
  updatedAt: string;
  assignee: UserMinimal | null;
  creator: UserMinimal;
  permissions: TaskPermissions;
  column: {
    id: string;
    title: string;
    board: {
      id: string;
      title: string;
      project: {
        id: string;
        title: string;
        key: string | null;
        slug: string | null;
        color: string | null;
      };
    };
  };
  sprint: {
    id: string;
    name: string;
    status: SprintStatus;
  } | null;
  labels: TaskLabelMinimal[];
  _count: {
    comments: number;
    attachments: number;
    checklists: number;
    links: number;
  };
}

export interface FlatWorkspaceTasksResponse {
  tasks: WorkspaceTaskItem[];
  meta: PaginationMeta;
}

export interface GroupedWorkspaceTasksResponse {
  groupedBy: WorkspaceTasksGroupBy;
  groups: Array<{
    key: string;
    label: string;
    tasksCount: number;
    tasks: WorkspaceTaskItem[];
    hasMore: boolean;
  }>;
  grouped?: Record<string, WorkspaceTaskItem[]>;
  tasks: WorkspaceTaskItem[];
  meta: PaginationMeta;
}

// ==========================================
// 2.4 Dashboard Summary & Metrics Models
// ==========================================

export interface PeriodMetrics {
  startDate: string;
  endDate: string;
  createdTasks: number;
  completedTasks: number;
  completedStoryPoints: number;
}

export interface DashboardSummaryResponse {
  projectsCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  membersCount: number;
  activitiesCount: number;
  completionPercentage: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalEstimatedHours: number;
  periodDays: number;
  currentPeriod: PeriodMetrics;
  previousPeriod: PeriodMetrics;
  deltas: {
    createdTasksDelta: number;
    completedTasksDelta: number;
    completedStoryPointsDelta: number;
  };
}

export interface TaskDistributionResponse {
  byStatus: Array<{ status: TaskStatus; count: number }>;
  byPriority: Array<{ priority: TaskPriority; count: number }>;
}

export interface ProductivityTimelineItem {
  date: string;
  label: string;
  createdCount: number;
  completedCount: number;
  accumulatedCreated: number;
  accumulatedCompleted: number;
  netVelocity: number;
}

export interface ProductivityMetricsResponse {
  timeframeDays: number;
  interval: AnalyticsInterval;
  startDate: string;
  endDate: string;
  totalCreatedInPeriod: number;
  totalCompletedInPeriod: number;
  netVelocity: number;
  avgThroughputPerDay: number;
  timeline: ProductivityTimelineItem[];
}

export interface SprintHealthItem {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  project: {
    id: string;
    title: string;
    key: string | null;
    slug: string | null;
    color: string | null;
  };
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  storyPoints: {
    total: number;
    completed: number;
    inProgress: number;
    remaining: number;
  };
  estimatedHours: {
    total: number;
    completed: number;
  };
  totalDays: number | null;
  daysRemaining: number | null;
  timeElapsedPercentage: number;
  completionPercentage: number;
  isOverdue: boolean;
  healthStatus: SprintHealthStatus;
}

export interface WorkspaceSprintHealthResponse {
  activeSprintsCount: number;
  totalCommittedStoryPoints: number;
  totalCompletedStoryPoints: number;
  overallSprintProgressPercentage: number;
  sprints: SprintHealthItem[];
}

export interface ProjectRollupItem {
  id: string;
  title: string;
  key: string | null;
  slug: string | null;
  description: string | null;
  status: ProjectStatus;
  priority: string;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserMinimal;
  membersCount: number;
  boardsCount: number;
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
  };
  capacity: {
    totalStoryPoints: number;
    completedStoryPoints: number;
    inProgressStoryPoints: number;
    totalEstimatedHours: number;
  };
  completionPercentage: number;
  activeSprint: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    status: SprintStatus;
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
  } | null;
  healthStatus: ProjectHealthStatus;
}

export interface MemberWorkloadItem {
  memberId: string;
  role: WorkspaceRole;
  user: UserMinimal;
  assignedCount: number;
  todoCount: number;
  inProgressCount: number;
  reviewCount: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number; // 0 to 100
  totalStoryPoints: number;
  completedStoryPoints: number;
  inProgressStoryPoints: number;
  totalEstimatedHours: number;
  capacityStatus: MemberCapacityStatus;
}
```

---

## 3. Detailed Endpoint Contracts & JSON Payloads

### 3.1 Workspace-Wide Task Query Engine
Searches, filters, groups, and paginates all tasks across all projects and boards within a workspace.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/tasks`
- **Query Parameters:**
  - `status` *(optional, enum: `'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'`)*
  - `priority` *(optional, enum: `'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'`)*
  - `assigneeId` *(optional, string/UUID)*
  - `projectId` *(optional, string/UUID)*
  - `sprintId` *(optional, string/UUID)*
  - `isBacklog` *(optional, boolean)*
  - `dueDate` *(optional, enum: `'overdue' | 'today' | 'this_week' | 'no_due_date'`)*
  - `search` *(optional, string, min 1 char)*: Case-insensitive search on title & key.
  - `sortBy` *(optional, default `'dueDate'`, enum: `'dueDate' | 'priority' | 'createdAt' | 'updatedAt' | 'title' | 'order'`)*
  - `sortOrder` *(optional, default `'asc'`, enum: `'asc' | 'desc'`)*
  - `groupBy` *(optional, default `'none'`, enum: `'none' | 'status' | 'priority' | 'project' | 'assignee'`)*
  - `page` *(optional, default `1`, integer)*
  - `limit` *(optional, default `20`, integer, max `100`)*

#### Example 1: Flat Paginated Query (`dueDate=overdue`)
`GET /api/v1/workspaces/ws-uuid-1/tasks?dueDate=overdue&page=1&limit=20`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace tasks fetched successfully",
  "data": {
    "tasks": [
      {
        "id": "task-uuid-10",
        "key": "AUTH-12",
        "taskNumber": 12,
        "title": "Fix OAuth token refresh race condition",
        "description": "Token rotation fails when concurrent requests fire",
        "priority": "URGENT",
        "status": "IN_PROGRESS",
        "dueDate": "2026-09-20T18:00:00.000Z",
        "order": 1,
        "isBacklog": false,
        "storyPoints": 5,
        "estimatedHours": 6.5,
        "createdAt": "2026-09-18T10:00:00.000Z",
        "updatedAt": "2026-09-24T14:30:00.000Z",
        "assignee": {
          "id": "user-uuid-1",
          "username": "siam",
          "name": "Siam Admin",
          "email": "siam@example.com",
          "avatar": null
        },
        "creator": {
          "id": "user-uuid-2",
          "username": "janedoe",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "column": {
          "id": "col-uuid-1",
          "title": "In Progress",
          "board": {
            "id": "board-uuid-1",
            "title": "Main Board",
            "project": {
              "id": "proj-uuid-1",
              "title": "Auth & SSO Service",
              "key": "AUTH",
              "slug": "auth-and-sso-service",
              "color": "#3B82F6"
            }
          }
        },
        "sprint": {
          "id": "sprint-uuid-1",
          "name": "Sprint 14",
          "status": "ACTIVE"
        },
        "labels": [
          {
            "label": {
              "id": "label-uuid-1",
              "name": "Bug",
              "color": "#EF4444"
            }
          }
        ],
        "_count": {
          "comments": 4,
          "attachments": 1,
          "checklists": 3,
          "links": 2
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

#### Example 2: Grouped Query (`groupBy=status`)
`GET /api/v1/workspaces/ws-uuid-1/tasks?groupBy=status`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace tasks fetched successfully",
  "data": {
    "groupedBy": "status",
    "groups": [
      {
        "key": "TODO",
        "label": "TODO",
        "tasksCount": 5,
        "tasks": [ ... ]
      },
      {
        "key": "IN_PROGRESS",
        "label": "IN_PROGRESS",
        "tasksCount": 11,
        "tasks": [ ... ]
      },
      {
        "key": "REVIEW",
        "label": "REVIEW",
        "tasksCount": 0,
        "tasks": []
      },
      {
        "key": "DONE",
        "label": "DONE",
        "tasksCount": 32,
        "tasks": [ ... ]
      }
    ],
    "total": 48
  }
}
```

---

### 3.2 Workspace Dashboard Summary & Historical Deltas
Calculates workspace KPI cards and historical period deltas ($T_0$ vs $T_{-1}$).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/summary?days=30`
- **Query Parameters:**
  - `days` *(optional, default `30`, integer `1` to `90`)*: Trailing window size in days.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace dashboard summary fetched successfully",
  "data": {
    "projectsCount": 4,
    "totalTasks": 48,
    "completedTasks": 32,
    "inProgressTasks": 11,
    "overdueTasks": 3,
    "membersCount": 8,
    "activitiesCount": 384,
    "completionPercentage": 67,
    "totalStoryPoints": 142,
    "completedStoryPoints": 96,
    "totalEstimatedHours": 210.5,
    "periodDays": 30,
    "currentPeriod": {
      "startDate": "2026-08-26T11:00:00.000Z",
      "endDate": "2026-09-25T11:00:00.000Z",
      "createdTasks": 24,
      "completedTasks": 18,
      "completedStoryPoints": 54
    },
    "previousPeriod": {
      "startDate": "2026-07-27T11:00:00.000Z",
      "endDate": "2026-08-26T11:00:00.000Z",
      "createdTasks": 20,
      "completedTasks": 14,
      "completedStoryPoints": 42
    },
    "deltas": {
      "createdTasksDelta": 4,
      "completedTasksDelta": 4,
      "completedStoryPointsDelta": 12
    }
  }
}
```

---

### 3.3 Task Distribution by Status & Priority
Aggregates task status & priority volumes, ensuring zero-count entries exist for chart uniformity.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/task-distribution`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task distribution metrics fetched successfully",
  "data": {
    "byStatus": [
      { "status": "TODO", "count": 5 },
      { "status": "IN_PROGRESS", "count": 11 },
      { "status": "REVIEW", "count": 0 },
      { "status": "DONE", "count": 32 }
    ],
    "byPriority": [
      { "priority": "LOW", "count": 8 },
      { "priority": "MEDIUM", "count": 22 },
      { "priority": "HIGH", "count": 14 },
      { "priority": "URGENT", "count": 4 }
    ]
  }
}
```

---

### 3.4 Productivity Metrics (Daily & Weekly Bucketed Timeline)
Provides continuous zero-filled time series with cumulative burn-up and throughput metrics for area charts.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/productivity?days=30&interval=day`
- **Query Parameters:**
  - `days` *(optional, default `30`, min `1`, max `90`)*
  - `interval` *(optional, enum: `'day' | 'week'`, default `'day'`)*

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Productivity analytics fetched successfully",
  "data": {
    "timeframeDays": 30,
    "interval": "day",
    "startDate": "2026-08-26T00:00:00.000Z",
    "endDate": "2026-09-25T11:00:00.000Z",
    "totalCreatedInPeriod": 24,
    "totalCompletedInPeriod": 18,
    "netVelocity": -6,
    "avgThroughputPerDay": 0.6,
    "timeline": [
      {
        "date": "2026-08-26",
        "label": "Aug 26",
        "createdCount": 2,
        "completedCount": 1,
        "accumulatedCreated": 2,
        "accumulatedCompleted": 1,
        "netVelocity": -1
      },
      {
        "date": "2026-08-27",
        "label": "Aug 27",
        "createdCount": 0,
        "completedCount": 2,
        "accumulatedCreated": 2,
        "accumulatedCompleted": 3,
        "netVelocity": 2
      }
    ]
  }
}
```

---

### 3.5 Workspace Active Sprint Health Rollup
Rolls up all active sprints across the workspace, measuring time elapsed vs story point completion percentage with automated health tags.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/sprint-health`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint health rollups fetched successfully",
  "data": {
    "activeSprintsCount": 1,
    "totalCommittedStoryPoints": 38,
    "totalCompletedStoryPoints": 24,
    "overallSprintProgressPercentage": 63,
    "sprints": [
      {
        "id": "sprint-uuid-1",
        "name": "Sprint 14 - Platform Stabilization",
        "goal": "Migrate auth service and reduce p95 latency",
        "startDate": "2026-09-15T00:00:00.000Z",
        "endDate": "2026-09-29T23:59:59.000Z",
        "status": "ACTIVE",
        "project": {
          "id": "proj-uuid-1",
          "title": "Auth & SSO Service",
          "key": "AUTH",
          "slug": "auth-and-sso-service",
          "color": "#3B82F6"
        },
        "taskCounts": {
          "total": 16,
          "todo": 3,
          "inProgress": 5,
          "review": 1,
          "done": 7
        },
        "storyPoints": {
          "total": 38,
          "completed": 24,
          "inProgress": 10,
          "remaining": 14
        },
        "estimatedHours": {
          "total": 60.0,
          "completed": 36.0
        },
        "totalDays": 14,
        "daysRemaining": 4,
        "timeElapsedPercentage": 71,
        "completionPercentage": 63,
        "isOverdue": false,
        "healthStatus": "ON_TRACK"
      }
    ]
  }
}
```

---

### 3.6 Per-Project Health & Capacity Rollup Table
Evaluates portfolio health, active sprint alignment, overdue tasks, and total story point capacity for all projects.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/project-rollups`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project rollups fetched successfully",
  "data": [
    {
      "id": "proj-uuid-1",
      "title": "Auth & SSO Service",
      "key": "AUTH",
      "slug": "auth-and-sso-service",
      "description": "Central identity and OAuth gateway",
      "status": "ACTIVE",
      "priority": "HIGH",
      "color": "#3B82F6",
      "startDate": "2026-09-01T00:00:00.000Z",
      "dueDate": "2026-10-31T00:00:00.000Z",
      "createdAt": "2026-09-01T10:00:00.000Z",
      "updatedAt": "2026-09-25T08:00:00.000Z",
      "createdBy": {
        "id": "user-uuid-1",
        "username": "siam",
        "name": "Siam Admin",
        "email": "siam@example.com",
        "avatar": null
      },
      "membersCount": 6,
      "boardsCount": 2,
      "taskCounts": {
        "total": 24,
        "todo": 5,
        "inProgress": 6,
        "review": 1,
        "done": 12,
        "overdue": 1
      },
      "capacity": {
        "totalStoryPoints": 68,
        "completedStoryPoints": 42,
        "inProgressStoryPoints": 16,
        "totalEstimatedHours": 110.0
      },
      "completionPercentage": 50,
      "activeSprint": {
        "id": "sprint-uuid-1",
        "name": "Sprint 14",
        "startDate": "2026-09-15T00:00:00.000Z",
        "endDate": "2026-09-29T23:59:59.000Z",
        "status": "ACTIVE",
        "totalTasks": 16,
        "completedTasks": 7,
        "completionPercentage": 44
      },
      "healthStatus": "HEALTHY"
    }
  ]
}
```

---

### 3.7 Member Workload Breakdown & WIP Limits
Breaks down member task load with explicit WIP tracking (`inProgressCount`), overdue task counts, and workload health (`OPTIMAL`, `OVERLOADED`, `UNDERLOADED`).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/member-workload`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Member workload breakdown fetched successfully",
  "data": [
    {
      "memberId": "member-uuid-1",
      "role": "OWNER",
      "user": {
        "id": "user-uuid-1",
        "username": "siam",
        "name": "Siam Admin",
        "email": "siam@example.com",
        "avatar": null
      },
      "assignedCount": 18,
      "todoCount": 3,
      "inProgressCount": 3,
      "reviewCount": 1,
      "completedCount": 11,
      "overdueCount": 1,
      "completionRate": 61,
      "totalStoryPoints": 56,
      "completedStoryPoints": 38,
      "inProgressStoryPoints": 12,
      "totalEstimatedHours": 85.0,
      "capacityStatus": "OPTIMAL"
    },
    {
      "memberId": "member-uuid-2",
      "role": "MEMBER",
      "user": {
        "id": "user-uuid-2",
        "username": "janedoe",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": null
      },
      "assignedCount": 12,
      "todoCount": 1,
      "inProgressCount": 6,
      "reviewCount": 0,
      "completedCount": 5,
      "overdueCount": 3,
      "completionRate": 42,
      "totalStoryPoints": 44,
      "completedStoryPoints": 18,
      "inProgressStoryPoints": 22,
      "totalEstimatedHours": 64.0,
      "capacityStatus": "OVERLOADED"
    }
  ]
}
```

---

## 4. TanStack React Query Hooks

```typescript
// src/features/dashboard/hooks/use-dashboard-and-tasks.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  WorkspaceTasksQueryDto,
  FlatWorkspaceTasksResponse,
  GroupedWorkspaceTasksResponse,
  DashboardSummaryResponse,
  TaskDistributionResponse,
  ProductivityMetricsResponse,
  WorkspaceSprintHealthResponse,
  ProjectRollupItem,
  MemberWorkloadItem,
  AnalyticsInterval,
} from '../types';

// ==========================================
// 1. Workspace-Wide Task Query Hook
// ==========================================
export function useWorkspaceTasks(
  workspaceId: string,
  params: WorkspaceTasksQueryDto = {},
) {
  const isGrouped = params.groupBy && params.groupBy !== 'none';

  return useQuery<FlatWorkspaceTasksResponse | GroupedWorkspaceTasksResponse>({
    queryKey: ['workspace-tasks', workspaceId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/tasks`, {
        params,
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
    staleTime: 15000,
  });
}

// ==========================================
// 2. Executive Dashboard Summary (with Deltas)
// ==========================================
export function useWorkspaceSummary(workspaceId: string, days = 30) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: ['workspace-summary', workspaceId, days],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/summary`,
        { params: { days } },
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

// ==========================================
// 3. Task Categorical Distribution
// ==========================================
export function useTaskDistribution(workspaceId: string) {
  return useQuery<TaskDistributionResponse>({
    queryKey: ['task-distribution', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/task-distribution`,
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

// ==========================================
// 4. Productivity Time-Series
// ==========================================
export function useProductivityMetrics(
  workspaceId: string,
  days = 30,
  interval: AnalyticsInterval = AnalyticsInterval.DAY,
) {
  return useQuery<ProductivityMetricsResponse>({
    queryKey: ['productivity-metrics', workspaceId, days, interval],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/productivity`,
        { params: { days, interval } },
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 60000,
  });
}

// ==========================================
// 5. Active Sprint Health Rollup
// ==========================================
export function useWorkspaceSprintHealth(workspaceId: string) {
  return useQuery<WorkspaceSprintHealthResponse>({
    queryKey: ['workspace-sprint-health', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/sprint-health`,
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

// ==========================================
// 6. Portfolio Project Rollup Table
// ==========================================
export function useProjectRollups(workspaceId: string) {
  return useQuery<ProjectRollupItem[]>({
    queryKey: ['workspace-project-rollups', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/project-rollups`,
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

// ==========================================
// 7. Member Workload & Capacity
// ==========================================
export function useMemberWorkload(workspaceId: string) {
  return useQuery<MemberWorkloadItem[]>({
    queryKey: ['member-workload', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard/member-workload`,
      );
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}
```

---

## 5. UI/UX Interaction Design & Layout Wireframes

```
+---------------------------------------------------------------------------------------------------------+
| Executive Dashboard Header: [ Workspace Name ]  [ Filter Range: Past 30 Days v ]  [ + New Project / Task ]|
+---------------------------------------------------------------------------------------------------------+
| Interactive KPI Cards (Click to Drill-Down into /tasks):                                                |
|                                                                                                         |
| [ Total Tasks ]            [ In Progress ]          [ Overdue Tasks ]       [ Story Points ]            |
| 48                         11                       3 (Action Req.)         96 / 142 SP                 |
| 67% overall completion     WIP on track             ↑ +1 vs last period     68% sprint velocity         |
| [ ↑ +4 tasks vs baseline ] [ 23% active load ]      [ Click to resolve -> ] [ ↑ +12 SP velocity ]       |
+---------------------------------------------------------------------------------------------------------+
| Active Sprint Health Monitor (Banner):                                                                  |
| [ Sprint 14 - Platform Stabilization ] (Auth & SSO Service)                                             |
| Timeline: [===========>        ] 71% (4 days left)  |  Points: [=========>      ] 63% (24/38 SP)       |
| Health Status: [ ON TRACK (Green Badge) ]                                                               |
+----------------------------------------------------+----------------------------------------------------+
| Productivity Velocity Area Chart (Recharts):       | Task Categorical Breakdown (Donut / Bar):          |
| [ Task Creation vs Completion Throughput ]         | - Done: 32 (67%)                                   |
|   |         *--* Cumulative Done                   | - In Progress: 11 (23%)                            |
|   |     *--*    Cumulative Created                 | - Todo: 5 (10%)                                    |
|   | *--*                                           | - Priority: 4 Urgent | 14 High | 22 Med | 8 Low    |
+----------------------------------------------------+----------------------------------------------------+
| Project Portfolio Rollups (Table):                                                                      |
| Project             | Health          | Progress   | Tasks (T/IP/D) | Story Points | Active Sprint       |
| Auth & SSO Service  | [ HEALTHY ]     | 50% [===>] | 5 / 6 / 12     | 42 / 68 SP   | Sprint 14 (44%)     |
| Mobile Client       | [ NEEDS ATTN ]  | 28% [=>  ] | 12 / 8 / 6     | 18 / 54 SP   | Sprint 3 (30%)      |
+---------------------------------------------------------------------------------------------------------+
| Team Member Capacity & WIP Limits (Table):                                                              |
| Member        | Role   | WIP (In Prog) | Overdue | Capacity Status | Completion Rate                     |
| Siam Admin    | Owner  | 3 tasks       | 1       | [ OPTIMAL ]     | [========>   ] 61% (11/18 done)     |
| Jane Doe      | Member | 6 tasks (WIP!)| 3       | [ OVERLOADED ]  | [=====>      ] 42% (5/12 done)      |
+---------------------------------------------------------------------------------------------------------+
```

---

## 6. Frontend Developer Integration Checklist

- [ ] **Workspace Tasks Route (`/workspaces/:slug/tasks`)**:
  - Connect `useWorkspaceTasks` with URL search params synchronization.
  - Implement dynamic grouping toggle (`groupBy=none|status|priority|project|assignee|dueDate`).
  - Implement multi-facet filtering (Priority, Status, Assignee, Project, Sprint, Due Date).
- [ ] **KPI Card Drill-Down Wiring**:
  - Clicking "Overdue Tasks" navigates/opens slide-over `/tasks?dueDate=overdue`.
  - Clicking "In Progress" navigates/opens slide-over `/tasks?status=IN_PROGRESS,REVIEW`.
  - Clicking "Completed" navigates/opens slide-over `/tasks?status=DONE`.
- [ ] **Executive Dashboard (`/workspaces/:slug`)**:
  - Render 4 primary KPI cards using `useWorkspaceSummary` displaying trend delta badges.
  - Render Active Sprint Health banner using `useWorkspaceSprintHealth`.
  - Render throughput/burn-up area chart with daily/weekly toggles using `useProductivityMetrics`.
  - Render Donut and Stacked Bar charts using `useTaskDistribution`.
  - Render Portfolio Projects table using `useProjectRollups`.
  - Render Member Capacity & WIP Limits table with status pill badges using `useMemberWorkload`.

---

## 7. Backend Clarifications & Technical Responses (Backend Request 01)

| ID | Topic | Resolution / Backend Contract |
| :--- | :--- | :--- |
| **BE-13-01** | `days` parameter scope | **Top-level summary fields are all-time workspace totals.** `currentPeriod`, `previousPeriod`, and `deltas` represent the trailing comparison window. `productivity` is scoped to $N$ days. `task-distribution`, `project-rollups`, and `member-workload` reflect active current state. Frontend should label the dashboard header control as *"Comparison Window: Past 30 Days"* or attach the range selector to the productivity velocity chart. |
| **BE-13-02** | Overdue & Completion % deltas | Overdue is a current point-in-time state without historical snapshots. The Overdue KPI card should display current active overdue count with action badges (e.g. `Requires Action`). `createdTasksDelta` is explicitly labeled as *"+N created vs prior period"*. |
| **BE-13-03** | Multi-value filters | **Implemented & Live.** `status`, `priority`, and `projectId` accept comma-separated strings (`?status=IN_PROGRESS,REVIEW`, `?priority=HIGH,URGENT`, `?projectId=proj1,proj2`) or repeated query keys. Single values continue to work identically. |
| **BE-13-04** | Grouped response pagination | **Implemented & Live.** Grouped responses return `groupedBy`, a structured `groups[]` array (with `key`, `label`, `tasksCount`, `tasks[]`, `hasMore`), a flat `tasks[]` array of page items, and `meta` with true global pagination `total`. `tasksCount` is the true group count within the page, and `hasMore` indicates if more tasks exist in that group. |
| **BE-13-05** | Per-task permission flags | **Implemented & Live.** `WorkspaceTaskItem` includes `permissions: { canEdit: boolean, canDelete: boolean, canAssign: boolean }` derived from the caller's workspace role, project role, creator status, and assignee status. Enables direct task editing in cross-project modals/drawers without separate permission checks. |
| **BE-13-06** | GUEST role project visibility | **Implemented & Live (Option A).** Workspace `OWNER`, `ADMIN`, `MEMBER` have workspace-wide project visibility. For `GUEST` users, the backend automatically scopes `/workspaces/:workspaceId/tasks` to only projects where the guest holds explicit project membership (`projectMembers.some(pm => pm.userId === user.id)`). Guests cannot enumerate unassigned workspace projects. |
| **BE-13-07** | GUEST 403 on analytics | **Confirmed.** `403 Forbidden` is the intended RBAC response for Guests on executive analytics (`/dashboard/*`). Guests are external collaborators without portfolio/capacity oversight. The frontend should hide analytics cards when `user.role === GUEST`. |
| **BE-13-08** | Filter enum divergence & parity | **Aligned.**<br>1. `/workspaces/:id/tasks?assigneeId=me` is fully functional and equivalent to `/users/me/tasks`.<br>2. All aliases are supported: `dueDate=today\|overdue\|upcoming\|this_week\|nodate\|no_due_date`, and `assigneeId=unassigned\|none\|me`.<br>3. `groupBy=dueDate` is officially supported. |

### Minor Confirmations Reference
1. **`netVelocity`:** Confirmed per-bucket (`completedCount - createdCount`). Positive indicates throughput outpacing creation.
2. **`assigneeId` sentinels:** Confirmed `assigneeId=unassigned`, `assigneeId=none`, and `assigneeId=me`.
3. **`project.id`:** Guaranteed non-null UUID.
4. **`project-rollups`:** Bare array sorted by priority & recency (optimal for workspaces with up to ~100 projects).
5. **Column lists:** Confirmed `column.board.id` is present; board column listings remain on the board columns endpoint.

