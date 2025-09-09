# Claude DevContainer Ecosystem

**Fast, isolated local development with Claude Code across multiple git worktrees, native host builds via SSH, and complete Docker-based isolation for maximum development speed.**

A comprehensive DevContainer-based development environment that enables seamless multi-worktree development, containerized Claude Code with persistent authentication, and native host system builds through SSH integration.

[![Build Images](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml/badge.svg)](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml)

> **⚠️ CRITICAL: Always use the provided `wt` command to create git worktrees.** Manual `git worktree add` will NOT configure DevContainers properly and will cause mount path errors.

## Table of Contents

- [Key Benefits](#key-benefits)
- [Quick Start](#quick-start)
- [Available Stacks](#available-stacks)
- [Multi-Service Support](#multi-service-support)
- [Architecture](#architecture)
- [Security Notice](#security-notice)
- [Documentation](#documentation)

## Key Benefits

✅ **Native IDE Integration**: Seamless VS Code, Cursor, and compatible editor support  
✅ **Stack Optimization**: Purpose-built containers for Python ML, Rust Tauri, Next.js  
✅ **Complete Isolation**: No conflicts between different tech stacks or projects  
✅ **MCP Integration**: Built-in serena and context7 MCP servers for enhanced AI assistance  
✅ **Automated Worktrees**: Git wrapper system handles worktree operations seamlessly  
✅ **Cross-Platform**: Full compatibility across Apple Silicon, Intel, and Linux  
✅ **SSH Host Builds**: Native builds on host system for optimal performance  
✅ **Persistent Auth**: No re-login required - authentication persists across container restarts

## Quick Start

### 1. Install CLI Tool
```bash
cd tools/claude-devcontainer
npm install && npm link

# Available commands:
# claude-devcontainer (full command)
# cdc (short alias)
# wt (standalone worktree command)
```

### 2. Build Required Images
```bash
# Build only what you need (saves time & disk space)
./build-all-images.sh --images claude-base,python-ml    # Python ML stack
./build-all-images.sh --images claude-base,nextjs       # Next.js stack  
./build-all-images.sh --images claude-base,rust-tauri   # Rust Tauri stack

# Or build all images
./build-all-images.sh --rebuild
```

### 3. Create DevContainer
```bash
# Initialize with automatic stack detection
cdc init

# Or specify stack explicitly
cdc init --stack python-ml
cdc init --stack nextjs
cdc init --stack rust-tauri
```

### 4. Create Feature Worktrees
```bash
# ✅ CORRECT: Use the provided wt command
cdc wt my-feature      # Full command
wt my-feature         # Standalone command

# This creates: ../project-name-my-feature/ with DevContainer ready

# ❌ WRONG: Never use manual git worktree commands
# git worktree add ../my-feature    # This breaks DevContainer setup!
```

### 5. Open in VS Code
```bash
cd ../project-name-my-feature
code .
# Command Palette: "Dev Containers: Reopen in Container"
```

### 6. Cleanup Worktrees
```bash
# Automatic cleanup after merging
git merge my-feature  # Post-merge hook prompts for cleanup

# Manual cleanup
cdc cleanup my-feature        # Clean specific worktree
cdc cleanup --merged          # Clean merged branches  
cdc cleanup --interactive     # Choose what to clean
```

## Available Stacks

### Single Container Stacks

| Stack | Image | Use Case | Key Features |
|-------|-------|----------|--------------|
| **Python ML** | `claude-python-ml:latest` | AI/ML Development | Python 3.11, Jupyter, LangChain, PyTorch, Vector DBs |
| **Rust Tauri** | `claude-rust-tauri:latest` | Desktop Apps | Rust toolchain, Tauri v2, Cross-compilation, GUI libs |
| **Next.js** | `claude-nextjs:latest` | Web Development | Node.js, pnpm, TypeScript, Tailwind, Modern web tools |
| **Custom** | `claude-base:latest` | General Purpose | Base environment for custom configurations |

### Multi-Service Stacks

| Stack | Template | Services | Use Case |
|-------|----------|----------|----------|
| **Web + Database** | `web-db-stack` | App, PostgreSQL, Redis | Web apps with database |
| **Python ML Services** | `python-ml-services` | App, Vector DB, Redis | ML applications |
| **Full-Stack App** | `fullstack-nextjs` | App, Worker, DB, Redis, Mail, Storage | Complete web applications |

**Initialize multi-service:**
```bash
cdc services                    # List available templates
cdc compose web-db             # Next.js + PostgreSQL + Redis
cdc compose python-ml-services # Python ML + Vector DB + Redis
```

## Multi-Service Support

**When to Use Multi-Service:**
- Database Required (PostgreSQL, MongoDB)
- Caching Needed (Redis)  
- Background Jobs (queues, workers)
- Full-Stack Applications

**Architecture:**
```
┌─────────────────┐    ┌──────────────────┐
│   VS Code       │────│  Primary Service │ ← VS Code connects here
│   (Local)       │    │  "app"           │   (Claude Code + dev tools)
└─────────────────┘    └─────────┬────────┘
                                 │ Docker network
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼────┐ ┌─────▼────┐ ┌────▼─────┐
              │PostgreSQL│ │ Redis    │ │Background│
              │Service   │ │Service   │ │Worker    │
              └──────────┘ └──────────┘ └──────────┘
```

## Architecture

**Layer 1: Base Image**
- `claude-base`: Foundation with Claude Code + essential dev tools
- Components: Node.js 20, Git, SSH, oh-my-zsh, authentication setup

**Layer 2: Stack Images**  
- `claude-python-ml`: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- `claude-rust-tauri`: Rust toolchain, Tauri v2, cross-compilation support
- `claude-nextjs`: Node.js optimized, pnpm, modern web development tools

**Layer 3: DevContainer Features**
- `claude-mcp`: Configurable MCP server installation and management
- `host-ssh-build`: SSH-based builds on host system (macOS native builds)
- `git-wrapper`: Handles worktree path transformations automatically

## Security Notice

**Important**: By default, your personal `~/.claude` directory (containing API tokens, settings, and credentials) is mounted into development containers for seamless Claude Code integration.

### Security Levels

**Personal Development (Default):**
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

**Team Development (Recommended):**
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

**Maximum Security:**
```json
{
  "mounts": [
    // No .claude mounting
  ]
}
```

**📖 See [SECURITY.md](docs/SECURITY.md) for comprehensive security guidance and configuration options.**

## CLI Commands Reference

```bash
# Core operations
cdc init [--stack <name>]        # Initialize DevContainer
cdc compose <template>           # Initialize multi-service setup
cdc wt <name>                   # Create worktree (⚠️ REQUIRED for worktrees)

# Management  
cdc cleanup <name>              # Clean specific worktree
cdc cleanup --merged            # Clean merged branches
cdc cleanup --interactive       # Interactive cleanup
cdc stacks                      # List available stacks
cdc services                    # List multi-service templates

# Configuration
cdc check                       # Analyze existing DevContainer
cdc migrate                     # Upgrade to latest features
cdc detect                      # Detect project type
```

## Documentation

### Setup & Usage
- **📋 [SETUP.md](SETUP.md)** - Comprehensive installation and build guide
- **🚀 [USAGE.md](USAGE.md)** - Advanced usage patterns and worktree workflows  
- **🔧 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### Configuration & Security
- **🔒 [SECURITY.md](docs/SECURITY.md)** - Security configurations and best practices
- **🔌 [MCP_SERVERS.md](MCP_SERVERS.md)** - Configure MCP servers for your workflow

### Development
- **🤝 [CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and contribution guide
- **🏗️ [Custom Images Guide](docs/custom-images/README.md)** - Creating custom Docker images

## Key Features

### Git Worktree Integration
- **CLI Worktree Creation**: `cdc wt feature-name` or `wt feature-name`
- **Automatic DevContainer Setup**: Proper mount paths and environment variables
- **Intelligent Cleanup**: Post-merge hooks and manual cleanup tools
- **Zero Configuration**: Works seamlessly in any git repository

### Performance Optimization
- **Smart Layering**: Optimized Docker images with intelligent caching
- **Fast Startup**: Minimal container overhead
- **Resource Efficient**: Lean images without unnecessary dependencies
- **Platform Native**: Architecture-specific optimizations

### Claude Integration  
- **Persistent Authentication**: No re-login required across container restarts
- **Complete Customization**: Custom agents, commands, and settings work seamlessly
- **Zero Configuration**: Works immediately with your existing Claude setup
- **MCP Integration**: Built-in serena and context7 servers with extensible configuration

## Testing Your Setup

```bash
# 1. Verify images built
docker images | grep claude

# 2. Test CLI functionality  
cdc --version
cdc stacks

# 3. Test DevContainer generation
mkdir test-project && cd test-project
cdc init
ls -la .devcontainer/

# 4. Test in VS Code
code .  # "Dev Containers: Reopen in Container"

# 5. Test worktree functionality
cdc wt test-feature
cd ../test-project-test-feature
code .
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup instructions
- Testing guidelines  
- Pull request process
- Coding standards

## Getting Help

- **🔧 Issues**: Use `cdc check` to analyze configuration problems
- **📖 Documentation**: All guides available in project root and docs/ directory  
- **🐛 Bug Reports**: Create GitHub issues with full error details
- **💡 Feature Requests**: Discuss in GitHub issues or discussions

---

**Important**: All Docker images must be built locally. This project does not provide pre-built images on Docker Hub or other registries. You must run the build process on your machine before using any DevContainer configurations.

This project was inspired by [@VishalJ99's claude-docker](https://github.com/VishalJ99/claude-docker) work, evolved into a DevContainer-focused solution for enhanced development workflows.