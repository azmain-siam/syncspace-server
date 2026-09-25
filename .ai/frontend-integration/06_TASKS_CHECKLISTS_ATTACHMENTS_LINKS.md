# Module 06: Tasks, Checklists, Attachments & External Links

This document is the definitive integration guide for **Tasks, Subtask Checklists, File Attachments, and External Links** in the SyncSpace platform. It covers task lifecycle management, cross-column moving and reordering, personal workspace inbox ("My Tasks"), acceptance checklist toggling, Cloudinary file uploads, and external tool linking (Figma, GitHub, Notion, etc.).

---

## 1. Module Overview & Route Architecture

| Method | Endpoint | Description | Roles Allowed | Emitted Realtime Event |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/columns/:columnId/tasks` | Create task in a column | `OWNER`, `ADMIN`, `MEMBER` | `task.created`, `task.assigned` |
| `GET` | `/api/v1/columns/:columnId/tasks` | List tasks in column (paginated/filtered) | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/tasks/:taskId` | Get task details (by UUID or Key `GEN-1`) | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `PATCH` | `/api/v1/tasks/:taskId` | Update task properties | `OWNER`, `ADMIN`, `MEMBER` | `task.updated`, `task.assigned` |
| `POST` | `/api/v1/tasks/:taskId/move` | Move task to column / reorder | `OWNER`, `ADMIN`, `MEMBER` | `task.moved` |
| `DELETE`| `/api/v1/tasks/:taskId` | Soft-delete task | `OWNER`, `ADMIN`, or Creator | `task.deleted` |
| `GET` | `/api/v1/workspaces/:workspaceId/tasks` | Workspace task explorer & KPI drilldown query | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/workspaces/:workspaceId/my-tasks` | Personal workspace inbox (assigned tasks) | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `POST` | `/api/v1/tasks/bulk-update` | Bulk update multiple tasks | `OWNER`, `ADMIN`, `MEMBER` | `tasks.bulk_updated` |
| `POST` | `/api/v1/tasks/bulk-delete` | Bulk soft-delete multiple tasks | `OWNER`, `ADMIN`, or Creator | `tasks.bulk_deleted` |
| `GET` | `/api/v1/tasks/:taskId/checklists` | Get acceptance checklist items | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `POST` | `/api/v1/tasks/:taskId/checklists` | Add item to task checklist | `OWNER`, `ADMIN`, `MEMBER` | `checklist.created` |
| `PATCH` | `/api/v1/tasks/:taskId/checklists/:itemId` | Update checklist title/assignee/order | `OWNER`, `ADMIN`, `MEMBER` | `checklist.updated` |
| `PATCH` | `/api/v1/tasks/:taskId/checklists/:itemId/toggle` | Toggle checklist completion state | `OWNER`, `ADMIN`, `MEMBER` | `checklist.updated` |
| `DELETE`| `/api/v1/tasks/:taskId/checklists/:itemId` | Delete checklist item | `OWNER`, `ADMIN`, `MEMBER` | `checklist.deleted` |
| `POST` | `/api/v1/tasks/:taskId/attachments` | Upload file attachment (10MB max) | `OWNER`, `ADMIN`, `MEMBER` | — |
| `GET` | `/api/v1/tasks/:taskId/attachments` | List task file attachments | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `DELETE`| `/api/v1/tasks/:taskId/attachments/:attachmentId` | Delete file attachment | `OWNER`, `ADMIN`, or Uploader | — |
| `POST` | `/api/v1/tasks/:taskId/links` | Attach external resource link | `OWNER`, `ADMIN`, `MEMBER` | — |
| `GET` | `/api/v1/tasks/:taskId/links` | List external resource links | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/tasks/:taskId/links/:linkId` | Get single external link | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `PATCH` | `/api/v1/tasks/:taskId/links/:linkId` | Update external link | `OWNER`, `ADMIN`, or Creator | — |
| `DELETE`| `/api/v1/tasks/:taskId/links/:linkId` | Delete external link | `OWNER`, `ADMIN`, or Creator | — |

---

## 2. Enums & Core TypeScript Types

