# Full-Stack Next.js Application Template

This template provides a complete full-stack web application environment with:

- **Next.js Development Container** - Claude Code enabled with comprehensive web tools
- **PostgreSQL Database** - Full-featured relational database with migrations
- **Redis Cache** - High-performance caching and session storage
- **Background Worker** - Separate service for background job processing
- **Email Testing (Mailhog)** - Local email testing and debugging
- **S3-Compatible Storage (MinIO)** - Object storage for file uploads

## Services

### App Service (Primary)
- **Image**: `claude-nextjs:latest`
- **Purpose**: Main development environment where VS Code connects
- **Features**: Claude Code, Node.js, pnpm, TypeScript, Tailwind CSS, NextAuth.js
- **Ports**: 3000 (Next.js), 3001 (API)

### Worker Service (Optional)
- **Image**: `claude-nextjs:latest`
- **Purpose**: Background job processing (queues, scheduled tasks)
- **Profile**: Enable with `--profile full`
- **Use Cases**: Email sending, image processing, data sync

### Database Service
- **Image**: `postgres:15-alpine`
- **Purpose**: PostgreSQL database with automatic migrations
- **Database**: `fullstackdb`
- **Port**: 5432
- **Credentials**: `postgres/postgres` (development only)

### Redis Service
- **Image**: `redis:7-alpine`
- **Purpose**: Caching, sessions, and job queues
- **Port**: 6379
- **Persistence**: Enabled with AOF

### Email Service (Mailhog)
- **Image**: `mailhog/mailhog:latest`
- **Purpose**: Local email testing and debugging
- **Ports**: 1025 (SMTP), 8025 (Web UI)
- **Profile**: Enable with `--profile full` or `--profile mail`

### Storage Service (MinIO)
- **Image**: `minio/minio:latest`
- **Purpose**: S3-compatible object storage
- **Ports**: 9000 (S3 API), 9001 (Web Console)
- **Credentials**: `minioadmin/minioadmin` (development only)
- **Profile**: Enable with `--profile full` or `--profile storage`

## Environment Variables

The following environment variables are automatically configured:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/fullstackdb

# Cache
REDIS_URL=redis://redis:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-change-in-production

# Email (Mailhog)
EMAIL_SERVER_URL=smtp://mail:1025
EMAIL_FROM=noreply@example.com
```

## Usage

### Basic Setup
```bash
# Initialize project
claude-devcontainer init --stack fullstack-nextjs

# Open in VS Code
code .
# Use "Dev Containers: Reopen in Container"
```

### With All Services
```bash
# Start with all optional services
docker-compose --profile full up
```

### Selective Services
```bash
# Just email testing
docker-compose --profile mail up

# Just storage
docker-compose --profile storage up
```

## Service Access

### Development Services
- **Next.js App**: `http://localhost:3000`
- **API Routes**: `http://localhost:3000/api/...`

### Admin/Debug Services
- **Mailhog UI**: `http://localhost:8025`
- **MinIO Console**: `http://localhost:9001`

### Database Access
```bash
# From within container
psql -h db -U postgres -d fullstackdb

# From host (if port forwarded)
psql -h localhost -U postgres -d fullstackdb
```

## Common Patterns

### Database Migrations
```bash
# Prisma example
npx prisma migrate dev

# Custom migration scripts
npm run db:migrate
```

### Background Jobs
```javascript
// In worker service
import { Queue } from 'your-queue-library';

const emailQueue = new Queue('email', process.env.REDIS_URL);
```

### File Uploads with MinIO
```javascript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: 'http://storage:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  }
});
```

### Email Testing
```javascript
// Configure nodemailer for development
const transporter = nodemailer.createTransporter({
  host: 'mail',
  port: 1025,
  secure: false
});
```

## Database Initialization

Add SQL scripts to `docker/db/init/` directory:

```bash
mkdir -p docker/db/init
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > docker/db/init/01-extensions.sql
```

## Customization

- **Dependencies**: Update `package.json`
- **Environment**: Create `.env` file
- **Database Schema**: Use migrations or initialization scripts
- **Additional Services**: Extend `docker-compose.yml`
- **Worker Jobs**: Implement in separate files and run in worker service

## Architecture Benefits

- **Separation of Concerns**: Web app, workers, and services are isolated
- **Scalability**: Each service can be scaled independently
- **Development Parity**: Matches production multi-service architecture
- **Easy Testing**: All services available locally with realistic data flow

## Production Considerations

- Change default passwords and secrets
- Use environment-specific configurations
- Consider managed services for production (RDS, Redis Cloud, etc.)
- Implement proper monitoring and logging