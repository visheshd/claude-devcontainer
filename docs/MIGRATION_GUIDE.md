# Claude DevContainer Migration Guide

This guide helps you migrate from the monolithic `claude-docker` setup to the new DevContainer-based ecosystem.

## Overview

The new DevContainer approach provides:

✅ **Eliminated Complexity**: Removes ~300 lines of git worktree detection code  
✅ **Native IDE Integration**: Works seamlessly with VS Code, Cursor, and compatible editors  
✅ **Stack Optimization**: Dedicated containers for Python ML, Rust Tauri, Next.js  
✅ **Isolated Environments**: No conflicts between different tech stacks  
✅ **Preserved Functionality**: All MCP servers and SSH host builds maintained  

## Quick Migration

For the fastest migration path:

```bash
# 1. Install the CLI tool (one-time setup)
cd tools/claude-devcontainer
npm install
npm link

# 2. Navigate to your project
cd /path/to/your/project

# 3. Run the migration tool
claude-devcontainer init

# 4. Follow interactive prompts
# 5. Open in VS Code: "Dev Containers: Reopen in Container"
```

## Migration Comparison

| Feature | claude-docker | DevContainer |
|---------|---------------|--------------|
| **Setup** | Manual script execution | Native IDE integration |
| **Git Worktrees** | Complex detection logic | Native per-project containers |
| **Stack Support** | Single container for all | Optimized per-stack images |
| **IDE Integration** | External terminal | Native VS Code/Cursor |
| **Container Management** | Manual docker commands | Automatic IDE management |
| **Environment Isolation** | Shared container risks | Complete per-project isolation |

## Step-by-Step Migration

### Step 1: Analyze Current Setup

First, understand your current `claude-docker` configuration:

```bash
# Check your current MCP servers
claude mcp list

# Review environment variables
cat .env

# Note any custom build configurations
cat .claude/CLAUDE.md
```

### Step 2: Choose Your Stack

Based on your project, select the appropriate stack:

#### Python ML Projects
- **Indicators**: `requirements.txt`, `pyproject.toml`, ML imports
- **Stack**: `python-ml`
- **Includes**: Python 3.11, uv, Jupyter, LangChain, PyTorch

#### Rust Tauri Projects  
- **Indicators**: `Cargo.toml`, `src-tauri/` directory
- **Stack**: `rust-tauri`
- **Includes**: Rust toolchain, Tauri v2, cross-compilation tools

#### Next.js Projects
- **Indicators**: `package.json` with Next.js dependencies
- **Stack**: `nextjs`
- **Includes**: Node.js, Bun, pnpm, modern web tools

#### Other Projects
- **Stack**: `custom` (base Claude environment)

### Step 3: Generate Configuration

```bash
# Automatic detection and setup
claude-devcontainer init

# Or specify stack directly
claude-devcontainer init -s python-ml
```

The tool will:
1. Detect your project type
2. Suggest appropriate MCP servers
3. Configure host builds if needed
4. Generate DevContainer configuration
5. Set up Claude settings

### Step 4: Environment Variables

Migrate your `.env` file:

```bash
# Your existing .env is preserved
# Update any new variables in .env.example
cp .env.example .env.new
# Merge configurations as needed
```

### Step 5: Test the Setup

```bash
# Open in VS Code
code .

# Use Command Palette: "Dev Containers: Reopen in Container"
# Wait for container build and feature installation
# Start coding with Claude!
```

## Feature Migration

### MCP Servers

Your existing MCP server configuration is automatically migrated:

| claude-docker | DevContainer Feature |
|---------------|---------------------|
| `install-mcp-servers.sh` | `claude-mcp` feature |
| `mcp-servers.txt` | Feature `servers` option |
| Environment variables | Preserved in `.env` |

**Example Migration:**
```bash
# Old: mcp-servers.txt
claude mcp add -s user serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server
claude mcp add -s user context7 https://mcp.context7.com/sse

# New: devcontainer.json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7"
    }
  }
}
```

### SSH Host Builds

macOS native build functionality is preserved through the `host-ssh-build` feature:

| claude-docker | DevContainer Feature |
|---------------|---------------------|
| `scripts/macos_builder.py` | Enhanced version in feature |
| `scripts/setup_macos_ssh.sh` | Automatic SSH key setup |
| Manual SSH configuration | Automatic host detection |

**Migration:**
```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {
      "enableMacosBuild": true
    }
  }
}
```

### Claude Configuration

Your Claude settings are preserved:

```bash
# Existing configuration migrated
.claude/settings.json     → Preserved
.claude/CLAUDE.md        → Copied as template
.claude/.credentials.json → Automatically detected
```

## Project Structure Comparison

### Before (claude-docker)
```
my-project/
├── .env                    # Environment variables
├── .claude/               # Claude configuration
│   ├── CLAUDE.md
│   └── settings.json
└── src/                   # Your code
```

### After (DevContainer)
```
my-project/
├── .devcontainer/         # DevContainer configuration
│   └── devcontainer.json
├── .claude/              # Claude configuration (preserved)
│   ├── CLAUDE.md
│   └── settings.json
├── .env                  # Environment variables (preserved)
├── .env.example          # Environment template
└── src/                  # Your code (unchanged)
```

