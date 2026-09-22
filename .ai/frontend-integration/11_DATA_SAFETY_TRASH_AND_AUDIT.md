# Module 11: Data Safety, Trash Bin & Audit Feeds

This document is the definitive integration guide for **Data Safety, Workspace Trash Bin Recovery, Activity Streams, and Security Audit Logs** in the SyncSpace platform. It covers soft-deleted item restoration, permanent purging, project/task dependency validations, collaborative activity timelines, and administrative security compliance feeds.

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed | Emitted Logs |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/trash` | List soft-deleted tasks & projects | `OWNER`, `ADMIN` | — |
| `POST` | `/api/v1/workspaces/:workspaceId/trash/restore` | Restore soft-deleted task or project | `OWNER`, `ADMIN`, `MEMBER` | `Activity`, `AuditLog` |
| `DELETE`| `/api/v1/workspaces/:workspaceId/trash/empty` | Permanently purge all or specific item | `OWNER`, `ADMIN` | `AuditLog` |
| `GET` | `/api/v1/workspaces/:workspaceId/activities` | Paginated workspace activity timeline | `OWNER`, `ADMIN`, `MEMBER` | — |
| `GET` | `/api/v1/tasks/:taskId/activities` | Task-specific activity history stream | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/workspaces/:workspaceId/audit-logs` | Security & compliance audit log feed | `OWNER`, `ADMIN` | — |

---

## 2. Enums & Core TypeScript Types

```typescript
export enum TrashItemType {
  TASK = 'TASK',
  PROJECT = 'PROJECT',
}

export enum ActivityAction {
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  WORKSPACE_DELETED = 'WORKSPACE_DELETED',
  MEMBER_INVITED = 'MEMBER_INVITED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  ROLE_UPDATED = 'ROLE_UPDATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  INVITATION_SENT = 'INVITATION_SENT',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  INVITATION_DECLINED = 'INVITATION_DECLINED',
  INVITATION_CANCELLED = 'INVITATION_CANCELLED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_ARCHIVED = 'PROJECT_ARCHIVED',
  PROJECT_RESTORED = 'PROJECT_RESTORED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  BOARD_CREATED = 'BOARD_CREATED',
  BOARD_UPDATED = 'BOARD_UPDATED',
  BOARD_DELETED = 'BOARD_DELETED',
  COLUMN_CREATED = 'COLUMN_CREATED',
  COLUMN_UPDATED = 'COLUMN_UPDATED',
  COLUMN_DELETED = 'COLUMN_DELETED',
  COLUMN_REORDERED = 'COLUMN_REORDERED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_MOVED = 'TASK_MOVED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_RESTORED = 'TASK_RESTORED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  COMMENT_DELETED = 'COMMENT_DELETED',
  COMMENT_REACTION_ADDED = 'COMMENT_REACTION_ADDED',
  COMMENT_REACTION_REMOVED = 'COMMENT_REACTION_REMOVED',
  ATTACHMENT_UPLOADED = 'ATTACHMENT_UPLOADED',
  ATTACHMENT_DELETED = 'ATTACHMENT_DELETED',
  TASK_LINK_CREATED = 'TASK_LINK_CREATED',
  TASK_LINK_UPDATED = 'TASK_LINK_UPDATED',
  TASK_LINK_DELETED = 'TASK_LINK_DELETED',
  CHECKLIST_ITEM_CREATED = 'CHECKLIST_ITEM_CREATED',
  CHECKLIST_ITEM_TOGGLED = 'CHECKLIST_ITEM_TOGGLED',
  CHECKLIST_ITEM_UPDATED = 'CHECKLIST_ITEM_UPDATED',
  CHECKLIST_ITEM_DELETED = 'CHECKLIST_ITEM_DELETED',
  LABEL_CREATED = 'LABEL_CREATED',
  LABEL_UPDATED = 'LABEL_UPDATED',
  LABEL_DELETED = 'LABEL_DELETED',
  LABEL_ATTACHED = 'LABEL_ATTACHED',
  LABEL_DETACHED = 'LABEL_DETACHED',
  SPRINT_CREATED = 'SPRINT_CREATED',
  SPRINT_UPDATED = 'SPRINT_UPDATED',
  SPRINT_STARTED = 'SPRINT_STARTED',
  SPRINT_COMPLETED = 'SPRINT_COMPLETED',
  SPRINT_DELETED = 'SPRINT_DELETED',
  TASK_MOVED_TO_SPRINT = 'TASK_MOVED_TO_SPRINT',
  TASKS_BULK_UPDATED = 'TASKS_BULK_UPDATED',
  TASKS_BULK_DELETED = 'TASKS_BULK_DELETED',
}

export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  EMAIL_VERIFICATION_SENT = 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  VERIFICATION_EMAIL_RESENT = 'VERIFICATION_EMAIL_RESENT',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  WORKSPACE_INVITATION_CREATED = 'WORKSPACE_INVITATION_CREATED',
  WORKSPACE_INVITATION_ACCEPTED = 'WORKSPACE_INVITATION_ACCEPTED',
  WORKSPACE_INVITATION_DECLINED = 'WORKSPACE_INVITATION_DECLINED',
  WORKSPACE_INVITATION_CANCELLED = 'WORKSPACE_INVITATION_CANCELLED',
  WORKSPACE_DELETED = 'WORKSPACE_DELETED',
  WORKSPACE_LEFT = 'WORKSPACE_LEFT',
  GOOGLE_LOGIN = 'GOOGLE_LOGIN',
  GOOGLE_ACCOUNT_CREATED = 'GOOGLE_ACCOUNT_CREATED',
  GOOGLE_ACCOUNT_LINKED = 'GOOGLE_ACCOUNT_LINKED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  TRASH_ITEM_RESTORED = 'TRASH_ITEM_RESTORED',
  TRASH_EMPTIED = 'TRASH_EMPTIED',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface TaskContainerInfo {
  projectId: string;
  projectName: string;
  projectKey: string | null;
  projectDeleted: boolean;
  boardId: string;
  boardName: string;
  columnId: string;
  columnName: string;
}

export interface TrashItem {
  id: string;
  itemType: 'TASK' | 'PROJECT';
  title: string;
  key: string | null;
  slug?: string | null;
  deletedAt: string;
  deletedBy: UserMinimal;
  container: TaskContainerInfo | null;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  boardId: string | null;
  actorId: string;
  action: ActivityAction;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  actor: UserMinimal;
  project?: {
    id: string;
    title: string;
  } | null;
}

export interface AuditLog {
  id: string;
  workspaceId: string | null;
  actorId: string | null;
  action: AuditAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  actor: UserMinimal | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedTrashResponse {
  items: TrashItem[];
  meta: PaginationMeta;
}

export interface PaginatedActivitiesResponse {
  activities: WorkspaceActivity[];
  meta: PaginationMeta;
}

export interface PaginatedAuditLogsResponse {
  auditLogs: AuditLog[];
  meta: PaginationMeta;
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 List Workspace Trash Bin
Lists all soft-deleted projects and tasks with their deletion timestamp, author, and parent hierarchy container.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/trash`
- **Query Parameters:**
  - `type` *(optional, enum: `'ALL' | 'TASK' | 'PROJECT'`, default: `'ALL'`)*
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20, max: 100)*
  - `search` *(optional, string)*: Filter items by title or key.
