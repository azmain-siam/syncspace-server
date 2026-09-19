# Module 07: Comments & Emoji Reactions

This document is the definitive integration guide for **Task Comments, Real-time Mentions, and Emoji Reactions** in the SyncSpace platform. It covers thread loading via cursor pagination, rich `@username` member mentions, inline editing, soft-deletion, and togglable emoji reactions with aggregated counts and user lists.

---

## 1. Module Overview & Route Architecture

All comment routes are nested under the task resource path `/api/v1/tasks/:taskId/comments`.

| Method | Endpoint | Description | Roles Allowed | Emitted Realtime Event |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tasks/:taskId/comments` | Add comment with `@username` mentions | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | `comment.created`, `comment.mention` |
| `GET` | `/api/v1/tasks/:taskId/comments` | Get comments (cursor pagination) | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `GET` | `/api/v1/tasks/:taskId/comments/:commentId` | Get single comment details | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |
| `PATCH` | `/api/v1/tasks/:taskId/comments/:commentId` | Update comment content | Comment Author only | `comment.updated` |
| `DELETE`| `/api/v1/tasks/:taskId/comments/:commentId` | Soft-delete comment | Comment Author or Workspace `OWNER`/`ADMIN` | `comment.deleted` |
| `POST` | `/api/v1/tasks/:taskId/comments/:commentId/reactions` | Toggle emoji reaction | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | `comment.reaction_updated` |
| `GET` | `/api/v1/tasks/:taskId/comments/:commentId/reactions` | Get aggregated reactions for comment | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | — |

---

## 2. Enums & Core TypeScript Types

```typescript
export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface AggregatedReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: UserMinimal[];
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserMinimal;
  reactions: AggregatedReaction[];
}

