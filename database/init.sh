#!/bin/bash
# 数据库初始化脚本

set -e

DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

echo "初始化主数据库..."
psql -U "$DB_USER" -h "$DB_HOST" -c "CREATE DATABASE main_db;"
psql -U "$DB_USER" -h "$DB_HOST" -d main_db -f schema.sql
psql -U "$DB_USER" -h "$DB_HOST" -d main_db -f create_tenant.sql

echo "创建租户模板数据库..."
psql -U "$DB_USER" -h "$DB_HOST" -c "CREATE DATABASE tenant_template;"
psql -U "$DB_USER" -h "$DB_HOST" -d tenant_template -f tenant_template.sql

echo "数据库初始化完成！"
echo "租户命名规则：tenant_<user_id>"
echo "创建新租户：SELECT create_tenant_database(<user_id>);"
