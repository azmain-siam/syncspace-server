# Module 5: Kanban Boards & Columns (`/boards`, `/columns`)

> **Integration Target:** Kanban Board Views, Column Management, Drag-and-Drop Column Reordering, and Default Column Provisioning  
> **Backend Base URL:** `http://localhost:5000/api/v1`  
> **Auth Type:** Bearer JWT (`Authorization: Bearer <accessToken>`)  

---

## 1. Endpoints Overview

All endpoints require an active session (`Authorization: Bearer <accessToken>`).

### 1.1 Kanban Boards
| Method | Endpoint | Required Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces/:workspaceId/projects/:projectId/boards` | Any Member | List all Kanban boards in project |
| `POST` | `/workspaces/:workspaceId/projects/:projectId/boards` | `OWNER`, `ADMIN` | Create board (optionally auto-seeds default columns) |
| `GET` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId` | Any Member | Get single board with its columns list |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId` | `OWNER`, `ADMIN` | Update board title |
| `DELETE` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId` | `OWNER`, `ADMIN` | Delete board |

### 1.2 Board Columns
| Method | Endpoint | Required Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns` | Any Member | List columns in board (ordered by `order: asc`) |
| `POST` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns` | `OWNER`, `ADMIN` | Create column in board (appends to end if order omitted) |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId` | `OWNER`, `ADMIN` | Update column title |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/reorder` | `OWNER`, `ADMIN` | **Reorder columns** via drag-and-drop |
| `DELETE` | `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId` | `OWNER`, `ADMIN` | Delete column |

---

## 2. Core TypeScript Interfaces

### Board Column Model
```typescript
export interface BoardColumn {
  id: string;
  boardId: string;
  title: string;
  order: number; // 0-indexed position
  createdAt: string;
  updatedAt: string;
}
```

### Kanban Board Model
```typescript
export interface Board {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  columns?: BoardColumn[];
}
```

---

## 3. Endpoint Specifications

### 3.1 Get Project Boards
Fetches all boards for a specific project.

