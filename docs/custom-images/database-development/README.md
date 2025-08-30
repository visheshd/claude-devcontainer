# Database Development Environment

A specialized environment for database development, administration, and data engineering tasks. Includes multiple database clients, migration tools, and utilities for working with various database systems.

## What's Included

### Database Systems
- **PostgreSQL**: Client tools and extensions
- **MySQL/MariaDB**: Client and administration tools
- **SQLite**: Embedded database support
- **Redis**: Key-value store client
- **MongoDB**: Document database client

### Interactive Clients
- **pgcli**: Modern PostgreSQL client with syntax highlighting
- **mycli**: MySQL client with auto-completion
- **litecli**: SQLite client with syntax highlighting
- **redis-cli**: Redis command-line interface
- **mongosh**: MongoDB shell

### Migration & Schema Tools
- **Alembic**: Python SQLAlchemy migrations
- **golang-migrate**: Database migrations in Go
- **Knex.js**: SQL query builder and migrations
- **Prisma**: Modern database toolkit
- **Drizzle Kit**: TypeScript ORM migrations

### Development Tools
- **SQLFluff**: SQL linter and formatter
- **Docker CLI**: For testcontainers and database services
- **Custom Scripts**: Connection helpers and utilities

## Building the Image

```bash
# Build the database environment
docker build -t claude-database:latest .

# Test the build
docker run --rm claude-database:latest db-start
```

## Using with DevContainer

1. **Initialize DevContainer**:
   ```bash
   claude-devcontainer init -s custom
   ```

2. **Edit `.devcontainer/devcontainer.json`**:
   ```json
   {
     "name": "Database Development Environment",
     "image": "claude-database:latest",
     "features": {
       "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
         "servers": "serena,context7"
       }
     },
     "forwardPorts": [5432, 3306, 6379, 27017],
     "customizations": {
       "vscode": {
         "extensions": [
           "anthropic.claude-code",
           "mtxr.sqltools",
           "mtxr.sqltools-driver-pg",
           "mtxr.sqltools-driver-mysql",
           "mtxr.sqltools-driver-sqlite",
           "bradlc.vscode-tailwindcss"
         ]
       }
     },
     "postCreateCommand": "cp ~/.config/db-env/connections.example.yml ~/.config/db-env/connections.yml"
   }
   ```

## Configuration

### Database Connections

1. **Copy the example configuration**:
   ```bash
   cp ~/.config/db-env/connections.example.yml ~/.config/db-env/connections.yml
   ```

2. **Edit with your database details**:
   ```yaml
   environments:
     local-postgres:
       type: postgres
       url: postgresql://user:password@localhost:5432/database
     
     docker-mysql:
       type: mysql
       url: mysql://root:password@mysql:3306/myapp
   ```

3. **Use environment variables for secrets**:
   ```yaml
   production:
     type: postgres
     url: postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}
   ```

## Usage Examples

### Quick Database Connections

```bash
# Connect using configured environments
db-connect local-postgres
db-connect docker-mysql
db-connect test-sqlite

# Connect using direct URLs
db-connect postgresql://user:pass@host:5432/db
db-connect mysql://user:pass@host:3306/db
```

### Interactive Database Clients

```bash
# PostgreSQL with syntax highlighting
pgcli postgresql://user:pass@host:5432/db

# MySQL with auto-completion
mycli mysql://user:pass@host:3306/db

# SQLite with modern interface
litecli mydata.db

# Redis operations
redis-cli -h localhost -p 6379

# MongoDB shell
mongosh mongodb://localhost:27017/mydb
```

### Migration Management

```bash
# Python/Alembic migrations
alembic init migrations
alembic revision -m "Add user table"
alembic upgrade head

# Go migrations
migrate create -ext sql -dir migrations -seq create_users_table
migrate -path migrations -database "postgres://..." up

# Node.js/Prisma
prisma init
prisma generate
prisma db push
```

### SQL Development

```bash
# Format SQL files
sqlfluff format queries/

# Lint SQL code
sqlfluff lint --dialect postgres queries/complex_query.sql

# Fix SQL issues automatically
sqlfluff fix --dialect mysql queries/
```

### Docker Integration

```bash
# Start database services with Docker Compose
docker-compose up -d postgres mysql redis

# Run database in testcontainer
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres:15

# Connect to containerized database
db-connect postgresql://postgres:test@localhost:5432/postgres
```

## Common Workflows

### 1. Local Development Setup

```bash
# Start local databases
docker-compose up -d

# Connect and create schema
db-connect local-postgres
# In pgcli: CREATE DATABASE myapp_dev;

# Run migrations
alembic upgrade head

# Seed development data
python scripts/seed_data.py
```

### 2. Database Migration Development

```bash
# Create migration files
alembic revision -m "Add user authentication"

# Edit migration in editor
code migrations/versions/001_add_user_auth.py

# Test migration
alembic upgrade head
alembic downgrade -1
```

### 3. Query Development and Testing

```bash
# Write query in file
code queries/user_analytics.sql

# Test query interactively
pgcli < queries/user_analytics.sql

# Format and lint
sqlfluff format queries/user_analytics.sql
sqlfluff lint queries/user_analytics.sql
```

### 4. Database Administration

```bash
# Backup database
pg_dump postgresql://user:pass@host:5432/db > backup.sql

# Restore database
psql postgresql://user:pass@host:5432/new_db < backup.sql

# Monitor database performance
pgcli postgresql://user:pass@host:5432/db
# Run: SELECT * FROM pg_stat_activity;
```

## Environment Variables

Common environment variables used in database development:

```bash
# Database connections
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export REDIS_URL="redis://localhost:6379"
export MONGODB_URL="mongodb://localhost:27017/mydb"

# Migration tools
export ALEMBIC_CONFIG="alembic.ini"
export MIGRATE_PATH="./migrations"

# Development settings
export DB_POOL_SIZE=10
export DB_TIMEOUT=30
export DB_SSL_MODE=prefer
```

## VS Code Integration

The environment works seamlessly with VS Code extensions:

- **SQLTools**: Connect to databases directly in VS Code
- **Database Client**: Visual database exploration
- **REST Client**: Test database APIs
- **GitLens**: Track migration file changes

## Testing Strategies

### Unit Testing with Testcontainers

```python
# Python example
import testcontainers.postgres as pg

def test_database_operations():
    with pg.PostgresContainer("postgres:15") as postgres:
        connection_url = postgres.get_connection_url()
        # Run tests against real database
```

### Integration Testing

```bash
# Set up test database
docker run --name test-db -e POSTGRES_DB=test -p 5433:5432 -d postgres:15

# Run integration tests
pytest tests/integration/ --db-url postgresql://postgres@localhost:5433/test

# Clean up
docker rm -f test-db
```

## Size Information

- **Base**: ~781MB (claude-base)
- **Database tools**: ~400MB
- **Total**: ~1.18GB

Optimized for comprehensive database development capabilities.