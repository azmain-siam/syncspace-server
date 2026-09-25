# Module 12: Global Search & Dashboard Analytics

This document is the definitive integration guide for **Global Workspace Search (Cmd+K Command Palette) and Executive Dashboard Analytics** in the SyncSpace platform. It covers cross-entity fuzzy search (Projects, Tasks, Comments, and Members), high-level KPI cards with historical trend deltas, status/priority distributions, time-series velocity with zero-filled timelines, active sprint health rollups, per-project progress tables, and per-member workload balancing with WIP limits.

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/search` | Cross-entity search (Projects, Tasks, Comments, Members) | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/summary` | High-level workspace KPI cards & historical trend deltas | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/task-distribution` | Task distribution grouped by status & priority | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/productivity` | Time-series task creation vs completion velocity (daily/weekly) | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/sprint-health` | Active sprint rollups, progress %, and health indicators | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/project-rollups` | Per-project health, capacity, task counts & active sprint | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/member-workload` | Member assignment, WIP limits, overdue & capacity breakdown | `OWNER`, `ADMIN`, `MEMBER` |

---

## 2. Enums & Core TypeScript Types

```typescript
export enum SearchType {
  ALL = 'ALL',
  PROJECTS = 'PROJECTS',
  TASKS = 'TASKS',
  COMMENTS = 'COMMENTS',
  MEMBERS = 'MEMBERS',
}

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

export enum AnalyticsInterval {
  DAY = 'day',
  WEEK = 'week',
}

export interface UserMinimal {
  id: string;
  username?: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface SearchProjectResult {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: string;
  priority: string;
  updatedAt: string;
}

export interface SearchTaskResult {
  id: string;
  key: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  columnId: string;
  assignee: UserMinimal | null;
  column: {
    id: string;
    title: string;
    board: {
      id: string;
      title: string;
      projectId: string;
    };
  };
}

export interface SearchCommentResult {
  id: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  taskId: string;
  user: UserMinimal;
  task: {
    id: string;
    title: string;
  };
}

export interface SearchMemberResult extends UserMinimal {
  memberId: string;
  role: string;
  joinedAt: string;
}

export interface WorkspaceSearchResults {
  projects?: SearchProjectResult[];
  tasks?: SearchTaskResult[];
  comments?: SearchCommentResult[];
  members?: SearchMemberResult[];
}

export interface SearchResponse {
  query: string;
  type: SearchType;
  results: WorkspaceSearchResults;
}

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
  healthStatus: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'OVERDUE';
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
  healthStatus: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'ON_HOLD' | 'COMPLETED';
}