```typescript
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

export enum LinkType {
  FIGMA = 'FIGMA',
  GITHUB = 'GITHUB',
  GOOGLE_DOC = 'GOOGLE_DOC',
  NOTION = 'NOTION',
  SWAGGER = 'SWAGGER',
  LOOM = 'LOOM',
  WEBSITE = 'WEBSITE',
  OTHER = 'OTHER',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface TaskLabel {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  assigneeId: string | null;
  assignee?: UserMinimal | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  storageProvider?: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  uploader: UserMinimal;
  createdAt: string;
}

export interface TaskLink {
  id: string;
  taskId: string;
  createdById: string;
  createdBy: UserMinimal;
  title: string;
  url: string;
  type: LinkType;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCounts {
  comments: number;
  attachments: number;
  links: number;
  checklists: number;
}

export interface Task {
  id: string;
  columnId: string;
  sprintId: string | null;
  key: string | null; // e.g. "GEN-1", "SYNC-42"
  taskNumber: number | null;
  assigneeId: string | null;
  createdBy: string;
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
  deletedAt: string | null;
  assignee: UserMinimal | null;
  creator: UserMinimal;
  labels?: TaskLabel[];
  checklists?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
  links?: TaskLink[];
  column?: {
    id: string;
    title: string;
    boardId?: string;
    board?: {
      id: string;
      title: string;
      project: {
        id: string;
        title: string;
        key: string;
        color: string;
        workspaceId?: string;
      };
    };
  };
  sprint?: {
    id: string;
    name: string;
    status: string;
  } | null;
  _count?: TaskCounts;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedTasksResponse {
  tasks: Task[];
  meta: PaginationMeta;
}

export interface MyTasksResponse extends PaginatedTasksResponse {
  grouped?: Record<string, Task[]>;
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 Create Task in Board Column
Auto-generates project-scoped key (`KEY-N`), sets initial order, and creates activity log.

- **Endpoint:** `POST /api/v1/columns/:columnId/tasks`
- **Request Body:**
```json
{
  "title": "Implement JWT auth interceptor",
  "description": "Handle automatic refresh token rotations in Axios",
  "priority": "HIGH",
  "status": "TODO",
  "assigneeId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
  "dueDate": "2026-10-15T18:00:00.000Z",
  "storyPoints": 5,
  "estimatedHours": 6.5,
  "isBacklog": false,
  "sprintId": "550e8400-e29b-41d4-a716-446655440000"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Task created successfully",
  "data": {
    "id": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "columnId": "11111111-2222-3333-4444-555555555555",
    "key": "SYNC-14",
    "taskNumber": 14,
    "createdBy": "88888888-9999-aaaa-bbbb-cccccccccccc",
    "title": "Implement JWT auth interceptor",
    "description": "Handle automatic refresh token rotations in Axios",
    "priority": "HIGH",
    "status": "TODO",
    "assigneeId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "dueDate": "2026-10-15T18:00:00.000Z",
    "order": 0,
    "storyPoints": 5,
    "estimatedHours": 6.5,
    "isBacklog": false,
    "sprintId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2026-09-18T10:00:00.000Z",
    "updatedAt": "2026-09-18T10:00:00.000Z",
    "deletedAt": null,
    "assignee": {
      "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://res.cloudinary.com/.../jane.png"
    },
    "creator": {
      "id": "88888888-9999-aaaa-bbbb-cccccccccccc",
      "name": "Siam Admin",
      "email": "siam@example.com",
      "avatar": null
    },
    "column": {
      "id": "11111111-2222-3333-4444-555555555555",
      "title": "To Do",
      "boardId": "99999999-8888-7777-6666-555555555555"
    },
    "labels": []
  }
}
```

---

### 3.2 List Column Tasks
- **Endpoint:** `GET /api/v1/columns/:columnId/tasks?page=1&limit=20&priority=HIGH&status=TODO&assigneeId=xxx&search=auth`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Column tasks fetched successfully",
  "data": {
    "tasks": [
      {
        "id": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
        "columnId": "11111111-2222-3333-4444-555555555555",
        "key": "SYNC-14",
        "title": "Implement JWT auth interceptor",
        "priority": "HIGH",
        "status": "TODO",
        "order": 0,
        "assignee": {
          "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "labels": [],
        "checklists": [
          { "id": "chk-1", "title": "Unit tests", "isCompleted": true, "order": 0 }
        ],
        "_count": {
          "comments": 3,
          "attachments": 2,
          "links": 1,
          "checklists": 1
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

### 3.3 Get Single Task Details (Dual Identifier Lookup)
Supports both UUID (`7b29a14e-...`) and human key (`SYNC-14` or `sync-14`).
- **Endpoint:** `GET /api/v1/tasks/:taskId` (e.g. `/api/v1/tasks/SYNC-14`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task fetched successfully",
  "data": {
    "id": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "key": "SYNC-14",
    "title": "Implement JWT auth interceptor",
    "description": "Handle automatic refresh token rotations in Axios",
    "priority": "HIGH",
    "status": "TODO",
    "dueDate": "2026-10-15T18:00:00.000Z",
    "order": 0,
    "storyPoints": 5,
    "estimatedHours": 6.5,
    "isBacklog": false,
    "column": {
      "id": "col-uuid",
      "title": "To Do",
      "board": {
        "id": "board-uuid",
        "project": {
          "id": "proj-uuid",
          "title": "SyncSpace Web Client",
          "key": "SYNC",
          "color": "#6366F1",
          "workspaceId": "ws-uuid"
        }
      }
    },
    "assignee": { "id": "user-1", "name": "Jane", "email": "jane@example.com", "avatar": null },
    "creator": { "id": "user-2", "name": "Siam", "email": "siam@example.com", "avatar": null },
    "labels": [],
    "checklists": [
      {
        "id": "chk-1",
        "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
        "title": "Write unit tests",
        "isCompleted": false,
        "order": 0,
        "assignee": null
      }
    ],
    "attachments": [
      {
        "id": "att-1",
        "fileName": "auth_flow.png",
        "fileUrl": "https://res.cloudinary.com/.../auth_flow.png",
        "fileSize": 142800,
        "mimeType": "image/png",
        "createdAt": "2026-09-18T10:15:00.000Z",
        "uploader": { "id": "user-2", "name": "Siam", "email": "siam@example.com", "avatar": null }
      }
    ],
    "links": [
      {
        "id": "lnk-1",
        "title": "Figma Auth Designs",
        "url": "https://figma.com/file/123",
        "type": "FIGMA",
        "createdBy": { "id": "user-2", "name": "Siam", "email": "siam@example.com", "avatar": null }
      }
    ],
    "_count": {
      "comments": 4,
      "attachments": 1,
      "links": 1,
      "checklists": 1
    }
  }
}
```

