# Module 1: Authentication & Identity (`/auth`)

> **Integration Target:** Frontend Auth Flow (Sign Up, Sign In, Google OAuth, Email Verification, Password Reset, Token Refresh, Logout)  
> **Backend Base URL:** `http://localhost:5000/api/v1`  
> **Auth Type:** Dual-token JWT (Access Token 15m + Refresh Token 7d)  

---

## 1. Endpoints Overview

| Method | Endpoint | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | No (Public) | Register new user account & dispatch verification email |
| `POST` | `/auth/login` | No (Public) | Authenticate user; returns `user` and `tokens` |
| `POST` | `/auth/refresh` | **Yes (Bearer refreshToken)** | Issue fresh `accessToken` & `refreshToken` pair |
| `POST` | `/auth/logout` | **Yes (Bearer accessToken)** | Invalidate refresh token session in database |
| `GET` | `/auth/verify-email` | No (Public) | Verify email address using token from email link |
| `POST` | `/auth/resend-verification` | No (Public) | Resend email verification token (accepts `{ email }`, anti-enumeration safe) |
| `POST` | `/auth/forgot-password` | No (Public) | Request password reset email (anti-enumeration safe) |
| `POST` | `/auth/reset-password` | No (Public) | Set new password using reset token |
| `GET` | `/auth/google` | No (Public) | Redirects browser to Google OAuth 2.0 login |
| `GET` | `/auth/google/callback` | No (Public) | Google redirects back; backend redirects to frontend callback |

---

## 2. Common Data Types

### Standard Success Response Envelope
All successful requests return HTTP status 200 or 201 wrapped in this structure:

```typescript
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}
```

### Standard Error Response Envelope
When validation fails or an exception occurs:

```typescript
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[]; // Array of strings on validation errors (HTTP 400)
  data: null;
  error: string;
}
```

### User Object Type
```typescript
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  timezone?: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Auth Tokens Type
```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

---

## 3. Endpoint Specifications

### 3.1 Register User
- **Route:** `POST /api/v1/auth/register`
- **Headers:** `Content-Type: application/json`

#### Request Body
```typescript
export interface RegisterRequest {
  username: string; // 3-30 chars, alphanumeric + '_' + '-'
  name: string;     // Full display name
  email: string;    // Valid email address
  password: string; // Minimum 6 characters
  phone?: string;   // Optional phone number
}
```

#### Request Example
```json
{
  "username": "alexj",
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "password": "SecretPassword123!",
  "phone": "+15551234567"
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "message": "Registration successful. Please verify your email.",
    "user": {
      "id": "7b8d4e9c-1234-4567-89ab-cdef01234567",
      "username": "alexj",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "phone": "+15551234567",
      "avatar": null,
      "bio": null,
      "timezone": "UTC",
      "isEmailVerified": false,
      "emailVerifiedAt": null,
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    }
  }
}
```

#### Errors
- `400 Bad Request`: Validation failure (e.g. `["password must be at least 6 characters", "email must be an email"]`)
- `400 Bad Request`: `"Email already exists"` or `"Username already taken"`

---

### 3.2 Login User
- **Route:** `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`

#### Request Body
```typescript
export interface LoginRequest {
  email: string;
  password: string;
}
```

#### Request Example
```json
{
  "email": "alex@example.com",
  "password": "SecretPassword123!"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "id": "7b8d4e9c-1234-4567-89ab-cdef01234567",
      "username": "alexj",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "phone": "+15551234567",
      "avatar": null,
      "bio": null,
      "timezone": "UTC",
      "isEmailVerified": true,
      "emailVerifiedAt": "2026-09-18T10:05:00.000Z",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

#### Errors
- `401 Unauthorized`: `"Invalid credentials"` (wrong email or password)
- `401 Unauthorized`: `"Please verify your email before signing in."`
- `401 Unauthorized`: `"Please sign in using your OAuth provider"` (account created via Google OAuth with no password)

---

### 3.3 Refresh Tokens
- **Route:** `POST /api/v1/auth/refresh`
- **Headers:**  
  `Authorization: Bearer <refreshToken>` ⚠️ **IMPORTANT: Pass the `refreshToken` in the Bearer header!**

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tokens refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOi...new_access_token",
    "refreshToken": "eyJhbGciOi...new_refresh_token"
  }
}
```

