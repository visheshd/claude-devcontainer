# Web Development Stack Template

This template provides a complete web development environment with:

- **Next.js Development Container** - Claude Code enabled with modern web tools
- **PostgreSQL Database** - Full-featured relational database
- **Redis Cache** - High-performance in-memory data store

## Services

### App Service (Primary)
- **Image**: `claude-nextjs:latest`
- **Purpose**: Main development environment where VS Code connects
- **Features**: Claude Code, Node.js, pnpm, TypeScript, Tailwind CSS
- **Ports**: 3000 (Next.js), 3001 (API)

### Database Service
- **Image**: `postgres:15-alpine`
- **Purpose**: PostgreSQL database server
- **Database**: `appdb`
- **Port**: 5432
- **Credentials**: `postgres/postgres` (development only)

### Redis Service
- **Image**: `redis:7-alpine`
- **Purpose**: Caching and session storage
- **Port**: 6379

## Environment Variables

The following environment variables are automatically configured:

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/appdb
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Usage

1. **Initialize Project**:
   ```bash
   claude-devcontainer init --stack web-db
   ```

2. **Open in VS Code**:
   ```bash
   code .
   # Use "Dev Containers: Reopen in Container"
   ```

3. **Connect to Services**:
   - **Database**: Connect to `localhost:5432` from within the container
   - **Redis**: Connect to `localhost:6379` from within the container
   - **External**: Use forwarded ports from host machine

## Database Management

Access PostgreSQL from within the container:
```bash
psql -h db -U postgres -d appdb
```

Or use VS Code extensions like "PostgreSQL" for GUI management.

## Customization

- **Environment Variables**: Create `.env` file in project root
- **Database Schema**: Add initialization scripts to `docker/db/` directory
- **Additional Services**: Extend `docker-compose.yml` as needed

## Health Checks

All services include health checks to ensure proper startup order:
- **App**: HTTP check on port 3000
- **Database**: PostgreSQL ready check
- **Redis**: Redis ping check