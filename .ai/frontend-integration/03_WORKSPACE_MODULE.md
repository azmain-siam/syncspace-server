# Module 3: Workspaces & Members (`/workspaces`, `/workspace-invitations`)

> **Integration Target:** Workspace Switcher, Workspace Creation, Member Roster, RBAC Role Management, Tokenized Invitations, and Workspace Lifecycle (Leave/Delete)  
> **Backend Base URL:** `http://localhost:5000/api/v1`  
> **Auth Type:** Bearer JWT (`Authorization: Bearer <accessToken>`)  

---

## 1. Endpoints Overview

### 1.1 Workspace Core & Lifecycle
| Method | Endpoint | Required Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces` | Authenticated | List all workspaces caller belongs to |
| `POST` | `/workspaces` | Authenticated | Create workspace (Auto-seeds starter project, board & tasks) |
| `PATCH` | `/workspaces/:workspaceId/settings` | `OWNER` | Update workspace name, logo, description, visibility |
| `DELETE` | `/workspaces/:workspaceId` | `OWNER` | Soft-delete workspace |
| `POST` | `/workspaces/:workspaceId/leave` | `ADMIN`, `MEMBER`, `GUEST` | Leave workspace voluntarily (Owners cannot leave) |

### 1.2 Member & Role Management
| Method | Endpoint | Required Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces/:workspaceId/members` | Any Member | List members in workspace with roles & profiles |
| `POST` | `/workspaces/:workspaceId/members` | `OWNER`, `ADMIN` | Direct member addition by email (immediate join) |
| `PATCH` | `/workspaces/:workspaceId/members/:memberId/role` | `OWNER`, `ADMIN` | Update member role (`ADMIN`, `MEMBER`, `GUEST`) |
| `DELETE` | `/workspaces/:workspaceId/members/:userId` | `OWNER`, `ADMIN` | Remove member from workspace (Cannot remove Owner) |
| `PATCH` | `/workspaces/:workspaceId/transfer-ownership` | `OWNER` | Transfer ownership to another member |

### 1.3 Tokenized Email Invitations
| Method | Endpoint | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/workspaces/:workspaceId/invitations` | `OWNER`, `ADMIN` | Send tokenized email invitation (7-day link) |
| `GET` | `/workspace-invitations/validate?token=...` | **No (Public)** | Inspect invitation details on landing page |
| `POST` | `/workspace-invitations/accept` | Authenticated | Accept invitation and join workspace |
| `POST` | `/workspace-invitations/decline` | Authenticated | Decline workspace invitation |
| `DELETE` | `/workspaces/:workspaceId/invitations/:id` | `OWNER`, `ADMIN` | Revoke/cancel pending invitation |

---

## 2. Core TypeScript Interfaces & Enums

### Enums
```typescript
export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum WorkspaceVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}
```

### Workspace Model
```typescript
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  visibility: WorkspaceVisibility;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### Workspace Member Model
```typescript
export interface WorkspaceMemberUser {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: WorkspaceMemberUser;
}
```

### Workspace Invitation Details (Public Token Validation)
```typescript
export interface WorkspaceInvitationDetails {
  workspaceName: string;
  workspaceLogo: string | null;
  invitedEmail: string;
  role: WorkspaceRole;
  inviterName: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
}
```

---

## 3. Endpoint Specifications

### 3.1 Get My Workspaces
Fetches all non-deleted workspaces where the current user is a member (either as Owner, Admin, Member, or Guest).

- **Route:** `GET /api/v1/workspaces`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspaces fetched successfully",
  "data": [
    {
      "id": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
      "name": "Engineering Team",
      "slug": "engineering-team-x9a2",
      "description": "Core software engineering workspace",
      "logo": "https://res.cloudinary.com/.../logo.png",
      "ownerId": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
      "visibility": "PUBLIC",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z",
      "deletedAt": null
    }
  ]
}
```

---

### 3.2 Create Workspace
Creates a new workspace.  
✨ **Built-in Onboarding Seed:** The backend automatically generates:
1. Workspace with unique slug (e.g., `acme-corp-nanoid`)
2. Current user assigned as `OWNER`
3. Default `"General"` Project (`GEN`)
4. `"Main Board"` with 3 Kanban columns: `"To Do"`, `"In Progress"`, `"Done"`
5. Two starter tutorial tasks: `GEN-1` and `GEN-2`

- **Route:** `POST /api/v1/workspaces`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

#### Request Body
```typescript
export interface CreateWorkspaceRequest {
  name: string; // 2 to 50 characters
  logo?: string; // Optional URL string
}
```

#### Request Example
```json
{
  "name": "SyncSpace HQ",
  "logo": "https://example.com/logo.png"
}
```

#### Success Response (201 Created)
Returns the created `Workspace` object:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Workspace created successfully",
  "data": {
    "id": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
    "name": "SyncSpace HQ",
    "slug": "syncspace-hq-e7k1",
    "description": null,
    "logo": "https://example.com/logo.png",
    "ownerId": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
    "visibility": "PUBLIC",
    "createdAt": "2026-09-18T10:15:00.000Z",
    "updatedAt": "2026-09-18T10:15:00.000Z",
    "deletedAt": null
  }
}
```

