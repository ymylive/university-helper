# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "username"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "token": "jwt_token"
}
```

#### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "token": "jwt_token",
  "refresh_token": "refresh_token"
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response:**
```json
{
  "token": "new_jwt_token"
}
```

#### POST /auth/logout
Logout current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### OAuth

#### GET /auth/google
Initiate Google OAuth flow.

**Response:** Redirects to Google OAuth consent page.

#### GET /auth/google/callback
Google OAuth callback endpoint.

**Query Parameters:**
- `code`: Authorization code from Google

**Response:** Redirects to frontend with token.

#### GET /auth/github
Initiate GitHub OAuth flow.

#### GET /auth/github/callback
GitHub OAuth callback endpoint.

#### GET /auth/wechat
Initiate WeChat OAuth flow.

#### GET /auth/wechat/callback
WeChat OAuth callback endpoint.

### User Management

#### GET /users/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "created_at": "2024-01-01T00:00:00Z",
  "oauth_providers": ["google", "github"]
}
```

#### PUT /users/me
Update current user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

#### DELETE /users/me
Delete current user account.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

### Session Management

#### GET /sessions
List all active sessions for current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "uuid",
      "device": "Chrome on Windows",
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-01T00:00:00Z",
      "last_active": "2024-01-01T01:00:00Z"
    }
  ]
}
```

#### DELETE /sessions/:session_id
Revoke a specific session.

**Headers:** `Authorization: Bearer <token>`

## Error Responses

All errors follow this format:
```json
{
  "error": "error_code",
  "message": "Human readable error message",
  "details": {}
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per minute
- General endpoints: 100 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```
