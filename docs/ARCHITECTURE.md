# Architecture Design

## System Overview

The Unified Sign-In Platform is a microservices-based authentication system that provides multiple authentication methods including traditional email/password and OAuth providers (Google, GitHub, WeChat).

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Nginx    │ (Reverse Proxy)
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Frontend │   │ Backend  │   │  OAuth   │
│  React   │   │ FastAPI  │   │ Providers│
└──────────┘   └────┬─────┘   └──────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │PostgreSQL│        │  Redis   │
    └──────────┘        └──────────┘
```

## Components

### 1. Frontend (React + Vite)

**Responsibilities:**
- User interface rendering
- Form validation
- OAuth flow initiation
- Token management
- Session handling

**Technology Stack:**
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons
- Vite for build tooling

**Key Features:**
- Responsive design
- Client-side routing
- Protected routes
- Token refresh mechanism

### 2. Backend (FastAPI)

**Responsibilities:**
- API endpoint handling
- Authentication logic
- Token generation/validation
- OAuth integration
- Session management
- Database operations

**Technology Stack:**
- FastAPI framework
- Pydantic for data validation
- SQLAlchemy for ORM
- JWT for token management
- Passlib for password hashing

**Key Modules:**
- `auth/`: Authentication handlers
- `middleware/`: Custom middleware (CORS, auth, rate limiting)
- `models/`: Database models
- `schemas/`: Pydantic schemas
- `utils/`: Helper functions

### 3. Database (PostgreSQL)

**Schema Design:**

```sql
users
├── user_id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── username (VARCHAR)
├── password_hash (VARCHAR, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

oauth_accounts
├── oauth_id (UUID, PK)
├── user_id (UUID, FK -> users)
├── provider (VARCHAR) -- 'google', 'github', 'wechat'
├── provider_user_id (VARCHAR)
├── access_token (TEXT)
├── refresh_token (TEXT)
└── created_at (TIMESTAMP)

sessions
├── session_id (UUID, PK)
├── user_id (UUID, FK -> users)
├── token_hash (VARCHAR)
├── device_info (JSONB)
├── ip_address (INET)
├── created_at (TIMESTAMP)
├── expires_at (TIMESTAMP)
└── last_active (TIMESTAMP)
```

**Indexes:**
- `users.email` (UNIQUE)
- `oauth_accounts.provider_user_id` (UNIQUE per provider)
- `sessions.user_id`
- `sessions.expires_at`

### 4. Cache (Redis)

**Use Cases:**
- Session storage
- Rate limiting counters
- OAuth state tokens
- Refresh token blacklist

**Key Patterns:**
```
session:{session_id} -> user data (TTL: 1 hour)
rate_limit:{ip}:{endpoint} -> request count (TTL: 1 minute)
oauth_state:{state_token} -> user session (TTL: 10 minutes)
blacklist:{token_hash} -> revoked token (TTL: token expiry)
```

### 5. Reverse Proxy (Nginx)

**Responsibilities:**
- SSL/TLS termination
- Load balancing
- Static file serving
- Request routing
- Rate limiting

**Configuration:**
- Frontend: `/` -> React app
- Backend API: `/api` -> FastAPI
- WebSocket: `/ws` -> FastAPI WebSocket

## Authentication Flow

### Email/Password Registration

```
1. User submits email/password
2. Backend validates input
3. Password hashed with bcrypt
4. User record created in PostgreSQL
5. JWT token generated
6. Session stored in Redis
7. Token returned to client
```

### Email/Password Login

```
1. User submits credentials
2. Backend retrieves user by email
3. Password verified against hash
4. JWT token generated
5. Session created in Redis
6. Token returned to client
```

### OAuth Flow (Google Example)

```
1. User clicks "Sign in with Google"
2. Frontend redirects to /api/auth/google
3. Backend generates state token, stores in Redis
4. Backend redirects to Google OAuth consent
5. User authorizes on Google
6. Google redirects to /api/auth/google/callback
7. Backend exchanges code for access token
8. Backend fetches user info from Google
9. Backend creates/updates user record
10. Backend creates oauth_account record
11. JWT token generated
12. Backend redirects to frontend with token
```

### Token Refresh

```
1. Client detects token expiration
2. Client sends refresh token to /api/auth/refresh
3. Backend validates refresh token
4. New access token generated
5. New token returned to client
```

## Security Measures

### Authentication
- Passwords hashed with bcrypt (cost factor: 12)
- JWT tokens with HS256 algorithm
- Refresh tokens stored securely
- Session tokens rotated on refresh

### Authorization
- Role-based access control (RBAC)
- JWT claims validation
- Token expiration enforcement

### Data Protection
- HTTPS only in production
- Secure cookie flags (HttpOnly, Secure, SameSite)
- CORS configuration
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

### Rate Limiting
- Per-IP rate limiting
- Per-user rate limiting
- Exponential backoff on failed attempts

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (session in Redis)
- Load balancer ready
- Database connection pooling

### Caching Strategy
- Redis for hot data
- Database query optimization
- CDN for static assets

### Database Optimization
- Proper indexing
- Connection pooling
- Read replicas for scaling reads

## Monitoring & Logging

### Metrics
- Request rate
- Response time
- Error rate
- Active sessions
- Database connections

### Logging
- Structured JSON logs
- Log levels: DEBUG, INFO, WARNING, ERROR
- Request/response logging
- Error stack traces

### Health Checks
- `/health` endpoint
- Database connectivity check
- Redis connectivity check

## Deployment Architecture

### Development
- Docker Compose
- Local volumes
- Hot reload enabled

### Production
- Kubernetes/Docker Swarm
- Managed PostgreSQL (RDS)
- Managed Redis (ElastiCache)
- CDN for static assets
- SSL certificates (Let's Encrypt)
- Automated backups

## Disaster Recovery

### Backup Strategy
- Daily database backups
- Point-in-time recovery
- Backup retention: 30 days

### Failover
- Database replication
- Redis persistence (AOF)
- Multi-region deployment (optional)

## Future Enhancements

1. Multi-factor authentication (MFA)
2. Passwordless authentication (WebAuthn)
3. Social login expansion (Twitter, LinkedIn)
4. Single Sign-On (SSO) support
5. Audit logging
6. User activity analytics
7. Admin dashboard
8. API rate limiting per user tier
