# Claude DevContainer Configuration

## Overview
Claude Docker now uses DevContainers for a streamlined development experience. No manual scripts needed - just configure once and use VS Code's built-in container support.

## Core Components

### 1. DevContainer Configuration
```json
{
  "name": "Claude Development Environment",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ],
  "hostRequirements": {
    "memory": "8gb",
    "cpus": 4
  },
  "features": {
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7"
    }
  }
}
```

### 2. Automatic Setup
- Mounts your existing `~/.claude` authentication directly
- No copying or migration needed
- Works immediately with your current Claude setup
- Supports both OAuth and API key authentication

### 3. Resource Management
**Memory**: Configure via `hostRequirements.memory` in devcontainer.json
**CPU**: Configure via `hostRequirements.cpus` in devcontainer.json  
**Storage**: Direct mount of `~/.claude` for persistent authentication

## Usage Examples

### Initialize DevContainer
```bash
cdc init
```

### Resource Configuration
```json
{
  "hostRequirements": {
    "memory": "16gb",
    "cpus": 8
  }
}
```

### Multi-Service Setup
```bash
cdc init --multi-service
```

## Benefits
- ✅ **Immediate authentication** - uses your existing `~/.claude` setup
- ✅ **VS Code integration** - native devcontainer support
- ✅ **No manual scripts** - declarative configuration only
- ✅ **Worktree support** - automatic main repo mounting
- ✅ **MCP integration** - serena, context7, and other servers built-in