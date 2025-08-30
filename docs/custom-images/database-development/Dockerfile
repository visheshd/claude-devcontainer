# Database Development Environment
# Specialized environment for database development and administration
FROM claude-base:latest

# Switch to root for system installations
USER root

# Install database servers and clients
RUN apt-get update && apt-get install -y \
    # PostgreSQL
    postgresql-client \
    postgresql-contrib \
    # MySQL/MariaDB
    mysql-client \
    default-mysql-client \
    # SQLite
    sqlite3 \
    # Redis
    redis-tools \
    # MongoDB tools (from official repo)
    gnupg \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-mongosh \
    # Database migration tools
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Docker CLI for testcontainers
RUN curl -fsSL https://get.docker.com | sh

# Switch back to claude-user
USER claude-user

# Install Python database tools
RUN ~/.local/bin/uv tool install alembic
RUN ~/.local/bin/uv tool install sqlfluff
RUN ~/.local/bin/uv tool install mycli
RUN ~/.local/bin/uv tool install pgcli
RUN ~/.local/bin/uv tool install litecli

# Install Node.js database tools
RUN npm install -g \
    @databases/pg-migrations \
    knex \
    prisma \
    drizzle-kit

# Install Go migration tool
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        MIGRATE_ARCH="linux-amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        MIGRATE_ARCH="linux-arm64"; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    curl -L "https://github.com/golang-migrate/migrate/releases/latest/download/migrate.${MIGRATE_ARCH}.tar.gz" | \
    tar xvz -C ~/.local/bin migrate

# Create database connection scripts directory
RUN mkdir -p ~/.local/bin/db-scripts

# Copy helper scripts
COPY scripts/db-connect.sh ~/.local/bin/db-connect
COPY scripts/db-backup.sh ~/.local/bin/db-backup
COPY scripts/db-restore.sh ~/.local/bin/db-restore
RUN chmod +x ~/.local/bin/db-*

# Create workspace directories for database projects
RUN mkdir -p /workspace/{migrations,schemas,queries,backups,scripts}

# Set up environment variables
ENV DB_SCRIPTS_PATH="/home/claude-user/.local/bin/db-scripts"

# Create database-specific configuration
RUN mkdir -p ~/.config/db-env
COPY config/connections.example.yml ~/.config/db-env/

# Document installed tools
RUN echo '#!/bin/bash\n\
echo "🗄️  Database Development Environment Ready"\n\
echo "Databases: PostgreSQL, MySQL, SQLite, Redis, MongoDB"\n\
echo "Clients: pgcli, mycli, litecli, mongosh, redis-cli"\n\
echo "Tools: alembic, migrate, sqlfluff, prisma, drizzle"\n\
echo "Docker: Available for testcontainers"\n\
echo ""\n\
echo "💡 Quick commands:"\n\
echo "  db-connect <env>     # Connect to database"\n\
echo "  db-backup <env>      # Backup database"\n\
echo "  pgcli postgres://... # Interactive PostgreSQL client"\n\
echo "  mycli mysql://...    # Interactive MySQL client"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/db-start && \
    chmod +x ~/.local/bin/db-start

# Set working directory
WORKDIR /workspace

# Use database-specific startup
CMD ["db-start"]