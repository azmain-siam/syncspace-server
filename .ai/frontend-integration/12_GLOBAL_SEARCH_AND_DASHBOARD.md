# Module 12: Global Search & Dashboard Analytics

This document is the definitive integration guide for **Global Workspace Search (Cmd+K Command Palette) and Executive Dashboard Analytics** in the SyncSpace platform. It covers cross-entity fuzzy search (Projects, Tasks, Comments, and Members), high-level KPI cards, status/priority distributions, time-series velocity, and per-member workload balancing.

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/search` | Cross-entity search (Projects, Tasks, Comments, Members) | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/summary` | High-level workspace KPI cards & progress metrics | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/task-distribution` | Task distribution grouped by status & priority | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/productivity` | Time-series task creation vs completion velocity | `OWNER`, `ADMIN`, `MEMBER` |
| `GET` | `/api/v1/workspaces/:workspaceId/dashboard/member-workload` | Member assignment, overdue & completion breakdown | `OWNER`, `ADMIN`, `MEMBER` |

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

export interface UserMinimal {
  id: string;
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
}

export interface TaskDistributionResponse {
  byStatus: Array<{ status: TaskStatus; count: number }>;
  byPriority: Array<{ priority: TaskPriority; count: number }>;
}

export interface ProductivityMetricsResponse {
  timeframeDays: number;
  startDate: string;
  totalCreatedInPeriod: number;
  totalCompletedInPeriod: number;
}

export interface MemberWorkloadItem {
  memberId: string;
  role: string;
  user: UserMinimal;
  assignedCount: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number; // 0 to 100
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalEstimatedHours: number;
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

### 3.2 Workspace Dashboard KPI Summary
Returns aggregated high-level business metrics across all projects and tasks in the workspace.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/summary`
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
    "totalEstimatedHours": 210.5
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

### 3.4 Productivity Metrics (Creation vs Completion)
Analyzes task velocity over a configurable trailing window of days.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/dashboard/productivity?days=30`
- **Query Parameters:**
  - `days` *(optional, integer, default: 30, min: 1, max: 90)*: Number of past days to analyze.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Productivity analytics fetched successfully",
  "data": {
    "timeframeDays": 30,
    "startDate": "2026-08-23T15:00:00.000Z",
    "totalCreatedInPeriod": 26,
    "totalCompletedInPeriod": 19
  }
}
```

---

### 3.5 Member Workload Breakdown
Calculates assignment volume, overdue tasks, story points, and completion percentage for each workspace member (sorted descending by assignment count).

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
        "name": "Siam Admin",
        "email": "siam@example.com",
        "avatar": null
      },
      "assignedCount": 18,
      "completedCount": 14,
      "overdueCount": 1,
      "completionRate": 78,
      "totalStoryPoints": 56,
      "completedStoryPoints": 42,
      "totalEstimatedHours": 85.0
    },
    {
      "memberId": "member-uuid-2",
      "role": "MEMBER",
      "user": {
        "id": "user-uuid-2",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": null
      },
      "assignedCount": 12,
      "completedCount": 8,
      "overdueCount": 2,
      "completionRate": 67,
      "totalStoryPoints": 38,
      "completedStoryPoints": 26,
      "totalEstimatedHours": 54.0
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
  MemberWorkloadItem,
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

// 2. Executive Dashboard KPI Summary
export function useWorkspaceSummary(workspaceId: string) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: ['workspace-summary', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/summary`);
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
export function useProductivityMetrics(workspaceId: string, days = 30) {
  return useQuery<ProductivityMetricsResponse>({
    queryKey: ['productivity-metrics', workspaceId, days],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/dashboard/productivity`, {
        params: { days },
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 5. Team Workload Breakdown
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

### 5.2 Dashboard Layout (`/workspaces/:workspaceSlug/dashboard`)

```
+-------------------------------------------------------------------------------+
| KPI Cards:                                                                    |
| [ Total Tasks: 48 | 67% Done ]  [ In Progress: 11 | Overdue: 3 ]             |
| [ Story Points: 96 / 142 SP ]   [ Active Projects: 4 | Members: 8 ]          |
+---------------------------------------+---------------------------------------+
| Chart: Task Status (Donut)            | Chart: Task Priority (Stacked Bar)    |
| - Done: 32 (67%)                      | - Urgent: 4                           |
| - In Progress: 11 (23%)               | - High: 14                            |
| - Todo: 5 (10%)                       | - Medium: 22 / Low: 8                 |
+---------------------------------------+---------------------------------------+
| Team Member Workload (Table):                                                 |
| Member        | Role   | Assigned | Completed | Overdue | Completion Rate     |
| Siam Admin    | Owner  | 18 tasks | 14 done   | 1       | [=========>  ] 78%  |
| Jane Doe      | Member | 12 tasks | 8 done    | 2       | [======>     ] 67%  |
+-------------------------------------------------------------------------------+
```

---

## 6. Summary Checklist for Frontend Developer

- [ ] Implement global `CommandMenu` modal triggered by `Cmd+K` / `Ctrl+K` and search bar in top navigation.
- [ ] Connect `useWorkspaceSearch` with a 300ms debounce to query `/workspaces/:workspaceId/search`.
- [ ] Render search result categories (Projects, Tasks, Comments, Members) with custom icons and direct routing.
- [ ] Build workspace Dashboard overview page (`/workspaces/:workspaceSlug/dashboard`).
- [ ] Render 4 KPI summary cards using data from `useWorkspaceSummary`.
- [ ] Render Status & Priority charts using `useTaskDistribution`.
- [ ] Render trailing window productivity metrics using `useProductivityMetrics(days)`.
- [ ] Render Member Workload table with progress bars using `useMemberWorkload`.
