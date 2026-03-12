# Docker 部署文档

## 概述

统一签到平台 Docker 容器化部署指南。

## 系统架构

- **app**: FastAPI 后端 + React 前端
- **postgres**: PostgreSQL 15 数据库（多租户架构）
- **redis**: Redis 7 缓存与会话存储
- **nginx**: Nginx 反向代理

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

## 快速开始

### 1. 环境配置

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改关键配置：

```env
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_min_32_chars
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 访问应用

- 应用地址: http://localhost
- API 文档: http://localhost/api/docs

### 4. 停止服务

```bash
docker-compose down
```

## 服务详情

### 应用容器 (app)

- **镜像**: 多阶段构建（Python 3.11 + Node 18）
- **端口**: 8000（内部）
- **健康检查**: HTTP GET /health（30秒间隔）

### 数据库容器 (postgres)

- **镜像**: postgres:15-alpine
- **端口**: 5432（内部）
- **数据卷**: postgres-data
- **初始化**: 自动执行 database/ 目录下的 SQL 脚本

### 缓存容器 (redis)

- **镜像**: redis:7-alpine
- **端口**: 6379（内部）
- **数据卷**: redis-data
- **持久化**: AOF 模式

### 反向代理 (nginx)

- **镜像**: nginx:alpine
- **端口**: 80（外部）
- **功能**: API 代理、WebSocket 支持、静态文件服务

## 数据库管理

### 备份数据库

```bash
docker-compose exec postgres pg_dump -U signin unified_signin > backup.sql
```

### 恢复数据库

```bash
docker-compose exec -T postgres psql -U signin unified_signin < backup.sql
```

### 创建新租户

```bash
docker-compose exec postgres psql -U signin unified_signin -f /docker-entrypoint-initdb.d/create_tenant.sql
```

## 日志查看

```bash
# 所有服务日志
docker-compose logs -f

# 特定服务日志
docker-compose logs -f app
docker-compose logs -f postgres
```

## 生产环境建议

### 安全加固

1. 修改默认密码（POSTGRES_PASSWORD、JWT_SECRET）
2. 限制端口暴露（仅暴露 Nginx 端口）
3. 启用 HTTPS（配置 SSL 证书）
4. 定期备份数据库

### 性能优化

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### 日志轮转

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 故障排查

### 服务无法启动

```bash
docker-compose logs app
docker-compose ps
docker-compose build --no-cache
```

### 数据库连接失败

```bash
docker-compose exec postgres pg_isready -U signin
docker-compose logs postgres
```

### 端口冲突

修改 `.env` 中的端口配置。

## 更新应用

```bash
git pull
docker-compose up -d --build
```

## 技术栈

- **前端**: React + Vite
- **后端**: FastAPI + Python 3.11
- **数据库**: PostgreSQL 15（多租户架构）
- **缓存**: Redis 7
- **反向代理**: Nginx
- **容器编排**: Docker Compose
