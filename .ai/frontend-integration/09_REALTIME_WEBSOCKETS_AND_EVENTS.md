# Module 09: Real-Time WebSockets & Gateway Events

This document is the definitive integration guide for **Real-Time Collaboration, Distributed Presence, and Live Room Synchronization** via Socket.IO in the SyncSpace platform. It covers JWT socket authentication, workspace/board/task room subscriptions, active member presence indicators, live Kanban card movements, comment streams, and direct user notification pushes.

---

## 1. Gateway Connection & Architecture Overview

The backend exposes a dedicated Socket.IO gateway under the `/realtime` namespace.

- **Gateway URL:** `ws://localhost:5005/realtime` (or `http://localhost:5005/realtime` in polling fallback)
- **Transport Protocols:** `['websocket', 'polling']` (WebSocket prioritized)
- **CORS:** Enabled for all client origins (`*`)
- **Scaling:** Backed by Redis Pub/Sub adapter for horizontal multi-instance clusters (with automatic in-memory fallback).

```
                      +-----------------------------+
                      |   Client App (Next.js)      |
                      +--------------+--------------+
                                     |
               Auth Handshake: { auth: { token: "Bearer <JWT>" } }
                                     |
                                     v
                 +---------------------------------------+
                 |  SyncSpace WebSocket Gateway          |
                 |  Namespace: /realtime                 |
                 +---+---------------+---------------+---+
                     |               |               |
                     v               v               v
             +---------------+ +-----------+ +---------------+
             | Private Room  | | Room Sub  | | Presence Reg  |
             |  `user:<id>`  | | `board:*` | | Redis Cluster |
             | (Direct Push) | | `task:*`  | | (`user:online`|
             +---------------+ +-----------+ +---------------+
```

---

## 2. Authentication & Connection Handshake

The socket client must authenticate during the handshake. Tokens can be provided via **`auth`**, **`headers`**, or **`query`** (listed in order of priority).

