# Module 04: Projects, Views, Links & Executive Status Updates

> **Prefix**: `/api/v1`  
> **Target Audience**: Frontend Engineers / Frontend AI Agents  
> **Auth Required**: Bearer JWT (`Authorization: Bearer <accessToken>`)  
> **Response Wrapper**: All successful JSON responses follow the standardized envelope `{ success: true, statusCode: number, message: string, data: T }`.

---

## 🏗️ 1. TypeScript Types & Enums

```typescript
export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',   // Visible to all workspace members
  PRIVATE = 'PRIVATE', // Visible ONLY to explicit ProjectMembers and Workspace Owner/Admins
}

export enum ProjectPriority {
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

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED',
}

export enum ProjectMemberRole {
  MANAGER = 'MANAGER',
  LEAD = 'LEAD',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  type?: string | null; // e.g. 'FIGMA', 'NOTION', 'GITHUB', 'PRD', 'DOCS'
  createdById: string;
  createdBy: UserMinimal;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatusUpdate {
  id: string;
  projectId: string;
  authorId: string;
  author: UserMinimal;
  health: ProjectHealth;
  message: string; // Markdown summary
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  workspaceId: string;
  slug: string;
  key: string;
  title: string;
  description: string | null;
  brief: string | null;
  icon: string | null;
  color: string;
  visibility: ProjectVisibility;
  priority: ProjectPriority;
  health: ProjectHealth;
  status: ProjectStatus;
  leadId: string | null;
  lead: UserMinimal | null;
  createdById: string;
  createdBy: UserMinimal;
  startDate: string | null;
  dueDate: string | null;
  repoUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projectMembers: number;
    boards: number;
    sprints: number;
    links: number;
  };
}

export interface ProjectDetail extends ProjectSummary {
  projectMembers: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: ProjectMemberRole;
    user: UserMinimal;
  }>;
  links: ProjectLink[];
  statusUpdates: ProjectStatusUpdate[];
  boards: Array<{
    id: string;
    title: string;
    _count: { columns: number };
  }>;
  sprints: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}
```

---

## 📡 2. API Endpoints

### 2.1 Create Project
- **Method**: `POST`
- **URL**: `/api/v1/projects/:workspaceId`
- **Permission**: Workspace `OWNER`, `ADMIN`, or `MEMBER`
- **Behavior**: Auto-generates `key` (if omitted) and `slug` (if omitted). Defaults `leadId` to current user. Auto-adds creator as `MANAGER` and lead as `LEAD`. Auto-creates default Kanban Board ("To Do", "In Progress", "Done").

#### Request Body
```json
{
  "title": "Auth & SSO Service",
  "key": "AUTH",
  "slug": "auth-and-sso-service",
  "description": "Central identity and OAuth2 gateway",
  "brief": "# Scope & Objectives\nDeliver robust SSO with Okta & Google Workspace.",
  "icon": "shield-check",
  "color": "#3B82F6",
  "visibility": "PUBLIC",
  "priority": "HIGH",
  "health": "ON_TRACK",
  "leadId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startDate": "2026-10-01T00:00:00.000Z",
  "dueDate": "2026-12-15T00:00:00.000Z",
  "repoUrl": "https://github.com/syncspace/auth-service",
  "metadata": { "department": "Platform", "budget": 15000 }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Project created successfully",
  "data": {
    "id": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
    "workspaceId": "e304b77f-5d1b-4179-b1d1-6784d0b1a0e1",
    "title": "Auth & SSO Service",
    "key": "AUTH",
    "slug": "auth-and-sso-service",
    "description": "Central identity and OAuth2 gateway",
    "brief": "# Scope & Objectives\nDeliver robust SSO with Okta & Google Workspace.",
    "icon": "shield-check",
    "color": "#3B82F6",
    "visibility": "PUBLIC",
    "priority": "HIGH",
    "health": "ON_TRACK",
    "status": "ACTIVE",
    "leadId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "createdById": "user-uuid-1",
    "startDate": "2026-10-01T00:00:00.000Z",
    "dueDate": "2026-12-15T00:00:00.000Z",
    "repoUrl": "https://github.com/syncspace/auth-service",
    "metadata": { "department": "Platform", "budget": 15000 },
    "createdAt": "2026-09-25T12:00:00.000Z",
    "updatedAt": "2026-09-25T12:00:00.000Z",
    "createdBy": {
      "id": "user-uuid-1",
      "name": "Sarah Connor",
      "email": "sarah@syncspace.io",
      "avatarUrl": null
    },
    "lead": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Alex Techlead",
      "email": "alex@syncspace.io",
      "avatarUrl": "https://avatar.url"
    }
  }
}
```