#### Errors
- `401 Unauthorized`: Invalid, expired, or revoked refresh token (clear storage & redirect to `/login`).

---

### 3.4 Logout User
- **Route:** `POST /api/v1/auth/logout`
- **Headers:**  
  `Authorization: Bearer <accessToken>`

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged out successfully",
  "data": null
}
```

---

### 3.5 Verify Email Address
- **Route:** `GET /api/v1/auth/verify-email?token=<rawToken>`
- **Query Parameter:** `token` (string, required)

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully",
  "data": {
    "message": "Email verified successfully."
  }
}
```

#### Errors
- `400 Bad Request`: `"Invalid or expired verification token"`
- `400 Bad Request`: `"Verification token has already been used"`
- `400 Bad Request`: `"Verification token has expired"`

---

### 3.6 Resend Verification Email
- **Route:** `POST /api/v1/auth/resend-verification`
- **Headers:** `Content-Type: application/json`
- **Auth Required:** No (Public — locked-out users can trigger resend without being logged in)

#### Request Body
```typescript
export interface ResendVerificationRequest {
  email: string; // Valid email address
}
```

#### Request Example
```json
{
  "email": "alex@example.com"
}
```

#### Success Response (200 OK)
*Note: Always returns a generic success message even if user does not exist or is already verified to prevent email enumeration.*
```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an unverified account exists with this email, a verification link has been sent.",
  "data": {
    "message": "If an unverified account exists with this email, a verification link has been sent."
  }
}
```

#### Errors
- `400 Bad Request`: Validation error (e.g. `["Invalid email address", "Email address is required"]`)

---

### 3.7 Forgot Password
- **Route:** `POST /api/v1/auth/forgot-password`
- **Headers:** `Content-Type: application/json`

#### Request Body
```typescript
export interface ForgotPasswordRequest {
  email: string;
}
```

#### Success Response (200 OK)
*Note: Always returns success even if user does not exist to prevent account enumeration.*
```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an account exists, a password reset link has been sent.",
  "data": {
    "message": "If an account exists, a password reset link has been sent."
  }
}
```

---

### 3.8 Reset Password
- **Route:** `POST /api/v1/auth/reset-password`
- **Headers:** `Content-Type: application/json`

#### Request Body
```typescript
export interface ResetPasswordRequest {
  token: string;           // Token extracted from query parameter in email link
  password: string;        // Minimum 6 characters
  confirmPassword: string; // Must match password exactly
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": {
    "message": "Password reset successfully."
  }
}
```

#### Errors
- `400 Bad Request`: `"Passwords do not match"`
- `400 Bad Request`: `"Invalid or expired password reset token"`
- `400 Bad Request`: `"Password reset token has already been used"`
- `400 Bad Request`: `"Password reset token has expired"`

---

### 3.9 Google OAuth 2.0 Flow
1. **Initiate Login**: Direct the user's browser to:
   ```text
   http://localhost:5000/api/v1/auth/google
   ```
2. **Backend Redirect**: After Google authentication, backend redirects browser to:
   ```text
   http://localhost:3000/auth/google/callback?accessToken=<token>&refreshToken=<token>
   ```
3. **Frontend Callback Route (`/auth/google/callback`)**:
   - Extract `accessToken` and `refreshToken` from the URL query params.
   - Store both in local storage.
   - Redirect to `/dashboard` or home page.

---

## 4. Frontend AI Agent Directives & Recipes

### 4.1 Local Storage Keys
Use these standard keys across the frontend application:
- `syncspace_access_token` (Access token string)
- `syncspace_refresh_token` (Refresh token string)

### 4.2 Zod Form Validation Schemas
If using React Hook Form + Zod on the frontend:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens, and underscores only'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

### 4.3 Axios Interceptor Contract for Token Refresh
When the access token expires (HTTP 401), the frontend must make a POST request with the refresh token in the `Authorization` header:

```typescript
const response = await axios.post(
  'http://localhost:5000/api/v1/auth/refresh',
  {},
  {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  }
);
const { accessToken, refreshToken: newRefreshToken } = response.data.data;
```
*(Store both new tokens and retry the failed request)*