---

### 3.3 Get Workspace Members
Returns all members of a workspace along with their user profile info.

- **Route:** `GET /api/v1/workspaces/:workspaceId/members`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** Caller must be a member of the workspace (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Members fetched successfully",
  "data": [
    {
      "id": "mem_12345",
      "workspaceId": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
      "userId": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
      "role": "OWNER",
      "joinedAt": "2026-09-18T10:15:00.000Z",
      "user": {
        "id": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
        "username": "alexj",
        "name": "Alex Johnson",
        "email": "alex@example.com",
        "avatar": "https://res.cloudinary.com/.../avatar.png"
      }
    },
    {
      "id": "mem_67890",
      "workspaceId": "f29a1b02-5e48-47e2-8926-d62194f1c93a",
      "userId": "d2e3f4a5-6789-01bc-def2-3456789abcde",
      "role": "MEMBER",
      "joinedAt": "2026-09-18T11:00:00.000Z",
      "user": {
        "id": "d2e3f4a5-6789-01bc-def2-3456789abcde",
        "username": "sarah_m",
        "name": "Sarah Miller",
        "email": "sarah@example.com",
        "avatar": null
      }
    }
  ]
}
```

#### Errors
- `403 Forbidden`: `"You are not a member of this workspace"` or `"Workspace access denied"`

---

### 3.4 Update Workspace Settings
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/settings`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER` only.

#### Request Body
```typescript
export interface UpdateWorkspaceSettingsRequest {
  name?: string;
  description?: string;
  logo?: string;
  visibility?: WorkspaceVisibility; // "PUBLIC" | "PRIVATE"
}
```

#### Success Response (200 OK)
Returns the updated `Workspace` object.

#### Errors
- `403 Forbidden`: `"Insufficient permissions"` (non-owner).

---

### 3.5 Soft-Delete Workspace
- **Route:** `DELETE /api/v1/workspaces/:workspaceId`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER` only.

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace deleted successfully",
  "data": null
}
```

#### Errors
- `403 Forbidden`: `"Only the workspace owner can delete this workspace"` or `"Insufficient permissions"`

---

### 3.6 Leave Workspace Voluntarily
Allows any non-owner member or guest to cleanly exit the workspace.

- **Route:** `POST /api/v1/workspaces/:workspaceId/leave`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `ADMIN`, `MEMBER`, `GUEST` (Owners are blocked).

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Left workspace successfully",
  "data": null
}
```

#### Errors
- `400 Bad Request`: `"Workspace owner cannot leave the workspace. Transfer ownership first."`
- `404 Not Found`: `"You are not a member of this workspace"`

---