---

### 3.4 Move Task Across Columns & Reorder (Drag-and-Drop Core)
Handles reindexing in the target column and **automatically synchronizes `Task.status`** from destination column title if `status` is omitted (e.g. moving to "Done" -> `TaskStatus.DONE`).

- **Endpoint:** `POST /api/v1/tasks/:taskId/move`
- **Request Body:**
```json
{
  "targetColumnId": "22222222-3333-4444-5555-666666666666",
  "targetOrder": 1,
  "status": "IN_PROGRESS"
}
```
*(Note: `status` is optional. If omitted, the backend infers: "Done" -> `DONE`, "In Progress"/"Doing" -> `IN_PROGRESS`, "Review"/"QA" -> `REVIEW`, "To Do" -> `TODO`)*.

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task moved successfully",
  "data": {
    "id": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "columnId": "22222222-3333-4444-5555-666666666666",
    "order": 1,
    "status": "IN_PROGRESS",
    "column": {
      "id": "22222222-3333-4444-5555-666666666666",
      "title": "In Progress"
    },
    "assignee": {
      "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": null
    }
  }
}
```

---

### 3.5 Workspace Task Explorer & KPI Drilldown (Workspace-Wide Query)
Queries all active tasks across all projects within the given workspace. Supports multi-dimensional filtering, sorting, pagination, and grouping (unblocks KPI drilldown interactions such as clicking *"3 Overdue"* or *"11 In Progress"*).

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/tasks`
- **Query Parameters:**
  - `status`: `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `assigneeId`: UUID or `"unassigned"`
  - `projectId`: Filter by project UUID
  - `sprintId`: Filter by sprint UUID or `"none"`
  - `isBacklog`: `true` | `false`
  - `dueDate`: `'today'` | `'overdue'` | `'upcoming'` | `'nodate'`
  - `search`: Search text across task title, description, or key
  - `sortBy`: `'dueDate'` | `'priority'` | `'status'` | `'createdAt'` | `'updatedAt'` | `'title'` | `'order'` (default: `'createdAt'`)
  - `sortOrder`: `'asc'` | `'desc'` (default: `'desc'`)
  - `groupBy`: `'project'` | `'priority'` | `'status'` | `'dueDate'` | `'assignee'`
  - `page`: default 1
  - `limit`: default 20 (max 100)
- **Example Request:** `GET /api/v1/workspaces/ws-uuid-1/tasks?dueDate=overdue&limit=20`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace tasks fetched successfully",
  "data": {
    "tasks": [
      {
        "id": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
        "columnId": "11111111-2222-3333-4444-555555555555",
        "key": "SYNC-14",
        "title": "Implement JWT auth interceptor",
        "description": "Handle token refresh rotation",
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "dueDate": "2026-09-20T12:00:00.000Z",
        "order": 1,
        "storyPoints": 5,
        "estimatedHours": 6.0,
        "isBacklog": false,
        "createdAt": "2026-09-18T10:00:00.000Z",
        "updatedAt": "2026-09-20T14:00:00.000Z",
        "assignee": {
          "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        },
        "creator": {
          "id": "88888888-9999-aaaa-bbbb-cccccccccccc",
          "name": "Siam Admin",
          "email": "siam@example.com",
          "avatar": null
        },
        "column": {
          "id": "11111111-2222-3333-4444-555555555555",
          "title": "In Progress",
          "board": {
            "id": "board-uuid-1",
            "title": "Main Kanban",
            "project": {
              "id": "proj-uuid-1",
              "title": "SyncSpace Client",
              "key": "SYNC",
              "color": "#6366F1"
            }
          }
        },
        "labels": [],
        "checklists": [
          { "id": "chk-1", "title": "Unit tests", "isCompleted": true, "order": 0 }
        ],
        "_count": {
          "comments": 3,
          "attachments": 1,
          "links": 1,
          "checklists": 1
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

### 3.6 Personal Workspace Inbox: "My Tasks"
Fetches all active tasks assigned to the current user across all projects within the given workspace.

- **Endpoint:** `GET /api/v1/workspaces/:workspaceId/my-tasks`
- **Query Parameters:**
  - `status`: `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `projectId`: Filter by project UUID
  - `dueDate`: `'today'` | `'overdue'` | `'upcoming'` | `'nodate'`
  - `groupBy`: `'project'` | `'priority'` | `'status'` | `'dueDate'`
  - `page`: default 1
  - `limit`: default 50
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Personal workspace tasks fetched successfully",
  "data": {
    "tasks": [ ... ],
    "grouped": {
      "SyncSpace Web Client": [ ... ],
      "SyncSpace API Server": [ ... ]
    },
    "meta": {
      "total": 12,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.6 Bulk Operations (Update & Delete)

#### Bulk Update Tasks
- **Endpoint:** `POST /api/v1/tasks/bulk-update` or `POST /api/v1/workspaces/:workspaceId/tasks/bulk-update`
- **Request Body:**
```json
{
  "taskIds": [
    "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "8c39b25f-0934-5322-a3c5-8cc0df99fa5b"
  ],
  "data": {
    "priority": "URGENT",
    "status": "IN_PROGRESS",
    "assigneeId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "isBacklog": false,
    "storyPoints": 8
  }
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tasks updated successfully in bulk",
  "data": {
    "updatedCount": 2,
    "tasks": [ ... ]
  }
}
```

#### Bulk Delete Tasks
- **Endpoint:** `POST /api/v1/tasks/bulk-delete`
- **Request Body:**
```json
{
  "taskIds": ["7b29a14e-f823-4211-92b4-7bb9cf88ef4a"]
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tasks deleted successfully in bulk",
  "data": {
    "deletedCount": 1,
    "taskIds": ["7b29a14e-f823-4211-92b4-7bb9cf88ef4a"]
  }
}
```

---

### 3.7 Acceptance Checklists (Subtasks)

#### Get Checklist Items
- **Endpoint:** `GET /api/v1/tasks/:taskId/checklists`

#### Add Checklist Item
- **Endpoint:** `POST /api/v1/tasks/:taskId/checklists`
- **Request Body:**
```json
{
  "title": "Write unit tests with 90%+ coverage",
  "assigneeId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
  "order": 0
}
```

#### Update Checklist Item
- **Endpoint:** `PATCH /api/v1/tasks/:taskId/checklists/:itemId`
- **Request Body:**
```json
{
  "title": "Write unit & E2E tests with 90%+ coverage",
  "isCompleted": true,
  "assigneeId": null,
  "order": 1
}
```

#### Toggle Checklist Item (Quick Checkbox Action)
- **Endpoint:** `PATCH /api/v1/tasks/:taskId/checklists/:itemId/toggle`
- **Request Body:** `{}` (empty object)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checklist item completion toggled",
  "data": {
    "id": "chk-1",
    "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "title": "Write unit tests",
    "isCompleted": true,
    "order": 0,
    "assignee": null
  }
}
```

#### Delete Checklist Item
- **Endpoint:** `DELETE /api/v1/tasks/:taskId/checklists/:itemId`

---

### 3.8 Task File Attachments (Cloudinary Storage)

- Allowed File Types: Images (`jpg, jpeg, png, gif, webp, svg`), Documents (`pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv`), Archives (`zip, tar, gz`).
- Size limit: **10MB (10 * 1024 * 1024 bytes)**.

#### Upload File
- **Endpoint:** `POST /api/v1/tasks/:taskId/attachments`
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:**
  - Field: `file` (Binary File)
- **Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": "att-1234",
    "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "fileName": "Architecture_Spec.pdf",
    "fileUrl": "https://res.cloudinary.com/syncspace/raw/upload/v1726650000/Architecture_Spec.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "createdAt": "2026-09-18T10:45:00.000Z",
    "uploader": {
      "id": "user-uuid",
      "name": "Siam Admin",
      "email": "siam@example.com",
      "avatar": null
    }
  }
}
```

#### Delete Attachment
- **Endpoint:** `DELETE /api/v1/tasks/:taskId/attachments/:attachmentId`
- Allowed for uploader or workspace `OWNER`/`ADMIN`.

---

### 3.9 Task External Links

#### Create Link
- **Endpoint:** `POST /api/v1/tasks/:taskId/links`
- **Request Body:**
```json
{
  "title": "Figma Component Library",
  "url": "https://www.figma.com/design/xyz987/Design-System",
  "type": "FIGMA"
}
```
*(Types: `FIGMA`, `GITHUB`, `GOOGLE_DOC`, `NOTION`, `SWAGGER`, `LOOM`, `WEBSITE`, `OTHER`)*

#### List Links
- **Endpoint:** `GET /api/v1/tasks/:taskId/links`

#### Update Link
- **Endpoint:** `PATCH /api/v1/tasks/:taskId/links/:linkId`
```json
{
  "title": "Updated Figma System v2",
  "url": "https://www.figma.com/design/xyz987/Design-System-v2"
}
```

#### Delete Link
- **Endpoint:** `DELETE /api/v1/tasks/:taskId/links/:linkId`

---

## 4. Frontend Integration Recipes (Zod + React Query)

### 4.1 Zod Validation Schemas

```typescript
// src/features/tasks/schemas/task.schema.ts
import { z } from 'zod';
import { TaskPriority, TaskStatus, LinkType } from '../types';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 chars'),
  description: z.string().max(2000, 'Description cannot exceed 2000 chars').optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  order: z.number().int().min(0).optional(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  isBacklog: z.boolean().default(false),
  sprintId: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const moveTaskSchema = z.object({
  targetColumnId: z.string().uuid(),
  targetOrder: z.number().int().min(0),
  status: z.nativeEnum(TaskStatus).optional(),
});

export const checklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  assigneeId: z.string().uuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const taskLinkSchema = z.object({
  title: z.string().min(2).max(100),
  url: z.string().url('Must be a valid URL'),
  type: z.nativeEnum(LinkType),
});
```

---

### 4.2 React Query Hooks with Optimistic Drag-and-Drop

```typescript
// src/features/tasks/api/task-queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Task, TaskChecklistItem, TaskAttachment, TaskLink, MyTasksResponse } from '../types';

// 1. Column Tasks
export function useColumnTasks(columnId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['column-tasks', columnId, params],
    queryFn: async () => {
      const res = await apiClient.get(`/columns/${columnId}/tasks`, { params });
      return res.data.data;
    },
    enabled: Boolean(columnId),
  });
}

// 2. Task Details by ID or Key
export function useTaskDetails(taskIdOrKey: string) {
  return useQuery<Task>({
    queryKey: ['task', taskIdOrKey],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskIdOrKey}`);
      return res.data.data;
    },
    enabled: Boolean(taskIdOrKey),
  });
}