- **Example Request:** `GET /api/v1/workspaces/ws-uuid-1/trash?type=ALL&page=1&limit=20`

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trash items fetched successfully",
  "data": {
    "items": [
      {
        "id": "task-uuid-1",
        "itemType": "TASK",
        "title": "Old deprecated login component",
        "key": "SYNC-12",
        "deletedAt": "2026-09-20T10:15:00.000Z",
        "deletedBy": {
          "id": "user-uuid-1",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "container": {
          "projectId": "proj-uuid-1",
          "projectName": "SyncSpace Client",
          "projectKey": "SYNC",
          "projectDeleted": false,
          "boardId": "board-uuid-1",
          "boardName": "Web Kanban",
          "columnId": "col-uuid-1",
          "columnName": "Done"
        }
      },
      {
        "id": "proj-uuid-2",
        "itemType": "PROJECT",
        "title": "Marketing Landing Page 2025",
        "key": "MKT",
        "slug": "marketing-landing-page-2025",
        "deletedAt": "2026-09-18T08:00:00.000Z",
        "deletedBy": {
          "id": "user-uuid-2",
          "name": "Siam Admin",
          "email": "siam@example.com",
          "avatar": null
        },
        "container": null
      }
    ],
    "meta": {
      "total": 2,
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

### 3.2 Restore Item from Trash
Restores a project or task back to active status (`deletedAt: null`).

> [!IMPORTANT]
> **Parent Dependency Validation:** When restoring a task whose parent project is also soft-deleted (`container.projectDeleted === true`), the backend returns `400 Bad Request` with:
> `"Cannot restore task '<title>' because parent project '<projectTitle>' is also in trash. Please restore the project first."`

- **Endpoint:** `POST /api/v1/workspaces/:workspaceId/trash/restore`
- **Request Body:**
```json
{
  "itemType": "TASK",
  "itemId": "task-uuid-1"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item restored successfully",
  "data": {
    "success": true,
    "message": "Task \"Old deprecated login component\" restored successfully",
    "item": {
      "id": "task-uuid-1",
      "deletedAt": null
    }
  }
}
```

---

### 3.3 Permanently Purge Trash (Empty Trash)
Permanently deletes items from the database (hard delete). Allows clearing the entire workspace trash or purging a specific item.

- **Endpoint:** `DELETE /api/v1/workspaces/:workspaceId/trash/empty`
- **Query Parameters:**
  - `itemId` *(optional, string)*: Specific item to purge.
  - `itemType` *(optional, `'TASK' | 'PROJECT'`)*: Required if `itemId` is provided.
  - *(If both omitted, permanently purges **ALL** soft-deleted projects and tasks in the workspace)*.
- **Example Request (Purge All):** `DELETE /api/v1/workspaces/ws-uuid-1/trash/empty`
- **Example Request (Purge Single Task):** `DELETE /api/v1/workspaces/ws-uuid-1/trash/empty?itemId=task-uuid-1&itemType=TASK`

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trash emptied successfully",
  "data": {
    "success": true,
    "message": "Trash permanently purged"
  }
}
```

---

### 3.4 Workspace Activity Stream
Retrieves a unified chronological feed of team actions across the entire workspace (task updates, board changes, invitations, checklist toggles).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/activities`
- **Query Parameters:**
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace activities fetched successfully",
  "data": {
    "activities": [
      {
        "id": "act-uuid-1",
        "workspaceId": "ws-uuid-1",
        "projectId": "proj-uuid-1",
        "taskId": "task-uuid-1",
        "boardId": "board-uuid-1",
        "actorId": "user-uuid-1",
        "action": "TASK_MOVED",
        "description": "Jane Doe moved task Implement OAuth Flow to In Progress",
        "metadata": {
          "fromColumnId": "col-1",
          "toColumnId": "col-2",
          "status": "IN_PROGRESS"
        },
        "createdAt": "2026-09-21T07:20:00.000Z",
        "actor": {
          "id": "user-uuid-1",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "project": {
          "id": "proj-uuid-1",
          "title": "SyncSpace Client"
        }
      }
    ],
    "meta": {
      "total": 142,
      "page": 1,
      "limit": 20,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.5 Task Activity Stream (Task Modal History Tab)
Retrieves the dedicated audit history for a single task card.

- **Endpoint:** `GET /api/v1/tasks/:taskId/activities`
- **Query Parameters:**
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task activities fetched successfully",
  "data": {
    "activities": [
      {
        "id": "act-uuid-2",
        "workspaceId": "ws-uuid-1",
        "taskId": "task-uuid-1",
        "actorId": "user-uuid-1",
        "action": "CHECKLIST_ITEM_TOGGLED",
        "description": "Jane Doe marked \"Write Unit Tests\" as completed",
        "metadata": {
          "checklistItemId": "chk-1",
          "isCompleted": true
        },
        "createdAt": "2026-09-21T07:10:00.000Z",
        "actor": {
          "id": "user-uuid-1",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        }
      }
    ],
    "meta": {
      "total": 5,
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

### 3.6 Security & Compliance Audit Log Feed
For workspace **Owners** and **Admins**. Tracks sensitive security actions (logins, password changes, invite cancellations, trash purges) with IP address and User Agent data.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/audit-logs`
- **Query Parameters:**
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
  - `actorId` *(optional, UUID)*: Filter by performing user.
  - `action` *(optional, enum: `AuditAction`)*: Filter by event type (e.g. `TRASH_EMPTIED`, `WORKSPACE_LEFT`).
  - `startDate` *(optional, ISO Date)*: Created on or after.
  - `endDate` *(optional, ISO Date)*: Created on or before.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace audit logs fetched successfully",
  "data": {
    "auditLogs": [
      {
        "id": "audit-uuid-1",
        "workspaceId": "ws-uuid-1",
        "actorId": "user-uuid-2",
        "action": "TRASH_EMPTIED",
        "ipAddress": "192.168.1.50",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "metadata": {
          "itemId": null,
          "itemType": null
        },
        "createdAt": "2026-09-21T06:00:00.000Z",
        "actor": {
          "id": "user-uuid-2",
          "name": "Siam Admin",
          "email": "siam@example.com",
          "avatar": null
        }
      }
    ],
    "meta": {
      "total": 35,
      "page": 1,
      "limit": 20,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## 4. Frontend Integration Recipes (React Query Hooks)

```typescript
// src/features/safety/hooks/use-trash-and-feeds.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import {
  PaginatedTrashResponse,
  PaginatedActivitiesResponse,
  PaginatedAuditLogsResponse,
} from '../types';

// 1. Fetch Trash Bin Items
export function useTrashItems(workspaceId: string, params?: { type?: string; page?: number; limit?: number; search?: string }) {
  return useQuery<PaginatedTrashResponse>({
    queryKey: ['trash', workspaceId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/trash`, { params });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 2. Restore Item from Trash
export function useRestoreTrashItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: 'TASK' | 'PROJECT' }) => {
      const res = await apiClient.post(`/workspaces/${workspaceId}/trash/restore`, {
        itemId,
        itemType,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Item restored successfully');
      queryClient.invalidateQueries({ queryKey: ['trash', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore item');
    },
  });
}

// 3. Empty Trash / Purge Permanently
export function useEmptyTrash(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { itemId?: string; itemType?: 'TASK' | 'PROJECT' }) => {
      const res = await apiClient.delete(`/workspaces/${workspaceId}/trash/empty`, { params });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Trash emptied successfully');
      queryClient.invalidateQueries({ queryKey: ['trash', workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to empty trash');
    },
  });
}

// 4. Workspace Activity Feed
export function useWorkspaceActivities(workspaceId: string, page = 1, limit = 20) {
  return useQuery<PaginatedActivitiesResponse>({
    queryKey: ['workspace-activities', workspaceId, page, limit],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/activities`, {
        params: { page, limit },
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 5. Task Detail Modal Activity History
export function useTaskActivities(taskId: string, page = 1, limit = 20) {
  return useQuery<PaginatedActivitiesResponse>({
    queryKey: ['task-activities', taskId, page, limit],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}/activities`, {
        params: { page, limit },
      });
      return res.data.data;
    },
    enabled: Boolean(taskId),
  });
}

// 6. Security Audit Logs Feed
export function useWorkspaceAuditLogs(workspaceId: string, params?: Record<string, any>) {
  return useQuery<PaginatedAuditLogsResponse>({
    queryKey: ['workspace-audit-logs', workspaceId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/audit-logs`, { params });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
```

---

## 5. UI/UX Interaction Best Practices

### 5.1 Trash Bin View (`/workspaces/:slug/settings/trash`)
- **Filter Tabs:** `"All"`, `"Tasks"`, `"Projects"`.
- **Search Bar:** Real-time search by title or key.
- **Dependency Warning on Tasks:** If `container.projectDeleted === true`, show an alert badge: `"Parent project in trash"`. Disable the restore button with a tooltip or guide the user to restore the project first.
- **Empty Trash Safety Modal:** Before purging, show a critical confirmation modal requiring the user to type `"DELETE"` or confirm that this action is permanent and cannot be undone.

### 5.2 Task Modal "Activity" / "History" Tab
- Inside `TaskDetailSheet` / `TaskModal`, render a tab next to "Comments" titled **"Activity"**.
- Display an event timeline with actor avatar, action label, humanized description, and relative time (e.g. `"Jane Doe changed priority to High • 2h ago"`).

### 5.3 Audit Log Compliance Table (`/workspaces/:slug/settings/audit-logs`)
- Display a data table with columns: `Timestamp`, `Actor`, `Event Action`, `IP Address`, `Details`.
- Clicking a row expands a JSON viewer for `metadata` payload details.

---

## 6. Summary Checklist for Frontend Developer

- [ ] Create `/workspaces/:workspaceSlug/settings/trash` page (accessible by Owner/Admin).
- [ ] Connect table to `useTrashItems` with filters for `type` (`ALL`, `TASK`, `PROJECT`) and search.
- [ ] Connect "Restore" button to `useRestoreTrashItem` and handle parent project dependency errors gracefully.
- [ ] Connect "Empty Trash" button with high-friction confirmation dialog to `useEmptyTrash`.
- [ ] Add "Activity" tab to `TaskDetailSheet` using `useTaskActivities(taskId)`.
- [ ] Create Workspace Activity Timeline feed on workspace home or dashboard.
- [ ] Build `/workspaces/:workspaceSlug/settings/audit-logs` compliance table with action filter and date range picker.
