# Module 10: In-App Notifications

This document is the definitive integration guide for **In-App Notifications, Real-Time Alert Stream, and Unread Count Management** in the SyncSpace platform. It covers notification fetching, unread filtering, batch and single read state updates, deletion, and live WebSocket push handling.

---

## 1. Module Overview & Route Architecture

All notification endpoints require an authenticated user (`JwtAuthGuard`) and operate strictly on the current user's data.

| Method | Endpoint | Description | Roles Allowed | Emitted Realtime Event |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Get user notifications with `unreadCount` | Authenticated User | — |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all user notifications as read | Authenticated User | — |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark single notification as read | Authenticated User | — |
| `DELETE`| `/api/v1/notifications/:id` | Delete notification | Authenticated User | — |

---

## 2. Enums & Core TypeScript Types

```typescript
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_MENTION = 'TASK_MENTION',
  TASK_DUE = 'TASK_DUE',
  WORKSPACE_INVITATION = 'WORKSPACE_INVITATION',
  PROJECT_INVITATION = 'PROJECT_INVITATION',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor: UserMinimal;
}

export interface NotificationPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  unreadCount: number;
}

export interface PaginatedNotificationsResponse {
  notifications: Notification[];
  meta: NotificationPaginationMeta;
}
```

---

## 3. Endpoints Detail & Payloads

### 3.1 Get User Notifications
Retrieves notifications for the current authenticated user sorted chronologically descending (`createdAt: 'desc'`). Includes `unreadCount` in the `meta` object.

- **Endpoint:** `GET /api/v1/notifications`
- **Query Parameters:**
  - `page` *(optional, default: 1)*: Page number.
  - `limit` *(optional, default: 20, max: 100)*: Items per page.
  - `unreadOnly` *(optional, boolean, default: false)*: Set to `true` to fetch only unread notifications.
- **Example Request:** `GET /api/v1/notifications?page=1&limit=20&unreadOnly=false`

- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "id": "notif-uuid-1",
        "userId": "user-uuid-1",
        "actorId": "user-uuid-2",
        "type": "TASK_ASSIGNED",
        "title": "Task Assigned",
        "message": "Siam Admin assigned you to task \"Implement OAuth Flow\"",
        "link": "/tasks/7b29a14e-f823-4211-92b4-7bb9cf88ef4a",
        "isRead": false,
        "createdAt": "2026-09-19T08:30:00.000Z",
        "actor": {
          "id": "user-uuid-2",
          "name": "Siam Admin",
          "email": "siam@example.com",
          "avatar": "https://res.cloudinary.com/.../siam.png"
        }
      },
      {
        "id": "notif-uuid-2",
        "userId": "user-uuid-1",
        "actorId": "user-uuid-3",
        "type": "TASK_MENTION",
        "title": "Mentioned in Comment",
        "message": "Jane Doe mentioned you in task \"Design Navigation Bar\"",
        "link": "/tasks/8c39b25f-0934-5322-a3c5-8cc0df99fa5b",
        "isRead": true,
        "createdAt": "2026-09-18T14:10:00.000Z",
        "actor": {
          "id": "user-uuid-3",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null
        }
      }
    ],
    "meta": {
      "total": 2,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false,
      "unreadCount": 1
    }
  }
}
```

---

### 3.2 Mark Single Notification as Read
Updates `isRead: true` for a single notification.

- **Endpoint:** `PATCH /api/v1/notifications/:id/read`
- **Request Body:** `{}` (empty object)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "id": "notif-uuid-1",
    "userId": "user-uuid-1",
    "isRead": true
  }
}
```

---

### 3.3 Mark All Notifications as Read
Batch marks all unread notifications for the current user as read (`isRead: true`).

- **Endpoint:** `PATCH /api/v1/notifications/read-all`
- **Request Body:** `{}` (empty object)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": {
    "message": "All notifications marked as read"
  }
}
```

---

### 3.4 Delete Notification
Permanently deletes a notification from the user's notification feed.

- **Endpoint:** `DELETE /api/v1/notifications/:id`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification deleted successfully",
  "data": null
}
```

---

## 4. Real-Time Socket.IO Notification Stream

The backend automatically emits a real-time event when a notification is generated (via `@OnEvent('notification.created')`):