- **Route:** `GET /api/v1/workspaces/:workspaceId/projects/:projectId/boards`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project boards fetched successfully",
  "data": [
    {
      "id": "b1a2b3c4-9999-8888-7777-666655554444",
      "projectId": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
      "title": "Main Board",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z",
      "columns": [
        {
          "id": "col_1",
          "boardId": "b1a2b3c4-9999-8888-7777-666655554444",
          "title": "To Do",
          "order": 0,
          "createdAt": "2026-09-18T10:00:00.000Z",
          "updatedAt": "2026-09-18T10:00:00.000Z"
        },
        {
          "id": "col_2",
          "boardId": "b1a2b3c4-9999-8888-7777-666655554444",
          "title": "In Progress",
          "order": 1,
          "createdAt": "2026-09-18T10:00:00.000Z",
          "updatedAt": "2026-09-18T10:00:00.000Z"
        },
        {
          "id": "col_3",
          "boardId": "b1a2b3c4-9999-8888-7777-666655554444",
          "title": "Done",
          "order": 2,
          "createdAt": "2026-09-18T10:00:00.000Z",
          "updatedAt": "2026-09-18T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 3.2 Create Board
Creates a board in a project.  
✨ **Default Columns Provisioning:** When `includeDefaultColumns` is `true` (default), the backend automatically seeds 4 columns: `['Todo', 'In Progress', 'Review', 'Done']`.

- **Route:** `POST /api/v1/workspaces/:workspaceId/projects/:projectId/boards`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface CreateBoardRequest {
  title: string;                  // 2 to 100 characters (Required)
  includeDefaultColumns?: boolean; // Defaults to true
}
```

#### Request Example
```json
{
  "title": "Sprint 14 Kanban",
  "includeDefaultColumns": true
}
```

#### Success Response (201 Created)
Returns the created `Board` including its seeded `columns`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Board created successfully",
  "data": {
    "id": "b9f8e7d6-5c4b-3a21-0fed-cba987654321",
    "projectId": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
    "title": "Sprint 14 Kanban",
    "createdAt": "2026-09-18T16:00:00.000Z",
    "updatedAt": "2026-09-18T16:00:00.000Z",
    "columns": [
      { "id": "c_1", "boardId": "b9f8e7d6-...", "title": "Todo", "order": 0 },
      { "id": "c_2", "boardId": "b9f8e7d6-...", "title": "In Progress", "order": 1 },
      { "id": "c_3", "boardId": "b9f8e7d6-...", "title": "Review", "order": 2 },
      { "id": "c_4", "boardId": "b9f8e7d6-...", "title": "Done", "order": 3 }
    ]
  }
}
```

---

### 3.3 Get Single Board
- **Route:** `GET /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
Returns the single `Board` object with its sorted `columns`.

#### Errors
- `404 Not Found`: `"Board not found"` or `"Project not found in this workspace"`

---

### 3.4 Update Board
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface UpdateBoardRequest {
  title?: string; // 2 to 100 characters
}
```

#### Success Response (200 OK)
Returns the updated `Board` object.

---

### 3.5 Delete Board
- **Route:** `DELETE /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Board deleted successfully",
  "data": null
}
```

---

### 3.6 Get Board Columns
- **Route:** `GET /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Board columns fetched successfully",
  "data": [
    {
      "id": "col_1",
      "boardId": "b1a2b3c4-...",
      "title": "To Do",
      "order": 0,
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    },
    {
      "id": "col_2",
      "boardId": "b1a2b3c4-...",
      "title": "In Progress",
      "order": 1,
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    }
  ]
}
```

---

### 3.7 Create Column
- **Route:** `POST /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface CreateColumnRequest {
  title: string;  // 1 to 50 characters (Required)
  order?: number; // Optional 0-indexed integer (Defaults to last position + 1)
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Column created successfully",
  "data": {
    "id": "col_new_123",
    "boardId": "b1a2b3c4-...",
    "title": "QA & Testing",
    "order": 4,
    "createdAt": "2026-09-18T16:15:00.000Z",
    "updatedAt": "2026-09-18T16:15:00.000Z"
  }
}
```

---

### 3.8 Update Column Title
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface UpdateColumnRequest {
  title?: string; // 1 to 50 characters
}
```

#### Success Response (200 OK)
Returns the updated `BoardColumn` object.

---

### 3.9 Reorder Columns (Drag & Drop)
Updates the visual display order of columns on the board in a single transactional batch.

- **Route:** `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/reorder`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`

#### Request Body
```typescript
export interface ColumnOrderItem {
  id: string;    // Column UUID
  order: number; // New 0-indexed order
}

export interface ReorderColumnsRequest {
  columnOrders: ColumnOrderItem[];
}
```

#### Request Example
```json
{
  "columnOrders": [
    { "id": "col_1", "order": 0 },
    { "id": "col_3", "order": 1 },
    { "id": "col_2", "order": 2 }
  ]
}
```

#### Success Response (200 OK)
Returns all columns on the board sorted in their new ascending order:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Columns reordered successfully",
  "data": [
    { "id": "col_1", "title": "To Do", "order": 0 },
    { "id": "col_3", "title": "Review", "order": 1 },
    { "id": "col_2", "title": "In Progress", "order": 2 }
  ]
}
```

#### Errors
- `400 Bad Request`: `"Column ID ... does not belong to this board"`

---

### 3.10 Delete Column
- **Route:** `DELETE /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Column deleted successfully",
  "data": null
}
```

---

## 4. Frontend AI Agent Recipes

### 4.1 Zod Validation Schemas
```typescript
import { z } from 'zod';

export const createBoardSchema = z.object({
  title: z.string().min(2, 'Board title must be at least 2 characters').max(100),
  includeDefaultColumns: z.boolean().default(true),
});

export const updateBoardSchema = z.object({
  title: z.string().min(2).max(100),
});

export const createColumnSchema = z.object({
  title: z.string().min(1, 'Column title is required').max(50),
  order: z.number().int().min(0).optional(),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(50),
});

export const reorderColumnsSchema = z.object({
  columnOrders: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(0),
    })
  ).min(1),
});
```

---

### 4.2 TanStack Query Hooks Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, Board, BoardColumn, CreateBoardRequest, CreateColumnRequest, ReorderColumnsRequest } from '@/types/board';

// 1. Fetch All Boards in Project
export const useProjectBoards = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Board[]>>(
        `/workspaces/${workspaceId}/projects/${projectId}/boards`
      );
      return response.data.data;
    },
    enabled: !!workspaceId && !!projectId,
  });
};

// 2. Fetch Single Board (with columns)
export const useBoard = (workspaceId: string, projectId: string, boardId: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards', boardId],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Board>>(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}`
      );
      return response.data.data;
    },
    enabled: !!workspaceId && !!projectId && !!boardId,
  });
};

// 3. Create Board Mutation
export const useCreateBoard = (workspaceId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBoardRequest) => {
      const response = await apiClient.post<ApiResponse<Board>>(
        `/workspaces/${workspaceId}/projects/${projectId}/boards`,
        dto
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards'],
      });
    },
  });
};

// 4. Create Column Mutation
export const useCreateColumn = (workspaceId: string, projectId: string, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateColumnRequest) => {
      const response = await apiClient.post<ApiResponse<BoardColumn>>(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
        dto
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards', boardId],
      });
    },
  });
};

// 5. Reorder Columns Mutation (Optimistic Update)
export const useReorderColumns = (workspaceId: string, projectId: string, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ReorderColumnsRequest) => {
      const response = await apiClient.patch<ApiResponse<BoardColumn[]>>(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/reorder`,
        dto
      );
      return response.data.data;
    },
    onMutate: async (dto) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards', boardId],
      });

      const previousBoard = queryClient.getQueryData<Board>([
        'workspaces', workspaceId, 'projects', projectId, 'boards', boardId
      ]);

      if (previousBoard && previousBoard.columns) {
        const orderMap = new Map(dto.columnOrders.map((i) => [i.id, i.order]));
        const reordered = [...previousBoard.columns].sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? a.order;
          const orderB = orderMap.get(b.id) ?? b.order;
          return orderA - orderB;
        });

        queryClient.setQueryData(['workspaces', workspaceId, 'projects', projectId, 'boards', boardId], {
          ...previousBoard,
          columns: reordered,
        });
      }

      return { previousBoard };
    },
    onError: (err, dto, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(
          ['workspaces', workspaceId, 'projects', projectId, 'boards', boardId],
          context.previousBoard
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'projects', projectId, 'boards', boardId],
      });
    },
  });
};
```
