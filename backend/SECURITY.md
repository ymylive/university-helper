# Security Guidelines

## Token Storage

### Backend
- JWT tokens are signed with HS256 algorithm using SECRET_KEY from environment variables
- Tokens expire after 30 minutes (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- Never log or expose tokens in error messages

### Client-Side Storage
- Store tokens in httpOnly cookies (recommended) or sessionStorage
- Never use localStorage for sensitive tokens
- Clear tokens on logout

### Environment Variables
Required security settings in `.env`:
```
SECRET_KEY=<strong-random-key>
ENFORCE_HTTPS=true
```

## Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and digit
- Hashed with bcrypt before storage

## Rate Limiting
- 5 requests per 60 seconds per IP on auth endpoints
- Returns 429 status when exceeded

## HTTPS Enforcement
- Production must use HTTPS
- HTTP requests redirect to HTTPS when ENFORCE_HTTPS=true
