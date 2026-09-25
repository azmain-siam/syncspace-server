# Module 13: Workspace Tasks & Executive Dashboard Analytics

> **Prefix**: `/api/v1`  
> **Target Audience**: Frontend Engineers / Frontend AI Agents  
> **Auth Required**: Bearer JWT (`Authorization: Bearer <accessToken>`)  
> **Response Wrapper**: All successful JSON responses follow the standardized envelope `{ success: true, statusCode: number, message: string, data: T }`.

---

## 🎯 1. Overview & Purpose

Module 13 provides the two high-leverage data surfaces for enterprise project management:
1. **Workspace-Wide Task Query (`/workspaces/:workspaceId/tasks`)**: Cross-project task querying, dynamic filtering (`status`, `priority`, `assigneeId`, `dueDate`, `projectId`, `sprintId`, `isBacklog`, `search`), sorting, global pagination, and multi-dimensional grouping (`groupBy: 'none' | 'project' | 'priority' | 'status' | 'dueDate' | 'assignee'`).
2. **Executive Dashboard Analytics (`/workspaces/:workspaceId/dashboard/*`)**:
   - `/summary`: KPI summary cards (total tasks, completion rate, overdue count, active projects, members) with comparative trailing period trend deltas.
   - `/productivity`: Time-series velocity & throughput metrics over daily or weekly zero-filled intervals.
   - `/task-distribution`: Task volume breakdown by status and priority.
   - `/sprint-health`: Active sprint rollups with committed vs completed story points, days remaining, and on-track indicators.
   - `/project-rollups`: Executive multi-project portfolio cards with progress percentages, health badges (`HEALTHY`, `NEEDS_ATTENTION`, `CRITICAL`), leads, icons, visibility, repo URLs, and overdue alerts.
   - `/member-workload`: Workload distribution, WIP counts, capacity status (`OPTIMAL`, `OVERLOADED`, `UNDERLOADED`), and story point completion rates per member.

---

## 🏗️ 2. TypeScript Types & Enums

```typescript
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
  avatar: string | null;
  username?: string | null;
}

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export interface WorkspaceTaskItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  order: number;
  storyPoints: number | null;
  estimatedHours: number | null;
  isBacklog: boolean;
  assignee: UserMinimal | null;
  creator: UserMinimal;
  column: {
    id: string;
    title: string;
    board: {
      id: string;
      title: string;
      project: {
        id: string;
        title: string;
        key: string;
        slug: string;
        color: string;
      };
    };
  };
  sprint?: {
    id: string;
    name: string;
    status: string;
  } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  permissions: TaskPermissions;
  _count: {
    comments: number;
    attachments: number;
    links: number;
    checklists: number;
  };
}

export interface WorkspaceTasksResponse {
  tasks: WorkspaceTaskItem[];
  groupedBy?: string;
  groups?: Array<{
    key: string;
    label: string;
    tasksCount: number;
    hasMore: boolean;
    tasks: WorkspaceTaskItem[];
  }>;
  grouped?: Record<string, WorkspaceTaskItem[]>;
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

### 3.1 Workspace Task Query (`GET /api/v1/workspaces/:workspaceId/tasks`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`, and `GUEST`. (Guests are automatically scoped to tasks within projects they belong to).
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
  - `status`: `TaskStatus` or comma-separated list (e.g. `IN_PROGRESS,REVIEW`)
  - `priority`: `TaskPriority` or comma-separated list (e.g. `HIGH,URGENT`)
  - `assigneeId`: string (User UUID, `me` for current user, or `unassigned`/`none`)
  - `dueDate`: `'today' | 'overdue' | 'upcoming' | 'this_week' | 'nodate' | 'no_due_date'`
  - `projectId`: string (Project UUID or comma-separated list)
  - `sprintId`: string (Sprint UUID or `none`)
  - `isBacklog`: boolean (`true` | `false`)
  - `search`: string (matches title, description, or task key)
  - `sortBy`: `'dueDate' | 'priority' | 'status' | 'createdAt' | 'updatedAt' | 'title' | 'order'`
  - `sortOrder`: `'asc' | 'desc'` (default: `'desc'`)
  - `groupBy`: `'none' | 'project' | 'priority' | 'status' | 'dueDate' | 'assignee'`

---

### 3.2 Dashboard KPI Summary (`GET /api/v1/workspaces/:workspaceId/dashboard/summary`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER` (`GUEST` receives 403 Forbidden).
- **Query Parameters**: `days` (number, default: 30)
- **Response**: Lifetime totals + Trailing $T_0$ vs Preceding $T_{-1}$ baseline deltas.

---

### 3.3 Productivity Time-Series (`GET /api/v1/workspaces/:workspaceId/dashboard/productivity`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`.
- **Query Parameters**:
  - `days`: number (default: 30)
  - `interval`: `'day' | 'week'` (default: `'day'`)
- **Response**: Zero-filled continuous daily or weekly buckets with `createdCount`, `completedCount`, `accumulatedCreated`, `accumulatedCompleted`, and `netVelocity`.

---

### 3.4 Task Distribution (`GET /api/v1/workspaces/:workspaceId/dashboard/task-distribution`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`.
- **Response**: Grouped task counts by status and by priority (with 0-count placeholders).

---

### 3.5 Sprint Health Rollup (`GET /api/v1/workspaces/:workspaceId/dashboard/sprint-health`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`.
- **Response**: All active sprints across the workspace, story points breakdown, days remaining, time elapsed %, and health indicators (`ON_TRACK`, `AT_RISK`, `BEHIND`, `OVERDUE`).

---

### 3.6 Project Portfolio Rollups (`GET /api/v1/workspaces/:workspaceId/dashboard/project-rollups`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`.
- **Response**: Per-project cards with task counts, capacity, active sprint, completion %, and status (`HEALTHY`, `NEEDS_ATTENTION`, `CRITICAL`, `ON_HOLD`, `COMPLETED`).

---

### 3.7 Member Workload & Capacity (`GET /api/v1/workspaces/:workspaceId/dashboard/member-workload`)
- **Permissions**: Workspace `OWNER`, `ADMIN`, `MEMBER`.
- **Response**: Assigned task breakdown, in-progress WIP counts, overdue counts, completion rate %, story points, and `capacityStatus` (`OPTIMAL`, `OVERLOADED`, `UNDERLOADED`).
