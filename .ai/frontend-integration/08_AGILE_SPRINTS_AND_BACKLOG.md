# Module 08: Agile Sprints & Backlog Triage

This document is the definitive integration guide for **Agile Sprints, Scrum Lifecycle, Capacity Metrics, and Backlog Triage** in the SyncSpace platform. It covers sprint planning, single-active-sprint validation, roll-over completion workflows, dedicated backlog triage queries, and drag-and-drop task assignment between sprints and the product backlog.

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed | Emitted Realtime Event |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/projects/:projectId/sprints` | Create new sprint in planning state | `OWNER`, `ADMIN`, `MEMBER` | `sprint.created` |
| `GET` | `/api/v1/projects/:projectId/sprints` | List sprints with capacity & velocity metrics | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/projects/:projectId/backlog` | Dedicated project backlog triage view | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/sprints/:sprintId` | Get sprint details with task breakdown | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `PATCH` | `/api/v1/sprints/:sprintId` | Update sprint name, goal, dates, or status | `OWNER`, `ADMIN`, `MEMBER` | `sprint.updated` |
| `POST` | `/api/v1/sprints/:sprintId/start` | Start sprint (enforces 1 active sprint/project) | `OWNER`, `ADMIN`, `MEMBER` | `sprint.started` |
| `POST` | `/api/v1/sprints/:sprintId/complete` | Complete sprint & roll unfinished tasks | `OWNER`, `ADMIN`, `MEMBER` | `sprint.completed` |
| `DELETE`| `/api/v1/sprints/:sprintId` | Soft-delete sprint & push tasks to backlog | `OWNER`, `ADMIN`, `MEMBER` | — |
| `POST` | `/api/v1/tasks/:taskId/sprint` | Move task to sprint or back to backlog | `OWNER`, `ADMIN`, `MEMBER` | `task.sprint_changed` |

---

## 2. Enums & Core TypeScript Types

```typescript
export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface SprintMetrics {
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalEstimatedHours: number;
  completionPercentage: number; // 0 to 100
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  project?: {
    id: string;
    title: string;
    key: string;
    workspaceId: string;
  };
  metrics?: SprintMetrics;
  tasks?: SprintTask[];
}

export interface SprintTask {
  id: string;
  columnId: string;
  sprintId: string | null;
  key: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  order: number;
  isBacklog: boolean;
  storyPoints: number | null;
  estimatedHours: number | null;
  assignee: UserMinimal | null;
  column: {
    id: string;
    title: string;
    boardId: string;
  };
  labels: Array<{ id: string; name: string; color: string }>;
}

export interface SprintCompletionSummary {
  completedTasksCount: number;
  rolledOverTasksCount: number;
  completedStoryPoints: number;
  rolledOverTo: 'NEXT_SPRINT' | 'BACKLOG';
}