// 3. Move Task with Optimistic Kanban Drag-and-Drop
export function useMoveTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      targetColumnId,
      targetOrder,
      status,
    }: {
      taskId: string;
      targetColumnId: string;
      targetOrder: number;
      status?: string;
    }) => {
      const res = await apiClient.post(`/tasks/${taskId}/move`, {
        targetColumnId,
        targetOrder,
        status,
      });
      return res.data.data;
    },
    onMutate: async ({ taskId, targetColumnId, targetOrder }) => {
      // Cancel ongoing queries for this board
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });

      const previousBoard = queryClient.getQueryData(['board', boardId]);

      // Optimistically update board query data
      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old) return old;
        // Deep clone and splice task into target column at targetOrder
        const updatedColumns = old.columns.map((col: any) => {
          const filteredTasks = col.tasks.filter((t: any) => t.id !== taskId);
          return { ...col, tasks: filteredTasks };
        });

        // Find moving task
        let movingTask: any = null;
        for (const col of old.columns) {
          const t = col.tasks.find((task: any) => task.id === taskId);
          if (t) {
            movingTask = { ...t, columnId: targetColumnId, order: targetOrder };
            break;
          }
        }

        if (!movingTask) return old;

        return {
          ...old,
          columns: updatedColumns.map((col: any) => {
            if (col.id === targetColumnId) {
              const newTasks = [...col.tasks];
              newTasks.splice(targetOrder, 0, movingTask);
              return { ...col, tasks: newTasks };
            }
            return col;
          }),
        };
      });

      return { previousBoard };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

