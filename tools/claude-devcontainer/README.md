# Claude DevContainer CLI

A command-line tool for generating Claude DevContainer configurations and migrating from claude-docker setups.

## Installation

### Local Development (Recommended)
```bash
# From the project root
cd tools/claude-devcontainer

# Install dependencies
npm install

# Create global link
npm link

# Now use anywhere
claude-devcontainer init
```

### Alternative: Direct Usage
```bash
# From the project root
cd tools/claude-devcontainer
npm install

# Run directly
node src/index.js init
```

## Quick Start

```bash
# Analyze your project and get recommendations
claude-devcontainer detect

# Initialize with recommended stack (interactive)
claude-devcontainer init

# List all available single-container and multi-service stacks
claude-devcontainer stacks

# List multi-service templates for complex projects
claude-devcontainer services

# Initialize directly with a multi-service template
claude-devcontainer compose web-db-stack

# Check existing configuration for needed updates
claude-devcontainer check
```

## Commands

### `init`

Initialize a new Claude DevContainer configuration with interactive setup.

```bash
claude-devcontainer init [options]

Options:
  -s, --stack <stack>      Pre-select development stack
  -f, --features <list>    Comma-separated list of MCP features
  -n, --name <name>        Project name for DevContainer
  --multi-service          Force multi-service setup
  --no-interaction         Run without interactive prompts
```

**Examples:**
```bash
# Interactive setup with project detection
claude-devcontainer init

# Pre-select Python ML stack with specific features
claude-devcontainer init -s python-ml -f serena,context7,langchain-tools

# Force multi-service setup for complex projects
claude-devcontainer init --multi-service
```

### `detect`

Automatically detect the project type based on files in the current directory with enhanced analysis.

```bash
claude-devcontainer detect
```

**Enhanced Detection Logic:**
- **Node.js/Next.js**: Detects `package.json`, checks for Next.js dependencies, database usage
- **Rust/Tauri**: Detects `Cargo.toml`, checks for `src-tauri/` directory
- **Python/ML**: Detects Python files and ML library imports (pandas, numpy, sklearn, etc.)
- **Complexity Analysis**: Scores project complexity (0-10) for multi-service recommendations
- **Service Detection**: Identifies database, cache, and background job usage
- **Existing Docker**: Detects existing Docker Compose configurations

**Output includes:**
- Detected project types and recommended stacks
- Project complexity score with multi-service recommendations
- Additional findings (database usage, cache, background jobs, etc.)
- Suggested next steps and commands

### `stacks`

List all available development stacks with descriptions, separated by single-container and multi-service.

```bash
claude-devcontainer stacks
```

**Shows:**
- Single-container stacks with images, ports, features, and host build support
- Multi-service stacks with services, ports, and features
- Usage examples and stack selection guide

### `services`

List available multi-service templates with validation and detailed information.

```bash
claude-devcontainer services
```

**Features:**
- Shows all multi-service templates with service breakdowns
- Lists physical template files and their contents
- Validates template structure and reports issues
- Provides usage examples and template guide

### `compose <template>`

Initialize with a specific multi-service template for complex applications.

```bash
claude-devcontainer compose <template> [options]

Options:
  -n, --name <name>    Project name
  --no-interaction     Run without interactive prompts
```

**Examples:**
```bash
# Initialize with web + database template
claude-devcontainer compose web-db-stack

# Initialize Python ML services with custom name
claude-devcontainer compose python-ml-services -n "My ML Project"

# Non-interactive setup
claude-devcontainer compose fullstack-nextjs --no-interaction
```

### Migration Commands

#### `migrate`

Migrate existing DevContainer configuration to latest Claude setup with intelligent analysis.

```bash
claude-devcontainer migrate [options]

Options:
  --dry-run    Show proposed changes without applying them
  --auto       Apply safe changes automatically without prompting
```

#### `migrate-specific <changesets...>`

Apply specific change sets for targeted migrations.

```bash
claude-devcontainer migrate-specific <changesets...> [options]

Options:
  --dry-run    Show proposed changes without applying them
  --auto       Apply changes automatically without prompting
```