export interface SprintCompletionResponse extends Sprint {
  summary: SprintCompletionSummary;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BacklogPaginationMeta extends PaginationMeta {
  totalStoryPoints: number;
  totalEstimatedHours: number;
}

export interface PaginatedSprintsResponse {
  data: Sprint[];
  meta: PaginationMeta;
}

export interface BacklogResponse {
  data: SprintTask[];
  meta: BacklogPaginationMeta;
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 Create Sprint
Initializes a new sprint in `PLANNING` status.

- **Endpoint:** `POST /api/v1/projects/:projectId/sprints`
- **Request Body:**
```json
{
  "name": "Sprint 14 - Performance & Auth",
  "goal": "Improve database latency and finalize OAuth Google login",
  "startDate": "2026-10-01T00:00:00.000Z",
  "endDate": "2026-10-14T23:59:59.999Z"
}
```
*(Validation: `name` is required 1-100 chars, `goal` optional up to 500 chars, `startDate` and `endDate` optional ISO-8601 strings. If both provided, `startDate` <= `endDate`)*.

- **Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Sprint created successfully",
  "data": {
    "id": "sprint-uuid-1234",
    "projectId": "proj-uuid-5678",
    "name": "Sprint 14 - Performance & Auth",
    "goal": "Improve database latency and finalize OAuth Google login",
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-10-14T23:59:59.999Z",
    "status": "PLANNING",
    "createdAt": "2026-09-19T05:00:00.000Z",
    "updatedAt": "2026-09-19T05:00:00.000Z",
    "deletedAt": null,
    "project": {
      "id": "proj-uuid-5678",
      "title": "SyncSpace Server",
      "key": "SYNC",
      "workspaceId": "ws-uuid-9999"
    }
  }
}
```

---

### 3.2 List Project Sprints with Capacity Metrics
Returns all sprints in the project sorted by status (`PLANNING` -> `ACTIVE` -> `COMPLETED`) with auto-calculated story points, velocity, and completion percentages.

- **Endpoint:** `GET /api/v1/projects/:projectId/sprints`
- **Query Parameters:**
  - `status` *(optional)*: Filter by `PLANNING`, `ACTIVE`, or `COMPLETED`.
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20, max: 100)*
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project sprints fetched successfully",
  "data": {
    "data": [
      {
        "id": "sprint-uuid-1",
        "projectId": "proj-uuid-5678",
        "name": "Sprint 13 - Core Features",
        "goal": "Finish Kanban and Task drawers",
        "startDate": "2026-09-15T00:00:00.000Z",
        "endDate": "2026-09-29T23:59:59.999Z",
        "status": "ACTIVE",
        "createdAt": "2026-09-15T00:00:00.000Z",
        "updatedAt": "2026-09-15T00:00:00.000Z",
        "deletedAt": null,
        "metrics": {
          "totalTasks": 12,
          "completedTasks": 8,
          "totalStoryPoints": 34,
          "completedStoryPoints": 21,
          "totalEstimatedHours": 48.5,
          "completionPercentage": 67
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

### 3.3 Dedicated Project Backlog Triage View
Retrieves all tasks that are currently marked as backlog items (`isBacklog === true` or `sprintId === null`) with aggregated backlog capacity (`totalStoryPoints`, `totalEstimatedHours`).

- **Endpoint:** `GET /api/v1/projects/:projectId/backlog`
- **Query Parameters:**
  - `priority` *(optional)*: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `status` *(optional)*: `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE`
  - `assigneeId` *(optional)*: Filter by assigned user UUID
  - `search` *(optional)*: Search title, description, or key
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project backlog fetched successfully",
  "data": {
    "data": [
      {
        "id": "task-uuid-101",
        "columnId": "col-uuid-1",
        "sprintId": null,
        "key": "SYNC-89",
        "title": "Implement webhook integrations",
        "priority": "MEDIUM",
        "status": "TODO",
        "order": 4,
        "isBacklog": true,
        "storyPoints": 5,
        "estimatedHours": 8.0,
        "assignee": null,
        "column": {
          "id": "col-uuid-1",
          "title": "Backlog",
          "boardId": "board-uuid-1"
        },
        "labels": []
      }
    ],
    "meta": {
      "total": 24,
      "page": 1,
      "limit": 20,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false,
      "totalStoryPoints": 88,
      "totalEstimatedHours": 142.5
    }
  }
}
```

---

### 3.4 Get Sprint by ID
Retrieves full sprint details along with the full list of assigned tasks and computed progress metrics.

- **Endpoint:** `GET /api/v1/sprints/:sprintId`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint fetched successfully",
  "data": {
    "id": "sprint-uuid-1",
    "projectId": "proj-uuid-5678",
    "name": "Sprint 13 - Core Features",
    "goal": "Finish Kanban and Task drawers",
    "startDate": "2026-09-15T00:00:00.000Z",
    "endDate": "2026-09-29T23:59:59.999Z",
    "status": "ACTIVE",
    "project": {
      "id": "proj-uuid-5678",
      "title": "SyncSpace Server",
      "key": "SYNC",
      "workspaceId": "ws-uuid-9999"
    },
    "tasks": [
      {
        "id": "task-uuid-1",
        "key": "SYNC-45",
        "title": "Fix token expiration issue",
        "priority": "HIGH",
        "status": "DONE",
        "order": 0,
        "storyPoints": 3,
        "estimatedHours": 4.0,
        "assignee": {
          "id": "user-uuid-1",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "column": {
          "id": "col-done",
          "title": "Done",
          "boardId": "board-uuid"
        },
        "labels": []
      }
    ],
    "metrics": {
      "totalTasks": 1,
      "completedTasks": 1,
      "totalStoryPoints": 3,
      "completedStoryPoints": 3,
      "totalEstimatedHours": 4.0,
      "completionPercentage": 100
    }
  }
}
```

---

### 3.5 Start Sprint (Scrum Rule Validation)
Transitions sprint status to `ACTIVE`.

> [!IMPORTANT]
> **Scrum Constraint:** A project may only have **one active sprint at a time**. If another sprint is already active in this project, the server returns `400 Bad Request` (`"Project already has an active sprint: '<name>'. Complete it before starting a new sprint."`).

- **Endpoint:** `POST /api/v1/sprints/:sprintId/start`
- **Request Body:** `{}` (empty object)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint started successfully",
  "data": {
    "id": "sprint-uuid-1234",
    "name": "Sprint 14 - Performance & Auth",
    "status": "ACTIVE",
    "startDate": "2026-09-19T05:20:00.000Z"
  }
}
```

---

### 3.6 Complete Sprint (With Unfinished Task Rollover)
Closes the active sprint, transitions status to `COMPLETED`, records actual completion date, and safely migrates unfinished tasks.

- **Endpoint:** `POST /api/v1/sprints/:sprintId/complete`
- **Request Body:**
```json
{
  "moveToSprintId": "sprint-uuid-next"
}
```
*(Note: `moveToSprintId` is optional. If provided, all tasks where `status !== 'DONE'` are assigned to the target sprint. If omitted, unfinished tasks are moved to the product backlog with `isBacklog: true, sprintId: null`)*.

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint completed successfully",
  "data": {
    "id": "sprint-uuid-1234",
    "name": "Sprint 14 - Performance & Auth",
    "status": "COMPLETED",
    "endDate": "2026-09-19T05:30:00.000Z",
    "summary": {
      "completedTasksCount": 8,
      "rolledOverTasksCount": 3,
      "completedStoryPoints": 24,
      "rolledOverTo": "NEXT_SPRINT"
    }
  }
}
```

---

### 3.7 Assign / Move Task to Sprint or Backlog
Moves a task between sprints or shifts it into the product backlog.

- **Endpoint:** `POST /api/v1/tasks/:taskId/sprint`
- **Request Body (Move to Sprint):**
```json
{
  "sprintId": "sprint-uuid-1234",
  "isBacklog": false
}
```
- **Request Body (Move to Backlog):**
```json
{
  "sprintId": null,
  "isBacklog": true
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task sprint assignment updated successfully",
  "data": {
    "id": "task-uuid-101",
    "sprintId": "sprint-uuid-1234",
    "isBacklog": false,
    "sprint": {
      "id": "sprint-uuid-1234",
      "name": "Sprint 14 - Performance & Auth",
      "status": "PLANNING"
    }
  }
}
```

---

### 3.8 Delete Sprint
Soft-deletes the sprint and automatically unassigns all tasks, safely returning them to the project backlog.

- **Endpoint:** `DELETE /api/v1/sprints/:sprintId`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sprint deleted successfully",
  "data": null
}
```