### 3.7 Update Member Role
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/members/:memberId/role`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN` (Note: `memberId` is the target user's `userId`).

#### Request Body
```typescript
export interface UpdateMemberRoleRequest {
  role: WorkspaceRole; // "ADMIN" | "MEMBER" | "GUEST"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Member role updated successfully",
  "data": null
}
```

#### Errors
- `400 Bad Request`: `"Ownership transfer required"` (cannot change role of workspace Owner).
- `404 Not Found`: `"Member not found"`

---

### 3.8 Remove Member
- **Route:** `DELETE /api/v1/workspaces/:workspaceId/members/:userId`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`.

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Member removed successfully",
  "data": null
}
```

#### Errors
- `400 Bad Request`: `"Owner cannot be removed"`
- `404 Not Found`: `"Member not found"`

---

### 3.9 Transfer Ownership
- **Route:** `PATCH /api/v1/workspaces/:workspaceId/transfer-ownership`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER` only.

#### Request Body
```typescript
export interface TransferOwnershipRequest {
  memberId: string; // The userId of the member to make the new Owner
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Ownership transferred successfully",
  "data": null
}
```

---

### 3.10 Send Workspace Invitation Email
Dispatches a branded email via BullMQ with a unique 7-day token.

- **Route:** `POST /api/v1/workspaces/:workspaceId/invitations`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Permissions:** `OWNER`, `ADMIN`.

#### Request Body
```typescript
export interface CreateInvitationRequest {
  email: string;
  role: WorkspaceRole; // "ADMIN" | "MEMBER" | "GUEST"
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Invitation sent successfully",
  "data": {
    "message": "Invitation sent successfully.",
    "invitationId": "inv_12345abc"
  }
}
```

#### Errors
- `400 Bad Request`: `"User is already a member of this workspace"`
- `400 Bad Request`: `"An active invitation for this email already exists"`

---

### 3.11 Validate Invitation Token (Public Landing Page)
When a recipient clicks the invitation email link (`/invitations/accept?token=...`), the frontend calls this endpoint to display the workspace name, inviter, and invited role before joining.

- **Route:** `GET /api/v1/workspace-invitations/validate?token=<rawToken>`
- **Headers:** None (Public)

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation validated successfully",
  "data": {
    "workspaceName": "Engineering Team",
    "workspaceLogo": "https://res.cloudinary.com/.../logo.png",
    "invitedEmail": "developer@example.com",
    "role": "MEMBER",
    "inviterName": "Alex Johnson",
    "expiresAt": "2026-09-25T10:00:00.000Z",
    "status": "PENDING"
  }
}
```

#### Errors
- `400 Bad Request`: `"Invalid or inactive workspace invitation"`
- `400 Bad Request`: `"Workspace invitation has expired"`

---

### 3.12 Accept Workspace Invitation
Accepts the invitation. The user must be authenticated, and their logged-in email must match `invitedEmail`.

- **Route:** `POST /api/v1/workspace-invitations/accept`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

#### Request Body
```typescript
export interface AcceptInvitationRequest {
  token: string;
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Workspace joined successfully",
  "data": {
    "message": "Workspace joined successfully."
  }
}
```

#### Errors
- `403 Forbidden`: `"Invitation email does not match your logged in email address"`
- `400 Bad Request`: `"Invalid or inactive workspace invitation"`

---

### 3.13 Decline Workspace Invitation
- **Route:** `POST /api/v1/workspace-invitations/decline`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

#### Request Body
```typescript
export interface DeclineInvitationRequest {
  token: string;
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation declined successfully",
  "data": {
    "message": "Invitation declined successfully."
  }
}
```

---

### 3.14 Cancel/Revoke Invitation
- **Route:** `DELETE /api/v1/workspaces/:workspaceId/invitations/:id`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Permissions:** `OWNER`, `ADMIN`.

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation cancelled successfully",
  "data": {
    "message": "Invitation cancelled successfully."
  }
}
```

---

## 4. Frontend AI Agent Architecture Recipes

### 4.1 Recommended Active Workspace State (Zustand)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace } from '@/types/workspace';

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: 'syncspace_active_workspace' }
  )
);
```

---

### 4.2 TanStack Query Hooks Pattern
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, Workspace, WorkspaceMember, CreateWorkspaceRequest } from '@/types/workspace';

// 1. Fetch All User Workspaces
export const useWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Workspace[]>>('/workspaces');
      return response.data.data;
    },
  });
};

// 2. Fetch Workspace Members
export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<WorkspaceMember[]>>(
        `/workspaces/${workspaceId}/members`
      );
      return response.data.data;
    },
    enabled: !!workspaceId,
  });
};

// 3. Create Workspace Mutation
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateWorkspaceRequest) => {
      const response = await apiClient.post<ApiResponse<Workspace>>('/workspaces', dto);
      return response.data.data;
    },
    onSuccess: (newWorkspace) => {
      // Invalidate workspace list
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

// 4. Leave Workspace Mutation
export const useLeaveWorkspace = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`/workspaces/${workspaceId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};
```

---

### 4.3 Zod Form Schemas
```typescript
import { z } from 'zod';
import { WorkspaceRole, WorkspaceVisibility } from '@/types/workspace';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(50),
  logo: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const updateWorkspaceSettingsSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  visibility: z.nativeEnum(WorkspaceVisibility).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(WorkspaceRole),
});
```