export interface MemberWorkloadItem {
  memberId: string;
  role: string;
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
  capacityStatus: 'OPTIMAL' | 'OVERLOADED' | 'UNDERLOADED';
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 Workspace Global Search
Searches across all projects, active tasks, comments, and workspace members in a single fast query.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/search`
- **Query Parameters:**
  - `q` *(required, string, min 2 characters)*: The search term.
  - `type` *(optional, enum: `'ALL' | 'PROJECTS' | 'TASKS' | 'COMMENTS' | 'MEMBERS'`, default: `'ALL'`)*.
  - `limit` *(optional, integer, default: 20, max: 50)*: Maximum results returned per category.
- **Example Request:** `GET /api/v1/workspaces/ws-uuid-1/search?q=auth&type=ALL&limit=10`

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace search results fetched successfully",
  "data": {
    "query": "auth",
    "type": "ALL",
    "results": {
      "projects": [
        {
          "id": "proj-uuid-1",
          "title": "Auth & SSO Service",
          "slug": "auth-and-sso-service",
          "description": "Central identity and OAuth gateway",
          "status": "ACTIVE",
          "priority": "HIGH",
          "updatedAt": "2026-09-22T10:00:00.000Z"
        }
      ],
      "tasks": [
        {
          "id": "task-uuid-1",
          "key": "SYNC-14",
          "title": "Implement JWT auth interceptor",
          "description": "Handle token rotation in Axios",
          "status": "TODO",
          "priority": "HIGH",
          "dueDate": "2026-10-15T18:00:00.000Z",
          "columnId": "col-uuid-1",
          "assignee": {
            "id": "user-uuid-1",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "avatar": null
          },
          "column": {
            "id": "col-uuid-1",
            "title": "To Do",
            "board": {
              "id": "board-uuid-1",
              "title": "Sprint 14 Board",
              "projectId": "proj-uuid-1"
            }
          }
        }
      ],
      "comments": [
        {
          "id": "comment-uuid-1",
          "content": "Make sure the auth headers comply with Bearer scheme",
          "isEdited": false,
          "createdAt": "2026-09-22T11:00:00.000Z",
          "taskId": "task-uuid-1",
          "user": {
            "id": "user-uuid-2",
            "name": "Siam Admin",
            "email": "siam@example.com",
            "avatar": null
          },
          "task": {
            "id": "task-uuid-1",
            "title": "Implement JWT auth interceptor"
          }
        }
      ],
      "members": [
        {
          "memberId": "member-uuid-1",
          "role": "MEMBER",
          "joinedAt": "2026-09-10T08:00:00.000Z",
          "id": "user-uuid-3",
          "name": "Author Smith",
          "email": "author@example.com",
          "avatar": null
        }
      ]
    }
  }
}
```

---

### 3.2 Workspace Dashboard KPI Summary with Historical Deltas
Returns aggregated high-level business metrics across all projects and tasks in the workspace along with historical comparison deltas for KPI trend badges (`↑ 4 vs last period`).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/summary?days=30`
- **Query Parameters:**
  - `days` *(optional, integer, default: 30, min: 1, max: 90)*: Comparison trailing window.
- **Success Response (200 OK):**
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
Aggregates task volume into categorical groups suitable for Donut, Pie, and Stacked Bar charts. Includes 0-value placeholders for empty categories.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/task-distribution`
- **Success Response (200 OK):**
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
Analyzes task velocity over a configurable trailing window of days with a contiguous zero-filled sequence for chart rendering.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/productivity?days=30&interval=day`
- **Query Parameters:**
  - `days` *(optional, integer, default: 30, min: 1, max: 90)*: Number of past days to analyze.
  - `interval` *(optional, enum: `'day' | 'week'`, default: `'day'`)*: Aggregation bucket granularity.
- **Success Response (200 OK):**
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
Returns all active sprints across the workspace with time elapsed, story points progress, and real-time health flags (`ON_TRACK`, `AT_RISK`, `BEHIND`, `OVERDUE`).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/sprint-health`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint health rollups fetched successfully",
  "data": {
    "activeSprintsCount": 2,
    "totalCommittedStoryPoints": 64,
    "totalCompletedStoryPoints": 42,
    "overallSprintProgressPercentage": 66,
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

### 3.6 Per-Project Health & Progress Rollup
Returns project-level progress overview across all workspace projects for high-level portfolio oversight.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/project-rollups`
- **Success Response (200 OK):**
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

### 3.7 Member Workload Breakdown (with WIP Limits & Capacity Status)
Calculates assignment volume, WIP tasks (`inProgressCount`), overdue tasks, story points, and capacity health status (`OPTIMAL`, `OVERLOADED`, `UNDERLOADED`) for each member.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/member-workload`
- **Success Response (200 OK):**
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

## 4. Frontend Integration Recipes (React Query Hooks)

```typescript
// src/features/dashboard/hooks/use-dashboard.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  SearchResponse,
  DashboardSummaryResponse,
  TaskDistributionResponse,
  ProductivityMetricsResponse,
  WorkspaceSprintHealthResponse,
  ProjectRollupItem,
  MemberWorkloadItem,
  AnalyticsInterval,
} from '../types';

// 1. Global Workspace Search with Debouncing
export function useWorkspaceSearch(workspaceId: string, q: string, type = 'ALL', limit = 20) {
  return useQuery<SearchResponse>({
    queryKey: ['workspace-search', workspaceId, q, type, limit],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/search`, {
        params: { q, type, limit },
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId && q.trim().length >= 2),
    staleTime: 30000, // 30s cache
  });
}