---

## 4. Frontend Integration Recipes (Zod + React Query)

### 4.1 Zod Validation Schemas

```typescript
// src/features/sprints/schemas/sprint.schema.ts
import { z } from 'zod';
import { SprintStatus } from '../types';

export const createSprintSchema = z
  .object({
    name: z.string().min(1, 'Sprint name is required').max(100),
    goal: z.string().max(500).optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  );

export const updateSprintSchema = createSprintSchema.partial().extend({
  status: z.nativeEnum(SprintStatus).optional(),
});

export const completeSprintSchema = z.object({
  moveToSprintId: z.string().uuid().optional().nullable(),
});

export const moveTaskToSprintSchema = z.object({
  sprintId: z.string().uuid().optional().nullable(),
  isBacklog: z.boolean().default(false),
});
```

---

### 4.2 React Query Hooks

```typescript
// src/features/sprints/hooks/use-sprints.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Sprint,
  PaginatedSprintsResponse,
  BacklogResponse,
  SprintCompletionResponse,
} from '../types';

// 1. List Project Sprints
export function useProjectSprints(projectId: string, params?: { status?: string; page?: number; limit?: number }) {
  return useQuery<PaginatedSprintsResponse>({
    queryKey: ['project-sprints', projectId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/sprints`, { params });
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