**Examples:**
```bash
# Apply specific change sets
claude-devcontainer migrate-specific update-image add-mcp-servers

# Preview changes
claude-devcontainer migrate-specific add-mcp-feature --dry-run
```

#### `check`

Analyze existing DevContainer configuration for issues and needed updates.

```bash
claude-devcontainer check
```

**Provides:**
- Configuration analysis and compatibility check
- List of available and needed change sets
- Identification of issues and recommended fixes

#### `change-sets`

List all available change sets with descriptions and dependencies.

```bash
claude-devcontainer change-sets
```

**Shows:**
- All available change sets with IDs and descriptions
- Version information and tags
- Dependencies and conflicts between change sets
- Usage examples for applying specific changes

## Available Stacks

### Python ML (`python-ml`)
- **Image**: `claude-python-ml:latest`
- **Features**: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- **Ports**: 8888 (Jupyter)
- **Extensions**: Python, Jupyter, Black formatter

### Rust Tauri (`rust-tauri`)
- **Image**: `claude-rust-tauri:latest`
- **Features**: Rust toolchain, Tauri v2, cross-compilation
- **Ports**: 1420 (Tauri dev server)
- **Extensions**: rust-analyzer, Tauri, LLDB debugger
- **Host Builds**: Enabled by default

### Next.js (`nextjs`)
- **Image**: `claude-nextjs:latest`
- **Features**: Node.js, Bun, TypeScript, modern web tools
- **Ports**: 3000 (Next.js dev server)
- **Extensions**: Tailwind CSS, Prettier, TypeScript

### Custom (`custom`)
- **Image**: `claude-base:latest`
- **Features**: Base Claude environment for custom configuration
- **Extensions**: None (configure as needed)
- **Use Case**: Starting point for creating specialized environments

## Multi-Service Stacks

For complex applications requiring databases, caches, and background services, use multi-service stacks that provide complete development environments with Docker Compose.

### Web + Database (`web-db`)
- **Template**: `web-db-stack`
- **Services**: app (Next.js), db (PostgreSQL), redis (Redis)
- **Ports**: 3000 (Next.js), 3001 (API), 5432 (PostgreSQL), 6379 (Redis)
- **Features**: Next.js development with database and caching
- **Extensions**: Tailwind CSS, Prettier, TypeScript, PostgreSQL
- **Use Case**: Web applications with database requirements

### Python ML Services (`python-ml-services`)
- **Template**: `python-ml-services`
- **Services**: app (Python ML), vectordb (PostgreSQL + pgvector), redis (Redis Stack)
- **Ports**: 8888 (Jupyter), 8000 (ML API), 6006 (TensorBoard), 5432 (Vector DB), 6379 (Redis), 8001 (Vector API)
- **Features**: Machine learning with vector search and data processing
- **Extensions**: Python, Jupyter, Black formatter, PostgreSQL
- **Use Case**: ML projects requiring vector databases and data pipelines

### Full-Stack App (`fullstack`)
- **Template**: `fullstack-nextjs`
- **Services**: app (Next.js), worker (background jobs), db (PostgreSQL), redis (Redis), mail (Mailhog), storage (MinIO)
- **Ports**: 3000 (Next.js), 3001 (API), 5432 (PostgreSQL), 6379 (Redis), 8025 (Mailhog), 9000 (MinIO API), 9001 (MinIO Console)
- **Features**: Complete web application with all supporting services
- **Extensions**: Tailwind CSS, Prettier, TypeScript, PostgreSQL, Prisma
- **Use Case**: Enterprise applications with background processing, email, and file storage

### Multi-Service Benefits
- **Complete Environments**: All dependencies included and pre-configured
- **Service Integration**: Services can communicate with each other seamlessly
- **Development Parity**: Matches production architecture for better testing
- **Resource Management**: Optimized resource allocation based on service count
- **Template Customization**: Copy and modify templates for your specific needs

## Configuration Options

### MCP Servers