---

### 2.2 List Workspace Projects
- **Method**: `GET`
- **URL**: `/api/v1/projects/:workspaceId`
- **Behavior**: Returns all non-archived projects. If caller is regular `MEMBER`, filters out `PRIVATE` projects unless caller is a member of that project.

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Projects retrieved successfully",
  "data": [
    {
      "id": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
      "workspaceId": "e304b77f-5d1b-4179-b1d1-6784d0b1a0e1",
      "title": "Auth & SSO Service",
      "key": "AUTH",
      "slug": "auth-and-sso-service",
      "icon": "shield-check",
      "color": "#3B82F6",
      "visibility": "PUBLIC",
      "priority": "HIGH",
      "health": "ON_TRACK",
      "status": "ACTIVE",
      "lead": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Alex Techlead",
        "email": "alex@syncspace.io",
        "avatarUrl": null
      },
      "createdBy": {
        "id": "user-uuid-1",
        "name": "Sarah Connor",
        "email": "sarah@syncspace.io",
        "avatarUrl": null
      },
      "_count": {
        "projectMembers": 5,
        "boards": 1,
        "sprints": 2,
        "links": 3
      }
    }
  ]
}
```

---

### 2.3 Get Project by ID or Slug
- **Method**: `GET`
- **URL**: `/api/v1/projects/:workspaceId/:projectIdOrSlug` (Accepts UUID or slug)
- **Permissions**: Enforces `PRIVATE` access guard (returns 403 if user lacks access).

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project retrieved successfully",
  "data": {
    "id": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
    "workspaceId": "e304b77f-5d1b-4179-b1d1-6784d0b1a0e1",
    "title": "Auth & SSO Service",
    "key": "AUTH",
    "slug": "auth-and-sso-service",
    "description": "Central identity and OAuth2 gateway",
    "brief": "# Scope & Objectives\nDeliver robust SSO with Okta & Google Workspace.",
    "icon": "shield-check",
    "color": "#3B82F6",
    "visibility": "PUBLIC",
    "priority": "HIGH",
    "health": "ON_TRACK",
    "status": "ACTIVE",
    "lead": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Alex Techlead",
      "email": "alex@syncspace.io",
      "avatarUrl": null
    },
    "projectMembers": [
      {
        "id": "pm-uuid-1",
        "projectId": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
        "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "role": "LEAD",
        "user": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "name": "Alex Techlead",
          "email": "alex@syncspace.io",
          "avatarUrl": null
        }
      }
    ],
    "links": [
      {
        "id": "link-1",
        "projectId": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
        "title": "Figma Wireframes",
        "url": "https://figma.com/file/xyz",
        "type": "FIGMA",
        "createdBy": { "id": "user-uuid-1", "name": "Sarah Connor", "email": "sarah@syncspace.io", "avatarUrl": null },
        "createdAt": "2026-09-25T12:00:00.000Z"
      }
    ],
    "statusUpdates": [
      {
        "id": "update-1",
        "projectId": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
        "health": "ON_TRACK",
        "message": "Completed SAML spike, starting backend implementation.",
        "createdAt": "2026-09-25T10:00:00.000Z",
        "author": { "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "name": "Alex Techlead", "email": "alex@syncspace.io", "avatarUrl": null }
      }
    ],
    "boards": [{ "id": "board-1", "title": "Main Board", "_count": { "columns": 3 } }],
    "sprints": [{ "id": "sprint-1", "name": "Sprint 14", "status": "ACTIVE", "startDate": "...", "endDate": "..." }]
  }
}
```

