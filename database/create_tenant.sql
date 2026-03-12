-- 自动创建租户数据库函数
-- 使用方式：SELECT create_tenant_database(user_id);

CREATE OR REPLACE FUNCTION create_tenant_database(user_id INT)
RETURNS TEXT AS $$
DECLARE
    db_name TEXT;
BEGIN
    db_name := 'tenant_' || user_id;
    EXECUTE format('CREATE DATABASE %I TEMPLATE tenant_template', db_name);
    RETURN db_name;
END;
$$ LANGUAGE plpgsql;