Choose from available MCP servers:
- **serena**: Semantic code analysis and coding assistance
- **context7**: Up-to-date documentation and examples
- **twilio**: SMS messaging capabilities
- **langchain-tools**: LangChain development utilities
- **vector-db**: Vector search and embeddings
- **anthropic-api**: Direct Anthropic API access
- **rust-analyzer**: Rust language server integration
- **tauri-tools**: Tauri development utilities
- **web-dev-tools**: General web development tools
- **nextjs-tools**: Next.js specific development tools

### Host Build Integration

Enable SSH-based builds on the host system (particularly useful for macOS native builds):

- Copies SSH keys from host `~/.ssh` directory
- Provides `build-on-host` command wrapper
- Automatic project type detection
- Fallback to container builds if host unavailable

## Generated Files

The CLI generates the following files:

### `.devcontainer/devcontainer.json`
Main DevContainer configuration with:
- Base image selection
- Feature configuration
- Port forwarding
- VS Code extensions
- Post-creation commands
- **Claude directory mounting** for user customizations

### `.claude/settings.json` (optional)
Claude-specific settings including:
- Model configuration
- Permission settings
- Tool access configuration

### `.env.example`
Environment variable template for:
- Twilio configuration
- Custom MCP server settings
- Other stack-specific variables

## Claude User Data Mounting

All DevContainer configurations automatically mount your host `~/.claude` directory to preserve:

### User Customizations
- **Custom Agents** (`~/.claude/agents/`) - Your personal AI agents
- **Custom Commands** (`~/.claude/commands/`) - Shell commands and shortcuts  
- **Plugins** (`~/.claude/plugins/`) - Installed Claude plugins
- **Global Instructions** (`~/.claude/CLAUDE.md`) - Your universal Claude instructions

### User Settings & Data
- **Settings** (`~/.claude/settings.json`) - Personal preferences and configuration
- **Projects** (`~/.claude/projects/`) - Project history and references
- **Todos** (`~/.claude/todos/`) - Persistent task lists
- **Shell Snapshots** (`~/.claude/shell-snapshots/`) - Command history

### Mount Configuration
The mount is automatically configured as:
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind"
  ]
}
```

### Benefits
- **Seamless Experience** - All your Claude customizations work immediately
- **Data Persistence** - Settings and history survive container rebuilds
- **No Setup Required** - Works automatically when you open the container
- **Cross-Project** - Same agents/commands available across all projects

## Migration from claude-docker

The CLI automatically detects existing claude-docker setups and helps migrate:

1. **Detection**: Scans for `claude-docker.sh` and related files
2. **Configuration**: Preserves MCP server configurations
3. **Environment**: Migrates `.env` settings
4. **Features**: Maps existing functionality to DevContainer features

## Custom Images

The Claude DevContainer system is designed for extensibility. You can create custom images for specialized environments while maintaining compatibility with the Claude toolchain.

### Image Hierarchy

```
claude-base:latest              # Foundation with Claude Code, git, build tools
├── claude-python-ml:latest     # + Python 3.11, ML libraries, Jupyter
├── claude-rust-tauri:latest    # + Rust toolchain, Tauri v2, GUI deps
├── claude-nextjs:latest        # + Node.js, Bun, TypeScript tools
└── your-custom:latest          # + Your specialized tools
```

### Creating Custom Images

#### 1. Basic Extension Example

```dockerfile
FROM claude-base:latest

# Switch to root for system installs
USER root

# Add your system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Add your user-level tools
RUN curl -fsSL https://get.pnpm.io/install.sh | sh

# Set working directory
WORKDIR /workspace
```

#### 2. Multi-Language Environment

```dockerfile
FROM claude-base:latest

USER root

# Add multiple language runtimes
RUN apt-get update && apt-get install -y \
    # Go
    golang-go \
    # Java
    openjdk-17-jdk \
    # .NET
    dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

USER claude-user

# Install language-specific tools
RUN go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
RUN curl -sSfL https://raw.githubusercontent.com/dotnet/install-scripts/main/src/dotnet-install.sh | bash