---

### 2.4 Update Project
- **Method**: `PATCH`
- **URL**: `/api/v1/projects/:workspaceId/:projectIdOrSlug`
- **Request Body**: Partial `CreateProjectDto` + `status` (`ACTIVE`, `ARCHIVED`, `COMPLETED`).
- **Response**: Updated `ProjectDetail`.

---

### 2.5 Project Links (Resources & Bookmarks)

#### Add Link
- **Method**: `POST`
- **URL**: `/api/v1/projects/:workspaceId/:projectId/links`
- **Request Body**:
```json
{
  "title": "API Documentation",
  "url": "https://docs.syncspace.io/api",
  "type": "DOCS"
}
```

#### List Links
- **Method**: `GET`
- **URL**: `/api/v1/projects/:workspaceId/:projectId/links`

#### Delete Link
- **Method**: `DELETE`
- **URL**: `/api/v1/projects/:workspaceId/:projectId/links/:linkId`

---

### 2.6 Executive Status Updates (Progress Reports & Health Sync)

#### Post Status Update
- **Method**: `POST`
- **URL**: `/api/v1/projects/:workspaceId/:projectId/status-updates`
- **Behavior**: Creates status log entry and atomically synchronizes the parent project's `health` column.
- **Request Body**:
```json
{
  "health": "AT_RISK",
  "message": "Blocked on third-party OAuth app verification with Apple. Contacting dev support."
}
```

#### List Status Updates History
- **Method**: `GET`
- **URL**: `/api/v1/projects/:workspaceId/:projectId/status-updates`

---

### 2.7 Project Tasks (Table & List View)
- **Method**: `GET`
- **URL**: `/api/v1/projects/:projectIdOrSlug/tasks`
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
  - `status`: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `assigneeId`: string (User UUID)
  - `labelId`: string (Label UUID)
  - `search`: string (matches title, description, or task key)
  - `sortBy`: `order` | `dueDate` | `priority` | `status` | `createdAt` | `title`
  - `sortOrder`: `asc` | `desc`

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Project tasks retrieved successfully",
  "data": {
    "project": {
      "id": "7b8e1f02-6922-4161-9c3f-912a76fbd14b",
      "title": "Auth & SSO Service",
      "key": "AUTH",
      "slug": "auth-and-sso-service",
      "workspaceId": "e304b77f-5d1b-4179-b1d1-6784d0b1a0e1"
    },
    "tasks": [
      {
        "id": "task-uuid-1",
        "key": "AUTH-10",
        "title": "Integrate GitHub OAuth Provider",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "dueDate": "2026-10-15T18:00:00.000Z",
        "assignee": {
          "id": "user-uuid-2",
          "name": "Alex Techlead",
          "email": "alex@syncspace.io",
          "avatarUrl": null
        },
        "labels": [{ "id": "lbl-1", "name": "OAuth", "color": "#10B981" }],
        "checklistProgress": {
          "total": 3,
          "completed": 2,
          "percentage": 67
        },
        "_count": {
          "comments": 4,
          "attachments": 1,
          "checklists": 3
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

## 💡 3. Frontend Integration Guidelines

1. **React Query Key Patterns**:
   - `['workspaces', workspaceId, 'projects']`
   - `['projects', projectIdOrSlug]`
   - `['projects', projectId, 'links']`
   - `['projects', projectId, 'status-updates']`
   - `['projects', projectIdOrSlug, 'tasks', filters]`
2. **Invalidations**:
   - Creating/deleting a project link -> invalidate `['projects', projectId, 'links']` and `['projects', projectIdOrSlug]`.
   - Creating a status update -> invalidate `['projects', projectId, 'status-updates']`, `['projects', projectIdOrSlug]`, and `['workspaces', workspaceId, 'dashboard', 'projects']`.
3. **Private Project Handling**:
   - When a 403 Forbidden is returned from `GET /projects/:workspaceId/:projectIdOrSlug`, display a standard "Private Project: Request Access" empty state.