## Git Worktree Simplification

### Before: Complex Worktree Management
```bash
# claude-docker detected worktrees with ~300 lines of code
./src/claude-docker.sh                    # Main script
./scripts/git_utils.py                    # Worktree detection
# Complex container sharing between worktrees
```

### After: Native DevContainer Per Worktree
```bash
# Each worktree gets its own container automatically
main-repo/
├── .devcontainer/devcontainer.json       # Main branch container
└── src/

worktrees/
├── feature-branch/
│   ├── .devcontainer/devcontainer.json   # Feature branch container
│   └── src/
└── experiment/
    ├── .devcontainer/devcontainer.json   # Different stack if needed
    └── src/
```

**Benefits:**
- ✅ No worktree detection code needed
- ✅ Complete isolation between branches
- ✅ Different stacks per worktree
- ✅ Native IDE support
- ✅ Independent container lifecycles

## Common Migration Scenarios

### Scenario 1: Python ML with Twilio

**Before:**
```bash
# .env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=your_number

# mcp-servers.txt
claude mcp add -s user serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server
claude mcp add-json twilio -s user "..."
```

**After:**
```bash
npx claude-devcontainer init -s python-ml
# Select: serena, context7, langchain-tools, twilio
# .env file preserved automatically
```

### Scenario 2: Rust Tauri with macOS Builds

**Before:**
```bash
# Custom SSH setup for macOS builds
export ENABLE_MACOS_BUILDS=true
./src/claude-docker.sh --continue
```

**After:**
```bash
npx claude-devcontainer init -s rust-tauri
# Enable macOS builds when prompted
# SSH keys automatically configured
```

### Scenario 3: Multi-Project Monorepo

**Before:**
```bash
# Single container tried to support everything
./claude-docker.sh --continue
```

**After:**
```bash
# Root level - general development
npx claude-devcontainer init -s custom

# apps/web/ - Next.js specific
cd apps/web
npx claude-devcontainer init -s nextjs

# apps/desktop/ - Tauri specific  
cd apps/desktop
npx claude-devcontainer init -s rust-tauri
```

## Troubleshooting Migration

### Common Issues

#### 1. MCP Servers Not Installing
```bash
# Check environment variables
cat .env

# Manually install after container creation
claude mcp add -s user serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server
```

#### 2. SSH Host Builds Not Working
```bash
# Check SSH keys exist
ls -la ~/.ssh/id_rsa*

# Test connection
ssh -i ~/.ssh/id_rsa user@host.docker.internal "echo test"

# Enable SSH on macOS
sudo systemsetup -setremotelogin on
```

#### 3. Container Build Failures
```bash
# Clear Docker cache
docker builder prune

# Check image availability
docker pull ghcr.io/your-org/claude-base:latest
```

#### 4. Port Conflicts
```bash
# Check if ports are already in use
lsof -i :3000  # Next.js
lsof -i :8888  # Jupyter
lsof -i :1420  # Tauri

# Update devcontainer.json to use different ports
```

### Getting Help

If you encounter issues:

1. **Check logs**: Use VS Code's DevContainer logs
2. **Verify configuration**: Compare with example configurations
3. **Test components**: Use CLI detection and status commands
4. **Fallback**: Keep your old `claude-docker` setup until migration is confirmed working

## Rollback Plan

If you need to rollback:

1. **Keep original setup**: Don't delete `claude-docker.sh` until migration is confirmed
2. **Preserve .env**: Original environment variables are not modified
3. **Container cleanup**: Remove DevContainer if needed:
   ```bash
   # Remove DevContainer configuration
   rm -rf .devcontainer
   
   # Continue using claude-docker
   ./src/claude-docker.sh --continue
   ```

## Performance Comparison

| Metric | claude-docker | DevContainer |
|--------|---------------|--------------|
| **Startup Time** | ~30-60s | ~10-30s (cached) |
| **Memory Usage** | ~2-4GB | ~1-2GB per stack |
| **Disk Space** | ~5-8GB | ~2-4GB per image |
| **Build Time** | ~5-10min | ~2-5min per stack |
| **IDE Integration** | External | Native |

## Next Steps

After successful migration:

1. **Remove old setup**: Once confirmed working, clean up old files:
   ```bash
   # Archive old setup
   mkdir archive/
   mv src/ scripts/ install-mcp-servers.sh archive/
   ```

2. **Update documentation**: Update your project README with new setup instructions

3. **Team migration**: Share migration guide with team members

4. **CI/CD updates**: Update any CI/CD pipelines that used claude-docker

5. **Feedback**: Report any issues or suggestions for improvement

## Success Metrics

✅ **Container starts successfully**  
✅ **Claude Code authentication works**  
✅ **All required MCP servers are installed**  
✅ **SSH host builds function (if enabled)**  
✅ **Development workflow is faster**  
✅ **IDE integration is seamless**  

Congratulations on migrating to the Claude DevContainer ecosystem! 🎉