# Configure PATH
ENV PATH="/home/claude-user/.local/bin:/home/claude-user/go/bin:${PATH}"
```

#### 3. Database Development Environment

```dockerfile
FROM claude-base:latest

USER root

# Install database clients and tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    mysql-client \
    sqlite3 \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for testcontainers)
RUN curl -fsSL https://get.docker.com | sh

USER claude-user

# Install database migration tools
RUN ~/.local/bin/uv tool install alembic
RUN curl -L https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-arm64.tar.gz | tar xvz -C ~/.local/bin/

# Add database connection utilities
COPY scripts/db-connect.sh /home/claude-user/.local/bin/
RUN chmod +x /home/claude-user/.local/bin/db-connect.sh
```

### Using Custom Images

#### Method 1: Use Custom Stack

1. Create your custom image:
   ```bash
   docker build -t my-custom-claude:latest -f Dockerfile.custom .
   ```

2. Initialize with custom stack:
   ```bash
   claude-devcontainer init -s custom
   ```

3. Modify the generated `.devcontainer/devcontainer.json`:
   ```json
   {
     "name": "My Custom Environment",
     "image": "my-custom-claude:latest",
     "features": {
       "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
         "servers": "serena,context7"
       }
     }
   }
   ```

#### Method 2: Direct DevContainer Configuration

Create `.devcontainer/devcontainer.json` directly:

```json
{
  "name": "Database Development Environment",
  "image": "my-db-claude:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind"
  ],
  "features": {
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7,database-tools"
    }
  },
  "forwardPorts": [5432, 3306, 6379],
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "ms-vscode.vscode-json",
        "mtxr.sqltools"
      ]
    }
  },
  "postCreateCommand": "echo 'Custom environment ready!'"
}
```

### Best Practices

#### Dockerfile Guidelines

1. **Always start FROM claude-base:latest** to ensure compatibility
2. **Follow the USER switching pattern** (root for system, claude-user for user tools)
3. **Clean up package caches** to keep images lean
4. **Use absolute paths** and avoid assumptions about current directory
5. **Set proper permissions** for installed tools

#### Tool Installation

```dockerfile
# Good: System tools as root, user tools as claude-user
USER root
RUN apt-get update && apt-get install -y system-tool && rm -rf /var/lib/apt/lists/*

USER claude-user  
RUN curl -sSL https://install-script.com | sh
```

#### Environment Variables

```dockerfile
# Preserve existing PATH and add to it
ENV PATH="/home/claude-user/.local/bin:/home/claude-user/.custom/bin:${PATH}"

# Set tool-specific variables
ENV CUSTOM_TOOL_HOME="/home/claude-user/.custom"
ENV CUSTOM_TOOL_CONFIG="/home/claude-user/.config/custom"
```

### Registry and Distribution

#### Local Development
Build and use images locally:
```bash
docker build -t my-custom-claude:latest .
claude-devcontainer init -s custom
# Edit devcontainer.json to use your image
```

#### Team Distribution
Push to a container registry:
```bash
# Tag for registry
docker tag my-custom-claude:latest registry.company.com/my-custom-claude:latest

# Push to registry  
docker push registry.company.com/my-custom-claude:latest

# Team members can then use:
# "image": "registry.company.com/my-custom-claude:latest"
```

#### GitHub Container Registry
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag and push
docker tag my-custom-claude:latest ghcr.io/username/my-custom-claude:latest
docker push ghcr.io/username/my-custom-claude:latest
```

### Maintenance

#### Updating Custom Images
Regularly update your base image:

```dockerfile
# Pin to specific version for stability
FROM claude-base:2024.01.15

# Or use latest for newest features (rebuild required)
FROM claude-base:latest
```

#### Testing Custom Images
Create a test suite:

```bash
# Test basic functionality
docker run --rm my-custom-claude:latest claude --version
docker run --rm my-custom-claude:latest node --version

# Test custom tools
docker run --rm my-custom-claude:latest your-custom-tool --version
```

## Examples

### Single-Container Examples

#### Basic Python ML Project

```bash
cd my-ml-project
claude-devcontainer init -s python-ml
# Select serena, context7, langchain-tools, vector-db
# Container will have Jupyter available on port 8888
```

#### Tauri Desktop App with Host Builds

```bash
cd my-tauri-app
claude-devcontainer init -s rust-tauri
# Enable macOS host builds when prompted
# Select serena, context7, rust-analyzer, tauri-tools
```

#### Next.js Web Application

```bash
cd my-nextjs-app
claude-devcontainer init -s nextjs  
# Container will have dev server on port 3000
# Includes Tailwind CSS and Prettier extensions
```

### Multi-Service Examples

#### Web Application with Database

```bash
cd my-web-app
claude-devcontainer detect
# If database usage detected, will recommend web-db stack

# Initialize with multi-service template
claude-devcontainer compose web-db-stack
# Creates docker-compose.yml with Next.js, PostgreSQL, Redis
# VS Code connects to 'app' service, other services run alongside
```

#### Machine Learning Pipeline

```bash
cd my-ml-pipeline
claude-devcontainer init -s python-ml-services
# Creates environment with vector database and Redis Stack
# Jupyter on 8888, TensorBoard on 6006, Vector API on 8001
# Perfect for ML projects with vector search and data processing
```

#### Full-Stack Enterprise Application

```bash
cd my-enterprise-app
claude-devcontainer compose fullstack-nextjs -n "My Enterprise App"
# Complete environment with:
# - Next.js app with TypeScript and Prisma
# - PostgreSQL database
# - Redis for caching and sessions  
# - Background worker for jobs
# - Mailhog for email testing
# - MinIO for file storage
```

### Advanced Workflows

#### Project Detection and Multi-Service Setup

```bash
cd my-complex-project

# Analyze project complexity
claude-devcontainer detect
# Shows complexity score and multi-service recommendations

# If complexity >= 4, initialize with multi-service
claude-devcontainer init --multi-service
# Automatically selects appropriate multi-service stack
```

#### Template-Based Development

```bash
# List available multi-service templates
claude-devcontainer services

# Initialize with specific template
claude-devcontainer compose python-ml-services

# Customize the generated docker-compose.yml as needed
# All template files are copied to your project
```

#### Migration from Existing Setup

```bash
cd existing-devcontainer-project

# Check current configuration
claude-devcontainer check

# See available migrations
claude-devcontainer change-sets

# Apply specific improvements
claude-devcontainer migrate-specific update-image add-mcp-servers

# Or migrate everything
claude-devcontainer migrate --dry-run  # Preview changes
claude-devcontainer migrate            # Apply all needed updates
```

### Custom Configuration

#### Basic Custom Stack

```bash
cd my-custom-project
claude-devcontainer init -s custom
# Start with base image and configure as needed
# Add custom MCP servers and extensions
```

#### Advanced Custom Environment

```bash
cd my-database-project

# Build custom image
docker build -t my-db-claude:latest -f Dockerfile.database .

# Initialize with custom stack
claude-devcontainer init -s custom

# Edit .devcontainer/devcontainer.json to use your custom image
# Add database-specific MCP servers and VS Code extensions
```

## Troubleshooting

### SSH Key Issues (Host Builds)

If host builds aren't working:

1. **Generate SSH keys:**
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

2. **Add to authorized keys:**
   ```bash
   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Enable SSH on macOS:**
   ```bash
   sudo systemsetup -setremotelogin on
   ```

### MCP Server Installation

If MCP servers fail to install:

1. **Check environment variables** in `.env` file
2. **Verify container has internet access**
3. **Check container logs** during feature installation
4. **Manually install servers** after container creation:
   ```bash
   claude mcp add -s user serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server
   ```

### Container Build Issues

1. **Clear Docker cache:**
   ```bash
   docker builder prune
   ```

2. **Rebuild container:**
   - Use "Dev Containers: Rebuild Container" in VS Code
   - Or rebuild manually: `docker build --no-cache`

3. **Check image availability:**
   - Ensure images are built locally or available in your registry
   - Update image names/tags if using custom registry