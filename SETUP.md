# Setup Guide

Comprehensive installation and build instructions for Claude DevContainer.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Building Images](#building-images)
- [Initial Configuration](#initial-configuration)
- [Testing Your Setup](#testing-your-setup)
- [Development Setup](#development-setup)

## Prerequisites

### Required Software
- **Docker**: Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- **Node.js**: Version 16+ for the CLI tool
- **Git**: For worktree operations
- **VS Code**: Recommended editor with DevContainer extension
- **Claude Code**: Already authenticated on your host system

### System Requirements
- **Memory**: 8GB+ RAM (16GB recommended for ML workloads)
- **Storage**: 2-4GB free space per stack
- **Architecture**: Apple Silicon, Intel x64, or Linux x64

### Verify Prerequisites

```bash
# Check Docker
docker --version
docker info

# Check Node.js
node --version
npm --version

# Check Git
git --version

# Check Claude Code authentication
ls ~/.claude/
```

## Installation

### 1. Install CLI Tool

```bash
# Clone the repository (if not already done)
git clone https://github.com/visheshd/claude-devcontainer.git
cd claude-docker

# Install the CLI tool
cd tools/claude-devcontainer
npm install
npm link

# Verify installation
claude-devcontainer --help
cdc --help  # Short alias
wt --help   # Standalone worktree command
```

### 2. Available Commands After Installation

```bash
claude-devcontainer    # Full command name
cdc                   # Short alias (recommended)
wt                    # Standalone worktree command
```

## Building Images

> **Important**: All Docker images must be built locally. This project does not provide pre-built images.

### Strategy 1: Build Only What You Need (Recommended)

Save time and disk space by building only the stacks you'll use:

```bash
# Make build script executable
chmod +x build-all-images.sh

# Python ML development (~2GB total)
./build-all-images.sh --images claude-base,python-ml

# Next.js web development (~1.5GB total)
./build-all-images.sh --images claude-base,nextjs

# Rust Tauri desktop apps (~2.5GB total)
./build-all-images.sh --images claude-base,rust-tauri
```

### Strategy 2: Build All Images

If you plan to work with multiple stacks:

```bash
# Build all images (~4GB total)
./build-all-images.sh --rebuild
```

### Advanced Build Options

```bash
# Parallel builds (faster on multi-core systems)
./build-all-images.sh --parallel --rebuild

# Clean builds (no cache)
./build-all-images.sh --no-cache --rebuild

# See all available options
./build-all-images.sh --help
```

### Individual Image Builds

For fine-grained control:

```bash
# Build base image first (required by others)
cd dockerfiles/claude-base
./build.sh

# Build specific stack images (requires claude-base)
cd ../python-ml
./build.sh --base-image claude-base:latest

cd ../nextjs  
./build.sh --base-image claude-base:latest

cd ../rust-tauri
./build.sh --base-image claude-base:latest
```

### Available Images After Build

| Image | Size | Purpose |
|-------|------|---------|
| `claude-base:latest` | ~800MB | Foundation with Claude Code + dev tools |
| `claude-python-ml:latest` | ~2GB | Python 3.11, ML libraries, Jupyter, LangChain |
| `claude-rust-tauri:latest` | ~2.5GB | Rust toolchain, Tauri v2, GUI dependencies |  
| `claude-nextjs:latest` | ~1.5GB | Node.js, pnpm, TypeScript, modern web tools |

### Verify Images Built Successfully

```bash
# List all Claude images
docker images | grep claude

# Expected output:
# claude-base          latest    abc123...
# claude-python-ml     latest    def456... (if built)
# claude-nextjs        latest    ghi789... (if built)
# claude-rust-tauri    latest    jkl012... (if built)
```

## Initial Configuration

### 1. Detect Your Project Type

```bash
# Navigate to your project directory
cd /path/to/your/project

# Auto-detect project type
cdc detect

# See available stacks
cdc stacks
```

### 2. Initialize DevContainer

**Option A: Single Container Setup**
```bash
# Initialize with automatic stack detection
cdc init

# Or specify stack explicitly
cdc init --stack python-ml
cdc init --stack nextjs  
cdc init --stack rust-tauri
cdc init --stack custom
```

**Option B: Multi-Service Setup**
```bash
# See available multi-service templates
cdc services

# Initialize with specific template
cdc compose web-db               # Next.js + PostgreSQL + Redis
cdc compose python-ml-services   # Python ML + Vector DB + Redis
cdc compose fullstack-nextjs     # Complete full-stack setup
```

### 3. Configure Security (Important)

By default, your personal `~/.claude` directory is mounted for seamless authentication. Choose your security level:

**Recommended for Teams: Selective Mount**
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

**Personal Development: Full Mount** (default)
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

**Maximum Security: No Mount**
```json
{
  "mounts": [
    // Remove .claude mounting
  ]
}
```

See [SECURITY.md](SECURITY.md) for detailed explanations.

## Testing Your Setup

### 1. Test DevContainer Generation

```bash
# Create test project
mkdir test-claude-devcontainer
cd test-claude-devcontainer

# Initialize DevContainer
cdc init

# Verify files created
ls -la .devcontainer/
cat .devcontainer/devcontainer.json
```

### 2. Test in VS Code

```bash
# Open in VS Code
code .

# Use Command Palette (Cmd/Ctrl + Shift + P):
# "Dev Containers: Reopen in Container"

# Wait for container to start and Claude Code to initialize
```

### 3. Test Claude Code Inside Container

Once inside the container:

```bash
# Test Claude Code is working
claude --version

# Test MCP servers are available
claude mcp list
```

### 4. Test Worktree Functionality

```bash
# Create a feature worktree (from main project)
cdc wt test-feature

# Navigate to worktree
cd ../your-project-test-feature

# Open in VS Code
code .
# "Dev Containers: Reopen in Container"
```

## Development Setup

For contributing to Claude DevContainer itself:

### 1. Development Environment

```bash
# Clone for development
git clone https://github.com/visheshd/claude-devcontainer.git
cd claude-docker

# Install CLI tool in development mode
cd tools/claude-devcontainer
npm install && npm link

# Build all images for testing
./build-all-images.sh --rebuild
```

### 2. Test Development Changes

```bash
# Test Docker builds
cd dockerfiles/claude-base
./build.sh
docker run -it claude-base:latest

# Test CLI changes
cd test-project
cdc init  # Test your CLI modifications

# Test DevContainer integration
code . && # "Dev Containers: Reopen in Container"
```

### 3. Development Workflow

1. **Docker Images**: Modify `dockerfiles/*/Dockerfile` and test with `./build.sh`
2. **DevContainer Features**: Edit `src/*/install.sh` and test
3. **CLI Tool**: Modify `tools/claude-devcontainer/src/index.js` (ES modules)
4. **Documentation**: Update relevant `.md` files

## Common Build Issues

### Permission Errors

```bash
# Fix script permissions
chmod +x build-all-images.sh
chmod +x dockerfiles/*/build.sh
```

### Disk Space Issues

```bash
# Clean up Docker resources
docker system prune -f
docker system df  # Check usage
```

### Platform Issues (Apple Silicon)

```bash
# Force rebuild for your architecture
./build-all-images.sh --no-cache --rebuild

# Check image architecture
docker inspect claude-base:latest | grep Architecture
```

## Next Steps

After successful setup:

1. **Read [USAGE.md](USAGE.md)** for advanced usage patterns
2. **Configure [MCP_SERVERS.md](MCP_SERVERS.md)** for additional MCP servers
3. **Review [SECURITY.md](SECURITY.md)** for security best practices
4. **See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** if you encounter issues

## Getting Help

- **Check configuration**: `cdc check`
- **Migrate old configs**: `cdc migrate` 
- **Report issues**: Include full error messages and system info
- **Documentation**: All guides available in the docs/ directory