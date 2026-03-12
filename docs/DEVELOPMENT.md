# Development Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Git

## Quick Start

1. Clone the repository
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your configuration
4. Run setup script:
   ```bash
   make setup
   ```
5. Start services:
   ```bash
   make dev
   ```

## Project Structure

```
unified-signin-platform/
├── backend/          # FastAPI backend
│   ├── auth/        # Authentication logic
│   └── middleware/  # Custom middleware
├── frontend/        # React frontend
├── database/        # Database schemas
├── nginx/           # Nginx configuration
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## Development Workflow

### Backend Development

1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Run backend locally:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

3. Run tests:
   ```bash
   pytest
   ```

### Frontend Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

### Database

Access PostgreSQL:
```bash
docker exec -it unified-signin-platform-postgres-1 psql -U signin -d unified_signin
```

Run migrations:
```bash
docker exec -it unified-signin-platform-backend-1 alembic upgrade head
```

### Redis

Access Redis CLI:
```bash
docker exec -it unified-signin-platform-redis-1 redis-cli
```

## OAuth Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost/api/auth/google/callback`
6. Update `.env` with client ID and secret

### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set callback URL: `http://localhost/api/auth/github/callback`
4. Update `.env` with client ID and secret

### WeChat OAuth

1. Register at [WeChat Open Platform](https://open.weixin.qq.com/)
2. Create web application
3. Get App ID and App Secret
4. Update `.env` with credentials

## Testing

### Backend Tests
```bash
cd backend
pytest --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
make test
```

## Code Style

### Backend (Python)
- Follow PEP 8
- Use type hints
- Maximum line length: 100 characters

### Frontend (JavaScript/React)
- Use ESLint configuration
- Follow React best practices
- Use functional components with hooks

## Debugging

### Backend Debugging
Set `DEBUG=true` in `.env` for detailed error messages.

### Frontend Debugging
Use React DevTools browser extension.

### Docker Logs
```bash
docker-compose logs -f [service_name]
```

## Common Issues

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Database Connection Failed
- Ensure PostgreSQL container is running
- Check database credentials in `.env`
- Verify network connectivity

### OAuth Redirect Issues
- Ensure redirect URIs match exactly in OAuth provider settings
- Check CORS configuration in backend

## Performance Optimization

### Backend
- Use Redis for session caching
- Implement database connection pooling
- Add request rate limiting

### Frontend
- Code splitting with React.lazy
- Image optimization
- Bundle size analysis with `npm run build -- --analyze`

## Security Best Practices

- Never commit `.env` files
- Rotate JWT secrets regularly
- Use HTTPS in production
- Implement CSRF protection
- Sanitize user inputs
- Keep dependencies updated

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