### 2.1 Recommended Connection Pattern (Client Handshake)

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:5005/realtime', {
  transports: ['websocket', 'polling'],
  autoConnect: false,
  auth: {
    token: `Bearer ${accessToken}`, // or raw accessToken
  },
});
```

### 2.2 Connection Lifecycle Events

Upon successful authentication:
1. The socket is automatically assigned to a private user room: `user:<userId>`.
2. The user's online status is registered. If this is the user's **first active connection** across all browser tabs/devices, the server broadcasts `user:online` to all connected clients.
3. Upon disconnect, if no other sockets remain for that user, the server broadcasts `user:offline`.

---

## 3. Room Subscription Protocol

Clients subscribe to targeted rooms to receive filtered updates for active workspaces, Kanban boards, or opened task drawers.

### 3.1 Room Types

```typescript
export enum RoomType {
  WORKSPACE = 'workspace', // Room name: `workspace:<workspaceId>`
  BOARD = 'board',         // Room name: `board:<boardId>`
  TASK = 'task',           // Room name: `task:<taskId>`
}
```

### 3.2 Client-to-Server Message Events (Inbound)

| Event Name | Payload | Description | Server Response / Ack |
| :--- | :--- | :--- | :--- |
| `room:join` | `{ roomType: RoomType, targetId: string }` | Join room (checks workspace access) | `{ event: 'room:joined', data: { room, roomType, targetId } }` |
| `room:leave` | `{ roomType: RoomType, targetId: string }` | Leave room on unmount | `{ event: 'room:left', data: { room, roomType, targetId } }` |
| `presence:get_online` | `{ workspaceId: string }` | Query all currently online user IDs | `{ event: 'presence:online_users', data: { workspaceId, onlineUserIds: string[] } }` |

---

## 4. Server-to-Client Event Streams (Outbound)

### 4.1 Presence Events (Global / Workspace Scope)

#### `user:online`
Broadcast to all connected clients when a user comes online.
```json
{
  "userId": "d9b2d63d-a233-4123-8478-8270141f1a5a",
  "user": {
    "id": "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "name": "Jane Doe",
    "avatar": "https://res.cloudinary.com/.../avatar.png"
  }
}
```

#### `user:offline`
Broadcast to all connected clients when a user's last socket disconnects.
```json
{
  "userId": "d9b2d63d-a233-4123-8478-8270141f1a5a"
}
```

#### `presence:online_users`
Response event sent when client requests `presence:get_online`.
```json
{
  "workspaceId": "ws-uuid-1234",
  "onlineUserIds": [
    "d9b2d63d-a233-4123-8478-8270141f1a5a",
    "88888888-9999-aaaa-bbbb-cccccccccccc"
  ]
}
```

---

### 4.2 Kanban Board & Task Events (`board:<boardId>`, `workspace:<workspaceId>`)

#### `task:created`
Emitted when a new task is created in any column on the board.
```json
{
  "task": {
    "id": "task-uuid-1",
    "columnId": "col-uuid-1",
    "key": "SYNC-42",
    "title": "Build dark mode toggle",
    "priority": "HIGH",
    "status": "TODO",
    "order": 0,
    "assignee": null,
    "labels": []
  },
  "boardId": "board-uuid-1234",
  "workspaceId": "workspace-uuid-5678"
}
```

#### `task:moved`
Emitted when any user moves or reorders a task card across columns.
```json
{
  "taskId": "task-uuid-1",
  "sourceColumnId": "col-uuid-1",
  "destinationColumnId": "col-uuid-2",
  "newOrder": 2,
  "boardId": "board-uuid-1234",
  "workspaceId": "workspace-uuid-5678"
}
```

#### `task:updated`
Emitted when task fields (title, priority, assignee, due date) are modified.
```json
{
  "task": {
    "id": "task-uuid-1",
    "title": "Build dark mode toggle (revised)",
    "priority": "URGENT",
    "status": "IN_PROGRESS"
  },
  "boardId": "board-uuid-1234",
  "taskId": "task-uuid-1",
  "workspaceId": "workspace-uuid-5678"
}
```

#### `task:deleted`
Emitted when a task is soft-deleted.
```json
{
  "taskId": "task-uuid-1",
  "boardId": "board-uuid-1234",
  "workspaceId": "workspace-uuid-5678"
}
```

---

### 4.3 Task Comments & Reactions Events (`task:<taskId>`)

#### `comment:created`
Emitted when a new comment is posted to the open task.
```json
{
  "comment": {
    "id": "comment-uuid-101",
    "taskId": "task-uuid-1",
    "content": "Updated the figma mockups!",
    "user": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "avatar": null
    },
    "reactions": [],
    "createdAt": "2026-09-19T06:00:00.000Z"
  },
  "taskId": "task-uuid-1"
}
```

#### `comment:updated`
Emitted when a comment is edited.
```json
{
  "comment": {
    "id": "comment-uuid-101",
    "content": "Updated the figma mockups with dark mode variants!",
    "isEdited": true,
    "editedAt": "2026-09-19T06:10:00.000Z"
  },
  "taskId": "task-uuid-1"
}
```

#### `comment:deleted`
Emitted when a comment is deleted.
```json
{
  "commentId": "comment-uuid-101",
  "taskId": "task-uuid-1"
}
```

#### `comment:reaction`
Emitted when any user reacts or removes an emoji from a comment.
```json
{
  "commentId": "comment-uuid-101",
  "taskId": "task-uuid-1",
  "action": "added",
  "emoji": "🚀",
  "actorId": "user-uuid-2",
  "actorName": "Siam Admin",
  "reactions": [
    {
      "emoji": "🚀",
      "count": 1,
      "hasReacted": false,
      "users": [{ "id": "user-uuid-2", "name": "Siam Admin", "avatar": null }]
    }
  ]
}
```

---

### 4.4 Direct User Push Notifications (`user:<userId>`)

#### `notification:created`
Emitted exclusively to the affected user's private socket room when they are mentioned, assigned a task, or invited.
```json
{
  "notification": {
    "id": "notif-uuid-1",
    "userId": "user-uuid-1",
    "actorId": "user-uuid-2",
    "type": "TASK_ASSIGNED",
    "title": "New Task Assignment",
    "message": "Siam Admin assigned you to task SYNC-42",
    "link": "/workspaces/my-ws/projects/sync/tasks/SYNC-42",
    "isRead": false,
    "createdAt": "2026-09-19T06:15:00.000Z",
    "actor": {
      "id": "user-uuid-2",
      "name": "Siam Admin",
      "avatar": null
    }
  },
  "userId": "user-uuid-1"
}
```

---

## 5. Frontend Integration Recipes (Socket Provider & Custom Hooks)

### 5.1 Global Socket Context Provider

```typescript
// src/providers/socket-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/stores/auth.store';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5005/realtime';

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${accessToken}`,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

---

### 5.2 Real-Time Workspace Presence Hook (`useWorkspacePresence`)

```typescript
// src/features/realtime/hooks/use-workspace-presence.ts
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