// 2. Project Backlog Query
export function useProjectBacklog(projectId: string, params?: Record<string, any>) {
  return useQuery<BacklogResponse>({
    queryKey: ['project-backlog', projectId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/backlog`, { params });
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

// 3. Sprint Details with Tasks
export function useSprintDetails(sprintId: string) {
  return useQuery<Sprint>({
    queryKey: ['sprint', sprintId],
    queryFn: async () => {
      const res = await apiClient.get(`/sprints/${sprintId}`);
      return res.data.data;
    },
    enabled: Boolean(sprintId),
  });
}

// 4. Create Sprint Mutation
export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; goal?: string; startDate?: string; endDate?: string }) => {
      const res = await apiClient.post(`/projects/${projectId}/sprints`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
    },
  });
}

// 5. Start Sprint Mutation
export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await apiClient.post(`/sprints/${sprintId}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });
}

// 6. Complete Sprint Mutation (With Complete Modal dialog)
export function useCompleteSprint(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, moveToSprintId }: { sprintId: string; moveToSprintId?: string | null }) => {
      const res = await apiClient.post<SprintCompletionResponse>(
        `/sprints/${sprintId}/complete`,
        { moveToSprintId }
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });
}

// 7. Move Task Between Sprints / Backlog (Drag-and-Drop)
export function useAssignTaskToSprint(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, sprintId, isBacklog }: { taskId: string; sprintId?: string | null; isBacklog?: boolean }) => {
      const res = await apiClient.post(`/tasks/${taskId}/sprint`, {
        sprintId,
        isBacklog,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });
}
```

---

## 5. UI/UX Interaction Best Practices for Sprints

### 5.1 Backlog & Sprint Planning View Layout
- Render two primary sections on `/workspaces/:workspaceSlug/projects/:projectId/backlog`:
  1. **Top Container: Active & Planned Sprints**:
     - Accordion card per sprint showing Sprint Name, Dates, Goal, Story Points badge (`34 SP`), and Progress Bar (`67%`).
     - "Start Sprint" action on `PLANNING` sprints.
     - "Complete Sprint" action on `ACTIVE` sprints.
     - Collapsible task list inside each sprint.
  2. **Bottom Container: Product Backlog**:
     - Header showing total unassigned items count (`24 issues`) and total estimated effort (`88 Story Points, 142.5 hrs`).
     - "Create Task in Backlog" quick inline input.
     - Filter bar: Priority, Assignee, Search.

### 5.2 Drag & Drop Task Allocation
- Allow dragging tasks between the **Product Backlog** and any **Sprint Container**.
- Trigger `useAssignTaskToSprint` with target `sprintId` (or `isBacklog: true` when dropped in backlog).

### 5.3 Complete Sprint Modal Flow
When the user clicks "Complete Sprint":
1. Fetch sprint details to count finished vs unfinished tasks.
2. Render a modal:
   - **Summary:** "8 tasks were completed, 3 tasks remain uncompleted."
   - **Select Target Destination for Unfinished Tasks:**
     - Option A: "Move to next sprint" -> Dropdown of planned sprints (e.g. `Sprint 15`).
     - Option B: "Move to Product Backlog".
3. On confirm, send `POST /api/v1/sprints/:sprintId/complete` with `moveToSprintId`.

---

## 6. Summary Checklist for Frontend Developer

- [ ] Create `/projects/:projectId/backlog` page containing Sprint accordions and Backlog table.
- [ ] Connect `CreateSprintModal` to `POST /api/v1/projects/:projectId/sprints`.
- [ ] Render Sprint capacity progress bars (`completedStoryPoints / totalStoryPoints`).
- [ ] Connect "Start Sprint" button to `POST /api/v1/sprints/:sprintId/start` with error toast handling for already active sprints.
- [ ] Connect "Complete Sprint" button to modal dialog supporting rollover sprint selection.
- [ ] Support drag-and-drop moving tasks between Sprints and Product Backlog (`POST /api/v1/tasks/:taskId/sprint`).
- [ ] Connect Backlog search and priority filters to `GET /api/v1/projects/:projectId/backlog`.
