# 多租户数据库架构

## 架构设计

**隔离方案**：独立数据库（每用户一个 PostgreSQL 数据库）

```
main_db (主数据库)
├── users 表：用户认证 + 租户映射
└── create_tenant_database() 函数

tenant_<user_id> (租户数据库)
├── todos 表
├── attachments 表
└── sessions 表
```

## 租户命名规则

格式：`tenant_<user_id>`

示例：
- 用户 ID 1 → `tenant_1`
- 用户 ID 42 → `tenant_42`

## 初始化步骤

```bash
cd E:/project/sign_in/unified-signin-platform/database
chmod +x init.sh
./init.sh
```

或手动执行：

```bash
psql -U postgres -c "CREATE DATABASE main_db;"
psql -U postgres -d main_db -f schema.sql
psql -U postgres -d main_db -f create_tenant.sql
psql -U postgres -c "CREATE DATABASE tenant_template;"
psql -U postgres -d tenant_template -f tenant_template.sql
```

## 创建新租户

用户注册时自动创建租户数据库：

```sql
-- 1. 插入用户记录
INSERT INTO users (username, email, password_hash, tenant_db_name)
VALUES ('alice', 'alice@example.com', '$2b$...', 'tenant_1')
RETURNING id;

-- 2. 创建租户数据库（应用层调用）
SELECT create_tenant_database(1);
```

## 动态连接池（Node.js 示例）

```javascript
const { Pool } = require('pg');
const pools = new Map();

function getTenantPool(tenantDbName) {
  if (!pools.has(tenantDbName)) {
    pools.set(tenantDbName, new Pool({
      host: 'localhost',
      database: tenantDbName,
      user: 'app_user',
      password: process.env.DB_PASSWORD,
      max: 10
    }));
  }
  return pools.get(tenantDbName);
}
```

## 表结构说明

### 主数据库 (main_db)

**users 表**：
- `id`：用户 ID（主键）
- `username`：用户名（唯一）
- `email`：邮箱（唯一）
- `password_hash`：密码哈希
- `tenant_db_name`：租户数据库名（唯一）
- `created_at`：创建时间
- `updated_at`：更新时间

### 租户数据库 (tenant_*)

**todos 表**：待办事项
**attachments 表**：文件附件
**sessions 表**：会话管理