export function useWorkspacePresence(workspaceId: string) {
  const { socket, isConnected } = useSocket();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected || !workspaceId) return;

    // 1. Join workspace room
    socket.emit('room:join', {
      roomType: 'workspace',
      targetId: workspaceId,
    });

    // 2. Fetch initial online list
    socket.emit('presence:get_online', { workspaceId });

    // 3. Listen for online users response
    socket.on('presence:online_users', (data: { workspaceId: string; onlineUserIds: string[] }) => {
      if (data.workspaceId === workspaceId) {
        setOnlineUserIds(new Set(data.onlineUserIds));
      }
    });

    // 4. Listen for live user online events
    socket.on('user:online', (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set([...prev, data.userId]));
    });

    // 5. Listen for live user offline events
    socket.on('user:offline', (data: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Cleanup on unmount / workspace change
    return () => {
      socket.emit('room:leave', {
        roomType: 'workspace',
        targetId: workspaceId,
      });
      socket.off('presence:online_users');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket, isConnected, workspaceId]);

  return {
    onlineUserIds,
    isUserOnline: (userId: string) => onlineUserIds.has(userId),
  };
}
```

---

### 5.3 Live Kanban Board Sync Hook (`useBoardRealtime`)

```typescript
// src/features/board/hooks/use-board-realtime.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/providers/socket-provider';

export function useBoardRealtime(boardId: string) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    socket.emit('room:join', {
      roomType: 'board',
      targetId: boardId,
    });

    const handleBoardUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    socket.on('task:created', handleBoardUpdate);
    socket.on('task:moved', handleBoardUpdate);
    socket.on('task:updated', handleBoardUpdate);
    socket.on('task:deleted', handleBoardUpdate);

    return () => {
      socket.emit('room:leave', {
        roomType: 'board',
        targetId: boardId,
      });
      socket.off('task:created', handleBoardUpdate);
      socket.off('task:moved', handleBoardUpdate);
      socket.off('task:updated', handleBoardUpdate);
      socket.off('task:deleted', handleBoardUpdate);
    };
  }, [socket, isConnected, boardId, queryClient]);
}
```

---

### 5.4 Live Task Detail & Comments Sync Hook (`useTaskRealtime`)

```typescript
// src/features/tasks/hooks/use-task-realtime.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/providers/socket-provider';

export function useTaskRealtime(taskId: string) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected || !taskId) return;

    socket.emit('room:join', {
      roomType: 'task',
      targetId: taskId,
    });

    const handleTaskChange = () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    };

    const handleCommentsChange = () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    };

    socket.on('task:updated', handleTaskChange);
    socket.on('comment:created', handleCommentsChange);
    socket.on('comment:updated', handleCommentsChange);
    socket.on('comment:deleted', handleCommentsChange);
    socket.on('comment:reaction', handleCommentsChange);

    return () => {
      socket.emit('room:leave', {
        roomType: 'task',
        targetId: taskId,
      });
      socket.off('task:updated', handleTaskChange);
      socket.off('comment:created', handleCommentsChange);
      socket.off('comment:updated', handleCommentsChange);
      socket.off('comment:deleted', handleCommentsChange);
      socket.off('comment:reaction', handleCommentsChange);
    };
  }, [socket, isConnected, taskId, queryClient]);
}
```

---

## 6. Summary Checklist for Frontend Developer

- [ ] Wrap application with `SocketProvider` in root layout (`src/app/layout.tsx`).
- [ ] Connect `useWorkspacePresence` to workspace layout and display green active status dots on member avatars.
- [ ] Connect `useBoardRealtime` to Kanban board page (`/workspaces/:slug/projects/:id/boards/:boardId`) to reflect task creation and column moves without manual page refresh.
- [ ] Connect `useTaskRealtime` to `TaskDetailSheet` / `TaskModal` to synchronize comments and live reactions.
- [ ] Listen to `notification:created` on global header bell icon to display real-time badge count + toast alerts.
- [ ] Verify proper unmounting cleanup (`room:leave`) so memory leaks and redundant event triggers are eliminated.
