# 部署指南

这份文档针对当前仓库推荐的后端部署方式：`docker-compose.server.yml`。

## 需要准备

- Docker 24+
- Docker Compose v2
- 可访问的 Linux 服务器
- PostgreSQL 数据卷存储空间

## 1. 上传代码

把整个仓库上传到服务器，例如：

```bash
rsync -avz ./ user@your-server:/opt/easy_learning/
```

或直接使用仓库里的部署脚本：

- [`deploy.sh`](/E:/project/sign_in/easy_learning/deploy.sh)
- [`deploy.ps1`](/E:/project/sign_in/easy_learning/deploy.ps1)
- [`deploy_auto.py`](/E:/project/sign_in/easy_learning/deploy_auto.py)
- [`deploy_pure.py`](/E:/project/sign_in/easy_learning/deploy_pure.py)

这些脚本不再包含任何硬编码凭据，统一从环境变量读取目标服务器与密码。

## 2. 创建 `.env`

从 [` .env.example`](/E:/project/sign_in/easy_learning/.env.example) 复制：

```bash
cp .env.example .env
```

至少修改以下变量：

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `CORS_ORIGINS`
- `SHUAKE_COMPAT_SECRET`（如不需要可留空）

## 3. 启动服务

```bash
docker compose -f docker-compose.server.yml up -d --build
```

查看状态：

```bash
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml logs -f
```

## 4. 更新服务

```bash
git pull
docker compose -f docker-compose.server.yml up -d --build
```

## 5. 建议

- 反向代理与 HTTPS 建议交给外层 Nginx 或 Caddy
- 首次部署后立即更换数据库密码和 JWT 密钥
- 不要把 `.env`、服务器地址或任何口令提交回仓库
