-- Enable commonly used PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database user for application (optional)
-- CREATE USER appuser WITH PASSWORD 'apppassword';
-- GRANT ALL PRIVILEGES ON DATABASE fullstackdb TO appuser;