- **Target Room:** `user:<userId>` (joined automatically upon socket connection handshake)
- **Socket Event Name:** `notification:created`
- **Event Payload:**
```json
{
  "notification": {
    "id": "notif-uuid-3",
    "userId": "user-uuid-1",
    "actorId": "user-uuid-2",
    "type": "TASK_ASSIGNED",
    "title": "Task Assigned",
    "message": "Siam Admin assigned you to task \"Audit Log Filter UI\"",
    "link": "/tasks/task-uuid-101",
    "isRead": false,
    "createdAt": "2026-09-19T09:00:00.000Z",
    "actor": {
      "id": "user-uuid-2",
      "name": "Siam Admin",
      "email": "siam@example.com",
      "avatar": null
    }
  },
  "userId": "user-uuid-1"
}
```

---

## 5. Frontend Integration Recipes (React Query + Socket.IO)

### 5.1 React Query Hooks (`useNotifications`)

```typescript
// src/features/notifications/hooks/use-notifications.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PaginatedNotificationsResponse } from '../types';

// 1. Fetch Notifications with Unread Count
export function useNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  return useQuery<PaginatedNotificationsResponse>({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await apiClient.get('/notifications', { params });
      return res.data.data;
    },
  });
}

// 2. Mark Single Notification as Read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/notifications/${id}/read`);
      return res.data.data;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Optimistically update read state in cache
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          meta: {
            ...old.meta,
            unreadCount: Math.max(0, (old.meta?.unreadCount || 1) - 1),
          },
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// 3. Mark All Notifications as Read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/notifications/read-all');
      return res.data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) => ({ ...n, isRead: true })),
          meta: {
            ...old.meta,
            unreadCount: 0,
          },
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// 4. Delete Notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

---

### 5.2 Real-Time Listener Hook (`useNotificationListener`)

```typescript
// src/features/notifications/hooks/use-notification-listener.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/providers/socket-provider';
import { Notification } from '../types';

export function useNotificationListener() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = ({ notification }: { notification: Notification }) => {
      // 1. Invalidate notifications query to refresh unread counter badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // 2. Display rich toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: 'View',
              onClick: () => router.push(notification.link!),
            }
          : undefined,
      });
    };

    socket.on('notification:created', handleNewNotification);

    return () => {
      socket.off('notification:created', handleNewNotification);
    };
  }, [socket, isConnected, queryClient, router]);
}
```

---

## 6. UI/UX Interaction Best Practices

### 6.1 Notification Header Bell Popover
- **Badge:** Show red counter badge on bell icon if `meta.unreadCount > 0` (e.g. `<Badge>{unreadCount}</Badge>`).
- **Tabs:** Provide quick filter tabs: `"All"` vs `"Unread"`.
- **"Mark All as Read":** Button in the popover header calling `PATCH /notifications/read-all`.
- **Click Navigation:** Clicking a notification marks it as read (`PATCH /notifications/:id/read`) and navigates to `notification.link`.

### 6.2 Notification Type Styling & Icons

| Notification Type | Icon | Color Theme |
| :--- | :--- | :--- |
| `TASK_ASSIGNED` | `UserCheck` / `CheckSquare` | Blue (`text-blue-500 bg-blue-500/10`) |
| `TASK_MENTION` | `AtSign` | Purple (`text-purple-500 bg-purple-500/10`) |
| `TASK_DUE` | `Clock` / `CalendarAlert` | Amber (`text-amber-500 bg-amber-500/10`) |
| `WORKSPACE_INVITATION` | `Building` / `Mail` | Emerald (`text-emerald-500 bg-emerald-500/10`) |
| `PROJECT_INVITATION` | `FolderPlus` | Indigo (`text-indigo-500 bg-indigo-500/10`) |

---

## 7. Summary Checklist for Frontend Developer

- [ ] Connect `HeaderNotificationBell` to `useNotifications()` to render live unread badge count.
- [ ] Connect `useNotificationListener()` at the root layout (`src/app/layout.tsx`) to display real-time Sonner toast alerts.
- [ ] Implement Notification Popover / Center with "All" and "Unread" tabs.
- [ ] Implement "Mark all as read" button in dropdown header.
- [ ] Implement individual notification item click to mark as read and route to task or workspace.
- [ ] Support swipe-to-delete or delete icon action calling `DELETE /notifications/:id`.
