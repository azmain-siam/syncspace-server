# Module 2: User Profile & Account Settings (`/user`)

> **Integration Target:** Current User Session, Profile Settings, Avatar Upload, and Password Management  
> **Backend Base URL:** `http://localhost:5000/api/v1`  
> **Auth Type:** Bearer JWT (`Authorization: Bearer <accessToken>`)  

---

## 1. Endpoints Overview

All endpoints in this module require an active session (`Authorization: Bearer <accessToken>`).

| Method | Endpoint | Content-Type | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/me` | N/A | Fetch current logged-in user profile (Session bootstrap) |
| `PATCH` | `/user/me` | `application/json` | Update user display name, bio, timezone, and phone |
| `POST` | `/user/avatar` | `multipart/form-data` | Upload and replace profile avatar (Max 5MB image) |
| `PATCH` | `/user/change-password` | `application/json` | Change account password (Revokes other refresh sessions) |

---

## 2. Core TypeScript Interfaces

### User Profile Model
This is the standard safe user profile returned by `GET /user/me`, `PATCH /user/me`, and `POST /user/avatar`:

```typescript
export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  bio: string | null;
  timezone: string; // IANA format, defaults to "UTC"
  createdAt: string; // ISO 8601 string
}
```

### Standard API Response Envelope
```typescript
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}
```

---

## 3. Endpoint Specifications

### 3.1 Get Current User Profile
Use this endpoint on app mount / page load to populate global user state (e.g. Zustand, Redux, or TanStack Query `['user', 'me']`).

- **Route:** `GET /api/v1/user/me`
- **Headers:**  
  `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
    "username": "alexj",
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "avatar": "https://res.cloudinary.com/syncspace/image/upload/v12345/syncspace/users/avatars/avatar.png",
    "phone": "+14155552671",
    "bio": "Senior Fullstack Engineer & Tech Lead",
    "timezone": "America/New_York",
    "createdAt": "2026-09-18T10:00:00.000Z"
  }
}
```

#### Errors
- `401 Unauthorized`: Token expired or missing (triggers refresh token flow).
- `404 Not Found`: `"User not found"` (user account was deleted).

---

### 3.2 Update User Profile
Allows editing non-sensitive profile attributes. All fields are optional.

- **Route:** `PATCH /api/v1/user/me`
- **Headers:**  
  `Authorization: Bearer <accessToken>`  
  `Content-Type: application/json`

#### Request Body
```typescript
export interface UpdateUserRequest {
  name?: string;     // 2 to 100 characters
  bio?: string;      // Max 500 characters
  phone?: string;    // International E.164 format (e.g. "+14155552671")
  timezone?: string; // Valid IANA timezone identifier (e.g. "America/New_York", "UTC", "Asia/Dhaka")
}
```

#### Request Example
```json
{
  "name": "Alex Mercer",
  "bio": "Staff Architect at SyncSpace",
  "phone": "+14155552671",
  "timezone": "America/Los_Angeles"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile updated successfully",
  "data": {
    "id": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
    "username": "alexj",
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "avatar": "https://res.cloudinary.com/.../avatar.png",
    "phone": "+14155552671",
    "bio": "Staff Architect at SyncSpace",
    "timezone": "America/Los_Angeles",
    "createdAt": "2026-09-18T10:00:00.000Z"
  }
}
```

#### Errors
- `400 Bad Request`: Validation failure (e.g., `["phone must be a valid phone number", "name must be longer than or equal to 2 characters"]`).
- `400 Bad Request`: `"Phone number is already in use"` (phone number collision with another user).

---

### 3.3 Upload User Avatar
Uploads a new profile picture to Cloudinary storage and updates the user's `avatar` URL.

- **Route:** `POST /api/v1/user/avatar`
- **Headers:**  
  `Authorization: Bearer <accessToken>`  
  `Content-Type: multipart/form-data`
- **Form Field Name:** `avatar`
- **File Constraints:**
  - **Max File Size:** 5MB (`5 * 1024 * 1024` bytes)
  - **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`

#### FormData Example
```typescript
const formData = new FormData();
formData.append('avatar', selectedFile); // selectedFile is a File or Blob

await apiClient.post('/user/avatar', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

#### Success Response (200 OK)
Returns the complete updated `UserProfile` with the new `avatar` URL:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Avatar uploaded successfully",
  "data": {
    "id": "c1f7a2d8-4b2e-4b6a-9f5b-1c2d3e4f5a6b",
    "username": "alexj",
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "avatar": "https://res.cloudinary.com/syncspace/image/upload/v1726650000/syncspace/users/avatars/98765.jpg",
    "phone": "+14155552671",
    "bio": "Staff Architect at SyncSpace",
    "timezone": "America/Los_Angeles",
    "createdAt": "2026-09-18T10:00:00.000Z"
  }
}
```

#### Errors
- `400 Bad Request`: `"Avatar image file is required"` (no file attached to form field `avatar`).
- `400 Bad Request`: `"Unsupported avatar format: image/svg+xml. Allowed types: JPEG, PNG, WEBP, GIF."`
- `400 Bad Request`: File size exceeds 5MB limit.

---

### 3.4 Change Account Password
Changes the user's password.  
⚠️ **Security Note for Frontend:** When password change succeeds, the backend **invalidates all refresh tokens** (`hashedRefreshToken: null`). The frontend must immediately clear local tokens and redirect the user to `/login`.

- **Route:** `PATCH /api/v1/user/change-password`
- **Headers:**  
  `Authorization: Bearer <accessToken>`  
  `Content-Type: application/json`

#### Request Body
```typescript
export interface ChangePasswordRequest {
  currentPassword: string; // Required
  newPassword: string;     // Minimum 8 characters
  confirmPassword: string; // Must match newPassword
}
```

#### Request Example
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully. Please log in again."
  }
}
```

#### Errors
- `400 Bad Request`: `"New password and confirm password do not match"`
- `400 Bad Request`: `"New password must be different from current password"`
- `400 Bad Request`: `"Account was created using social sign-in. Use password reset flow to set a direct password."` (Google OAuth users who do not have a password set yet).
- `401 Unauthorized`: `"Current password is incorrect"`

---

## 4. Frontend AI Agent Directives & Recipes

### 4.1 Zod Validation Schemas
```typescript
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Enter a valid phone number in E.164 format (e.g. +14155552671)')
    .optional()
    .or(z.literal('')),
  timezone: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });
```

---

### 4.2 Recommended TanStack Query Hooks Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, UserProfile, UpdateUserRequest, ChangePasswordRequest } from '@/types/user';

// 1. Fetch Current User Profile (Session Bootstrap)
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<UserProfile>>('/user/me');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// 2. Update Profile Mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateUserRequest) => {
      const response = await apiClient.patch<ApiResponse<UserProfile>>('/user/me', dto);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      // Optimistically update cache
      queryClient.setQueryData(['user', 'me'], updatedUser);
    },
  });
};

// 3. Upload Avatar Mutation
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post<ApiResponse<UserProfile>>('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user', 'me'], updatedUser);
    },
  });
};

// 4. Change Password Mutation
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (dto: ChangePasswordRequest) => {
      const response = await apiClient.patch<ApiResponse<{ message: string }>>(
        '/user/change-password',
        dto
      );
      return response.data.data;
    },
    onSuccess: () => {
      // Clear auth tokens & redirect to login page
      localStorage.removeItem('syncspace_access_token');
      localStorage.removeItem('syncspace_refresh_token');
      window.location.href = '/auth/login?reason=password_changed';
    },
  });
};
```