// 4. Checklist Item Toggle
export function useToggleChecklistItem(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiClient.patch(`/tasks/${taskId}/checklists/${itemId}/toggle`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// 5. Upload File Attachment
export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// 6. My Tasks (Personal Inbox)
export function useMyTasks(workspaceId: string, filters?: Record<string, any>) {
  return useQuery<MyTasksResponse>({
    queryKey: ['my-tasks', workspaceId, filters],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/my-tasks`, {
        params: filters,
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}

// 7. Workspace-Wide Task Explorer & KPI Drilldown
export function useWorkspaceTasks(workspaceId: string, filters?: Record<string, any>) {
  return useQuery<PaginatedTasksResponse>({
    queryKey: ['workspace-tasks', workspaceId, filters],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/tasks`, {
        params: filters,
      });
      return res.data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
```

---

## 5. Real-Time Socket.IO Subscriptions for Tasks

When users create, drag, or delete tasks, the backend emits WebSocket events. Listen to these events to keep collaborative Kanban boards in sync:

```typescript
// Example Socket Event Listener in React Component / Store
useEffect(() => {
  if (!socket || !boardId) return;

  socket.on('task.created', ({ task, boardId: eventBoardId }) => {
    if (eventBoardId === boardId) {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    }
  });

  socket.on('task.moved', ({ taskId, sourceColumnId, destinationColumnId, boardId: eventBoardId }) => {
    if (eventBoardId === boardId) {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    }
  });

  socket.on('task.deleted', ({ taskId, boardId: eventBoardId }) => {
    if (eventBoardId === boardId) {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    }
  });

  return () => {
    socket.off('task.created');
    socket.off('task.moved');
    socket.off('task.deleted');
  };
}, [socket, boardId]);
```

---

## 6. Summary Checklist for Frontend Developer

- [ ] Connect `TaskModal` / `TaskDrawer` to `GET /tasks/:taskId` (supporting both UUID and Key URLs like `/projects/SYNC/tasks/SYNC-14`).
- [ ] Connect task creation button in column header to `POST /columns/:columnId/tasks`.
- [ ] Connect `@hello-pangea/dnd` or `@dnd-kit` card drop handler to `POST /tasks/:taskId/move` with optimistic update.
- [ ] Render acceptance criteria / checklist progress bar (`completedCount / totalCount`).
- [ ] Support multipart upload of attachments (images, PDFs, ZIPs up to 10MB) to `POST /tasks/:taskId/attachments`.
- [ ] Render link badge chips with custom icons based on `LinkType` (`FIGMA`, `GITHUB`, `NOTION`, `GOOGLE_DOC`, `LOOM`, etc.).
- [ ] Implement "My Tasks" view at `/workspaces/:workspaceSlug/my-tasks` grouping by Project, Due Date, or Priority.
