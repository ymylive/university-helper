**Language:** English | [简体中文](./DEPLOY_GUIDE.zh-CN.md)

# Deployment Guide

This guide covers the recommended server-side deployment path for the current repository: `docker-compose.server.yml`.

## Requirements

- Docker 24+
- Docker Compose v2
- A reachable Linux server
- Persistent storage for PostgreSQL volumes

## 1. Upload the Repository

Upload the repository to your server, for example:

```bash
rsync -avz ./ user@your-server:/opt/easy_learning/
```

You can also use the deployment helpers included in this repository:

- [`deploy.sh`](./deploy.sh)
- [`deploy.ps1`](./deploy.ps1)
- [`deploy_auto.py`](./deploy_auto.py)
- [`deploy_pure.py`](./deploy_pure.py)

These scripts no longer contain embedded credentials. They read target server and secret values from environment variables.

## 2. Create `.env`

Copy from [`.env.example`](./.env.example):

```bash
cp .env.example .env
```

At minimum, review and update:

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `CORS_ORIGINS`
- `SHUAKE_COMPAT_SECRET` if needed

## 3. Start the Services

```bash
docker compose -f docker-compose.server.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml logs -f
```

## 4. Update an Existing Deployment

```bash
git pull
docker compose -f docker-compose.server.yml up -d --build
```

## 5. Recommendations

- Put HTTPS and reverse proxy handling behind an outer Nginx or Caddy layer
- Rotate database passwords and JWT secrets before first public use
- Never commit `.env`, server addresses, or any real secrets back into the repository

## Related Docs

- [`DEPLOY_MANUAL.md`](./DEPLOY_MANUAL.md)
- [`README.md`](./README.md)