// 2. Executive Dashboard KPI Summary (with trend deltas)
export function useWorkspaceSummary(workspaceId: string, days = 30) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: ['workspace-summary', workspaceId, days],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/summary`, {
        params: { days },
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 3. Task Distribution Charts
export function useTaskDistribution(workspaceId: string) {
  return useQuery<TaskDistributionResponse>({
    queryKey: ['task-distribution', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/task-distribution`);
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 4. Productivity / Velocity Analysis
export function useProductivityMetrics(
  workspaceId: string,
  days = 30,
  interval: AnalyticsInterval = AnalyticsInterval.DAY,
) {
  return useQuery<ProductivityMetricsResponse>({
    queryKey: ['productivity-metrics', workspaceId, days, interval],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/productivity`, {
        params: { days, interval },
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 5. Active Sprint Health Rollup
export function useWorkspaceSprintHealth(workspaceId: string) {
  return useQuery<WorkspaceSprintHealthResponse>({
    queryKey: ['workspace-sprint-health', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/sprint-health`);
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 6. Portfolio Project Rollup Table
export function useProjectRollups(workspaceId: string) {
  return useQuery<ProjectRollupItem[]>({
    queryKey: ['workspace-project-rollups', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/project-rollups`);
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 7. Team Member Workload Breakdown
export function useMemberWorkload(workspaceId: string) {
  return useQuery<MemberWorkloadItem[]>({
    queryKey: ['member-workload', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/member-workload`);
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
```

---

## 5. UI/UX Interaction Best Practices

### 5.1 Command Palette Modal (`Cmd+K` / `Ctrl+K`)
- **Global Keybinding:** Bind `Cmd+K` (Mac) and `Ctrl+K` (Windows/Linux) to open the search modal.
- **Categorized Results:** Group matches into collapsible sections:
  - **Projects:** Folder icon, project title, and slug badge.
  - **Tasks:** Checkbox icon, Key chip (`SYNC-14`), title, and status pill.
  - **Comments:** MessageSquare icon, comment snippet, author avatar, and linked task title.
  - **Members:** User avatar, name, email, and role badge.
- **Keyboard Navigation:** Support `ArrowDown` / `ArrowUp` to highlight results and `Enter` to navigate.

### 5.2 Dashboard KPI Drill-Down to Workspace Tasks
- **Interactive KPI Cards:** Clicking any KPI card (e.g. *Overdue Tasks*, *In Progress*, or *Completed*) routes seamlessly to `/workspaces/:workspaceSlug/tasks` with matching query parameters:
  - Clicking *Overdue* -> `/tasks?dueDate=overdue`
  - Clicking *In Progress* -> `/tasks?status=IN_PROGRESS`
  - Clicking *Completed* -> `/tasks?status=DONE`
- **Trend Delta Badges:** Display `deltas.completedTasksDelta` and `deltas.createdTasksDelta` as badge indicators:
  - Positive completed tasks: `↑ +4 vs last period` in green.
  - Decreased velocity: `↓ -2 vs last period` in amber/neutral.

---

## 6. Summary Checklist for Frontend Developer

- [ ] Implement global `CommandMenu` modal triggered by `Cmd+K` / `Ctrl+K` and search bar in top navigation.
- [ ] Connect `useWorkspaceSearch` with a 300ms debounce to query `/workspaces/:workspaceId/search`.
- [ ] Render 4 KPI summary cards using data from `useWorkspaceSummary` with trend comparison badges and click-to-drilldown to `/workspaces/:workspaceId/tasks`.
- [ ] Render Status & Priority charts using `useTaskDistribution`.
- [ ] Render continuous zero-filled throughput & burn-up area chart using `useProductivityMetrics(days, interval)`.
- [ ] Render Active Sprint Health overview banner using `useWorkspaceSprintHealth`.
- [ ] Render Project Portfolio Health table using `useProjectRollups`.
- [ ] Render Member Workload table with WIP counters and capacity status pills (`OPTIMAL`, `OVERLOADED`) using `useMemberWorkload`.