export interface CommentCursorMeta {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface PaginatedCommentsResponse {
  comments: Comment[];
  meta: CommentCursorMeta;
}

export interface ToggleReactionResponse {
  action: 'added' | 'removed';
  emoji: string;
  reactions: AggregatedReaction[];
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 Create Comment (Supports @mentions)
Adds a comment to the task. Automatically parses `@username` tokens against workspace members and dispatches notification events to mentioned users.

- **Endpoint:** `POST /api/v1/tasks/:taskId/comments`
- **Request Body:**
```json
{
  "content": "Hey @siam and @jane, please review the revised mockups for the navbar."
}
```
*(Validation: `content` is required, length between 1 and 3000 characters)*.

- **Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Comment created successfully",
  "data": {
    "id": "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
    "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "userId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "content": "Hey @siam and @jane, please review the revised mockups for the navbar.",
    "isEdited": false,
    "editedAt": null,
    "deletedAt": null,
    "createdAt": "2026-09-19T03:15:00.000Z",
    "updatedAt": "2026-09-19T03:15:00.000Z",
    "user": {
      "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://res.cloudinary.com/.../jane.png"
    }
  }
}
```

---

### 3.2 List Task Comments (Cursor Pagination)
Retrieves comments sorted chronologically descending (`createdAt: 'desc'`). Includes aggregated reactions formatted with current user reaction status (`hasReacted: boolean`).

- **Endpoint:** `GET /api/v1/tasks/:taskId/comments`
- **Query Parameters:**
  - `cursor` *(optional, string)*: The `id` of the last comment from previous batch.
  - `limit` *(optional, integer, default: 20, min: 1, max: 100)*: Number of comments to return.
- **Example Request:** `GET /api/v1/tasks/7b29a14e-f823-4211-92b4-7bb9cf88ef4a/comments?limit=20`

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task comments fetched successfully",
  "data": {
    "comments": [
      {
        "id": "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
        "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
        "userId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
        "content": "Hey @siam and @jane, please review the revised mockups for the navbar.",
        "isEdited": false,
        "editedAt": null,
        "deletedAt": null,
        "createdAt": "2026-09-19T03:15:00.000Z",
        "updatedAt": "2026-09-19T03:15:00.000Z",
        "user": {
          "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": "https://res.cloudinary.com/.../jane.png"
        },
        "reactions": [
          {
            "emoji": "👍",
            "count": 2,
            "hasReacted": true,
            "users": [
              {
                "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
                "name": "Jane Doe",
                "avatar": "https://res.cloudinary.com/.../jane.png"
              },
              {
                "id": "88888888-9999-aaaa-bbbb-cccccccccccc",
                "name": "Siam Admin",
                "avatar": null
              }
            ]
          },
          {
            "emoji": "🚀",
            "count": 1,
            "hasReacted": false,
            "users": [
              {
                "id": "88888888-9999-aaaa-bbbb-cccccccccccc",
                "name": "Siam Admin",
                "avatar": null
              }
            ]
          }
        ]
      }
    ],
    "meta": {
      "limit": 20,
      "hasNextPage": false,
      "nextCursor": null
    }
  }
}
```

---

### 3.3 Get Single Comment
- **Endpoint:** `GET /api/v1/tasks/:taskId/comments/:commentId`
- **Success Response (200 OK):** Returns single `Comment` object with aggregated `reactions` array.

---

### 3.4 Update Comment
Updates comment text. Automatically sets `isEdited: true` and `editedAt: new Date()`.
- **Endpoint:** `PATCH /api/v1/tasks/:taskId/comments/:commentId`
- **Permission:** **Comment Author only** (`403 Forbidden` if another user attempts edit).
- **Request Body:**
```json
{
  "content": "Updated: @siam review the latest PR branch instead of the mockups."
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Comment updated successfully",
  "data": {
    "id": "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
    "taskId": "7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
    "userId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "content": "Updated: @siam review the latest PR branch instead of the mockups.",
    "isEdited": true,
    "editedAt": "2026-09-19T03:30:00.000Z",
    "deletedAt": null,
    "createdAt": "2026-09-19T03:15:00.000Z",
    "updatedAt": "2026-09-19T03:30:00.000Z",
    "user": {
      "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://res.cloudinary.com/.../jane.png"
    }
  }
}
```

---

### 3.5 Delete Comment (Soft Delete)
Soft-deletes the comment (`deletedAt` timestamp set).
- **Endpoint:** `DELETE /api/v1/tasks/:taskId/comments/:commentId`
- **Permission:** Allowed for **Comment Author** OR workspace **`OWNER`** / **`ADMIN`**.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Comment deleted successfully",
  "data": null
}
```

---

### 3.6 Toggle Emoji Reaction
Toggles an emoji reaction. If the user already reacted with this emoji, it is removed; otherwise, it is added. Returns the resulting list of aggregated reactions for the comment.

- **Endpoint:** `POST /api/v1/tasks/:taskId/comments/:commentId/reactions`
- **Request Body:**
```json
{
  "emoji": "👍"
}
```
*(Common supported emojis: `👍`, `👎`, `❤️`, `🎉`, `🚀`, `👀`, `😄`, `🔥`, or any Unicode emoji character up to 10 chars)*.

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Comment reaction updated successfully",
  "data": {
    "action": "added",
    "emoji": "👍",
    "reactions": [
      {
        "emoji": "👍",
        "count": 1,
        "hasReacted": true,
        "users": [
          {
            "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
            "name": "Jane Doe",
            "avatar": null
          }
        ]
      }
    ]
  }
}
```

---

## 4. Frontend Integration Recipes (Zod + React Query)

### 4.1 Zod Validation Schemas

```typescript
// src/features/comments/schemas/comment.schema.ts
import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(3000, 'Comment cannot exceed 3000 characters'),
});

export const updateCommentSchema = createCommentSchema;

export const toggleReactionSchema = z.object({
  emoji: z
    .string()
    .min(1, 'Emoji is required')
    .max(10, 'Invalid emoji format'),
});
```

---

### 4.2 Infinite Cursor Pagination Hook (`useInfiniteComments`)

```typescript
// src/features/comments/hooks/use-comments.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Comment, PaginatedCommentsResponse, ToggleReactionResponse } from '../types';

// 1. Infinite comments query
export function useTaskComments(taskId: string, limit = 20) {
  return useInfiniteQuery<PaginatedCommentsResponse>({
    queryKey: ['task-comments', taskId],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.get(`/tasks/${taskId}/comments`, {
        params: {
          limit,
          cursor: pageParam ?? undefined,
        },
      });
      return res.data.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      return lastPage.meta.hasNextPage ? lastPage.meta.nextCursor : undefined;
    },
    enabled: Boolean(taskId),
  });
}

// 2. Create Comment Mutation
export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post(`/tasks/${taskId}/comments`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      // Refresh comments and task details (to update comment count)
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// 3. Update Comment Mutation
export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await apiClient.patch(`/tasks/${taskId}/comments/${commentId}`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });
}

// 4. Delete Comment Mutation
export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// 5. Toggle Emoji Reaction with Optimistic Update
export function useToggleReaction(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const res = await apiClient.post<ToggleReactionResponse>(
        `/tasks/${taskId}/comments/${commentId}/reactions`,
        { emoji }
      );
      return res.data.data;
    },
    onSuccess: (data, { commentId }) => {
      // Invalidate or directly update cache
      queryClient.setQueryData(['task-comments', taskId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: PaginatedCommentsResponse) => ({
            ...page,
            comments: page.comments.map((comment: Comment) =>
              comment.id === commentId ? { ...comment, reactions: data.reactions } : comment
            ),
          })),
        };
      });
    },
  });
}
```

