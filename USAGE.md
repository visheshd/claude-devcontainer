# Usage Guide

Advanced usage patterns, worktree workflows, and multi-service configurations for Claude DevContainer.

## Table of Contents

- [Worktree Workflows](#worktree-workflows)
- [Multi-Service Development](#multi-service-development)
- [CLI Reference](#cli-reference)
- [Advanced Configuration](#advanced-configuration)
- [Custom Images](#custom-images)
- [Performance Optimization](#performance-optimization)

## Worktree Workflows

> **Critical**: Always use the `wt` command to create worktrees. Manual `git worktree add` will NOT configure DevContainers properly.

### Basic Worktree Workflow

```bash
# 1. Create main project with DevContainer
cd your-project
cdc init

# 2. Create feature worktrees for parallel development
cdc wt feature-auth     # or: wt feature-auth
cdc wt bugfix-login     # or: wt bugfix-login

# This creates:
# ../your-project-feature-auth/
# ../your-project-bugfix-login/
```

### Working with Feature Branches

```bash
# Create worktree from specific branch
wt feature-branch --from main
wt hotfix-urgent --from v1.2.3

# Each worktree gets its own DevContainer configuration
cd ../your-project-feature-branch
code .  # Opens with proper DevContainer setup
```

### Worktree Environment Variables

The `wt` command automatically configures these environment variables:

```bash
WORKTREE_HOST_MAIN_REPO=/path/to/main/repo
WORKTREE_HOST_CURRENT_REPO=/path/to/current/worktree  
WORKTREE_MAIN_REPO_NAME=your-project
WORKTREE_CURRENT_REPO_NAME=your-project-feature-name
```

Use these in your scripts and configurations for worktree-aware behavior.

### Cleanup Workflows

**Automatic Cleanup (Recommended)**
```bash
# After merging feature back to main:
git merge feature-branch
# Post-merge hook automatically prompts for cleanup
```

**Manual Cleanup**
```bash
# List all worktrees and Docker artifacts
cdc cleanup --list

# Clean specific worktree
cdc cleanup feature-auth

# Clean all merged branches (safe)
cdc cleanup --merged

# Interactive cleanup with choices
cdc cleanup --interactive

# Preview cleanup without executing
cdc cleanup --dry-run --all
```

### Worktree Best Practices

1. **Use descriptive names**: `wt feature-user-auth` instead of `wt fix`
2. **Clean up regularly**: Use `cdc cleanup --merged` after releases
3. **Isolate features**: One feature per worktree for cleaner development
4. **Test before merge**: Each worktree has isolated container environment

## Multi-Service Development

### When to Use Multi-Service

Choose multi-service when your project needs:
- **Databases**: PostgreSQL, MongoDB, or other data stores
- **Caching**: Redis or similar caching layers
- **Background Jobs**: Queues, workers, or scheduled tasks
- **Full-Stack Apps**: Complete web applications with multiple components

### Available Multi-Service Templates

```bash
# List available templates
cdc services

# Web application with database
cdc compose web-db
# Creates: Next.js app + PostgreSQL + Redis

# Python ML with services  
cdc compose python-ml-services
# Creates: Python ML + Vector DB + Redis Stack + Jupyter

# Complete full-stack application
cdc compose fullstack-nextjs
# Creates: Next.js + Worker + PostgreSQL + Redis + Mail + S3
```

### Multi-Service Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   VS Code       │────│  Primary Service │ ← VS Code connects here
│   (Local)       │    │  "app"           │   (Claude Code + dev tools)
└─────────────────┘    │  - Claude Code   │
                       │  - Source code   │
                       │  - Build tools   │
                       └─────────┬────────┘
                                 │ Docker network
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼────┐ ┌─────▼────┐ ┌────▼─────┐
              │PostgreSQL│ │ Redis    │ │Background│
              │Service   │ │Service   │ │Worker    │
              └──────────┘ └──────────┘ └──────────┘
```

### Working with Services

**Connecting to Services**
```bash
# Inside the primary "app" container:

# Connect to PostgreSQL
psql -h postgres -U myuser -d mydb

# Connect to Redis
redis-cli -h redis

# Check service status
docker-compose ps
```

**Service Configuration**
Services are defined in `docker-compose.yml` and can be customized:

```yaml
services:
  app:
    # Your primary development container
    image: claude-nextjs:latest
    # ...
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypass
    
  redis:
    image: redis:7-alpine
```

### Environment Variables for Services

Multi-service setups automatically configure connection variables:

```bash
DATABASE_URL=postgresql://user:pass@postgres:5432/mydb
REDIS_URL=redis://redis:6379
# ... other service URLs
```

## CLI Reference

### Core Commands

```bash
# Initialize new DevContainer
cdc init [--stack <stack>]
cdc init --stack python-ml
cdc init --stack nextjs

# Multi-service initialization  
cdc compose <template>
cdc compose web-db
cdc compose python-ml-services

# Worktree operations (⚠️ Use ONLY these commands)
cdc wt <name> [--from <branch>]
wt <name>                    # Standalone command
```

### Configuration Commands

```bash
# Analyze existing DevContainer
cdc check

# Upgrade to latest features
cdc migrate [--dry-run]

# Detect project type
cdc detect

# List available stacks
cdc stacks

# List multi-service templates
cdc services
```

### Cleanup Commands

```bash
# List worktrees and artifacts
cdc cleanup --list

# Clean specific worktree
cdc cleanup <worktree-name>

# Clean merged branches
cdc cleanup --merged [--verbose]

# Interactive cleanup
cdc cleanup --interactive

# Dry run (preview only)
cdc cleanup --dry-run [--all|--merged]
```

### Command Options

```bash
# Global options
--help, -h          Show help
--version, -v       Show version
--verbose          Verbose output
--dry-run          Preview changes without executing

# Init options
--stack <name>     Specify development stack
--force           Overwrite existing configuration

# Cleanup options
--all             Clean all worktrees (careful!)
--merged          Clean only merged branches
--interactive     Choose what to clean
--list            List worktrees and artifacts
--verbose         Show cleanup details
```

## Advanced Configuration

### Custom DevContainer Features

DevContainer configurations support additional features:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "./src/claude-mcp": {
      "servers": "serena,context7,custom-server"
    }
  }
}
```

### Environment Customization

```json
{
  "containerEnv": {
    "NODE_ENV": "development",
    "DEBUG": "*",
    "CUSTOM_VAR": "value"
  },
  "remoteEnv": {
    "PATH": "${containerEnv:PATH}:/custom/bin"
  }
}
```

### Mount Customization

```json
{
  "mounts": [
    // Claude authentication (choose security level)
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind",
    
    // Custom tool configurations
    "source=${localEnv:HOME}/.gitconfig,target=/home/claude-user/.gitconfig,type=bind,readonly",
    
    // Project-specific mounts
    "source=${localWorkspaceFolder}/data,target=/workspace/data,type=bind"
  ]
}
```

### Host Requirements

```json
{
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb",
    "storage": "32gb"
  }
}
```

## Custom Images

### Creating Custom Images

Extend existing Claude images for specialized environments:

```dockerfile
# Dockerfile
FROM claude-python-ml:latest

USER root
# Install additional system packages
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

USER claude-user  
# Install user-level tools
RUN pip install custom-package
RUN npm install -g custom-cli-tool

WORKDIR /workspace
```

### Build and Use Custom Images

```bash
# Build your custom image
docker build -t my-custom-claude:latest .

# Use in DevContainer
cdc init --stack custom
# Edit .devcontainer/devcontainer.json:
# "image": "my-custom-claude:latest"
```

### Best Practices for Custom Images

1. **Always extend Claude base images** for compatibility
2. **Follow USER pattern**: root for system packages, claude-user for user tools  
3. **Clean package caches** to keep images lean
4. **Document customizations** in your project README
5. **Version your custom images** for reproducibility

## Performance Optimization

### Resource Allocation

**For Development**:
```json
{
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb"
  }
}
```

**For ML/AI Workloads**:
```json
{
  "hostRequirements": {
    "cpus": 8,
    "memory": "16gb",
    "gpu": true
  }
}
```

### Image Optimization

**Build only what you need**:
```bash
# Instead of building all images (~4GB)
./build-all-images.sh --rebuild

# Build specific stack (~2GB)
./build-all-images.sh --images claude-base,python-ml
```

**Use parallel builds**:
```bash
./build-all-images.sh --parallel --images claude-base,nextjs
```

### Container Optimization

**Faster startups**:
- Use specific images instead of generic base
- Minimize mounted directories
- Cache dependencies in image layers

**Resource efficiency**:
- Set appropriate CPU/memory limits
- Use multi-stage builds for custom images
- Clean up unused Docker resources regularly

### Development Workflow Optimization

1. **Use worktrees** for parallel feature development
2. **Clean up merged branches** to prevent resource accumulation  
3. **Use multi-service** only when actually needed
4. **Monitor Docker resource usage** with `docker system df`

## Integration Patterns

### CI/CD Integration

```yaml
# .github/workflows/devcontainer-test.yml
name: Test DevContainer
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: ./build-all-images.sh --images claude-base,nextjs
      - name: Test DevContainer
        run: cdc init --stack nextjs
```

### Team Development

```bash
# Shared team configuration
cdc init --stack nextjs
git add .devcontainer/
git commit -m "Add DevContainer configuration"

# Team members can then:
git pull
code .  # "Dev Containers: Reopen in Container"
```

### Project Templates

Create reusable project templates with DevContainer configurations:

```bash
# In your template repository
cdc init --stack python-ml
# Customize configuration
# Commit and use as template
```

## Next Steps

- **Security**: Review [SECURITY.md](SECURITY.md) for production considerations
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues  
- **Contributing**: Check [CONTRIBUTING.md](CONTRIBUTING.md) to contribute improvements
- **Setup**: Return to [SETUP.md](SETUP.md) for installation details