---

## 5. UI/UX Interaction Best Practices

### 5.1 @Mention Autocomplete Parsing
When users type `@` in the comment textarea:
1. Extract query string after the active `@` cursor position.
2. Filter workspace members fetched from `GET /api/v1/workspaces/:workspaceId/members`.
3. Display a floating dropdown with avatar, name, and `@username`.
4. On select, replace the query text with `@username ` and return focus to textarea.

### 5.2 Emoji Reaction Pill Buttons
- Render each reaction as a clickable pill button: `[👍 2]`, `[🚀 1]`.
- Highlight pill border/background if `hasReacted === true` (e.g. `bg-primary/10 border-primary text-primary`).
- Hovering over a pill displays a tooltip with user names: `"Jane Doe and Siam Admin reacted with 👍"`.
- Clicking toggles the reaction.
- Add an `+` icon button at the end of the reactions row to open the quick emoji picker popover (common quick selections: `👍`, `❤️`, `🎉`, `🚀`, `👀`, `😄`).

### 5.3 Edit and Delete State
- Display `(edited)` timestamp next to author date if `comment.isEdited === true`.
- Display inline edit textarea with "Save" and "Cancel" buttons when editing.
- Display "Delete" confirmation dialog before calling `DELETE`.

---

## 6. Real-Time Socket.IO Synchronization

```typescript
// Subscribing to comment events in TaskModal / CommentsThread component
useEffect(() => {
  if (!socket || !taskId) return;

  const handleCreated = ({ comment, taskId: eventTaskId }: any) => {
    if (eventTaskId === taskId) {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    }
  };

  const handleUpdated = ({ comment, taskId: eventTaskId }: any) => {
    if (eventTaskId === taskId) {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    }
  };

  const handleDeleted = ({ commentId, taskId: eventTaskId }: any) => {
    if (eventTaskId === taskId) {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    }
  };

  const handleReactionUpdated = ({ commentId, reactions }: any) => {
    queryClient.setQueryData(['task-comments', taskId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          comments: page.comments.map((c: any) =>
            c.id === commentId ? { ...c, reactions } : c
          ),
        })),
      };
    });
  };

  socket.on('comment.created', handleCreated);
  socket.on('comment.updated', handleUpdated);
  socket.on('comment.deleted', handleDeleted);
  socket.on('comment.reaction_updated', handleReactionUpdated);

  return () => {
    socket.off('comment.created', handleCreated);
    socket.off('comment.updated', handleUpdated);
    socket.off('comment.deleted', handleDeleted);
    socket.off('comment.reaction_updated', handleReactionUpdated);
  };
}, [socket, taskId]);
```

---

## 7. Summary Checklist for Frontend Developer

- [ ] Create `CommentList` component with infinite scroll triggered when scrolling near bottom.
- [ ] Connect comment submission textarea to `POST /api/v1/tasks/:taskId/comments`.
- [ ] Support `@username` mention dropdown menu in comment input.
- [ ] Render author avatar, display name, relative time (e.g. "5 minutes ago"), and `(edited)` indicator.
- [ ] Implement reaction pills row with `hasReacted` highlight, tooltip member list, and `+` picker.
- [ ] Connect reaction toggle to `POST /api/v1/tasks/:taskId/comments/:commentId/reactions`.
- [ ] Support edit mode for comment author (`PATCH /api/v1/tasks/:taskId/comments/:commentId`).
- [ ] Support delete action with permission check (author or workspace admin).
- [ ] Wire up real-time Socket.IO listeners (`comment.created`, `comment.updated`, `comment.deleted`, `comment.reaction_updated`).
