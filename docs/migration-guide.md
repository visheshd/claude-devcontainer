# Migration Guide

As the Claude DevContainer system evolves with new features, improvements, and optimizations, existing repositories need a way to upgrade their DevContainer configurations to take advantage of the latest capabilities. This guide shows you how to migrate any existing DevContainer setup to incorporate the newest enhancements.

## What This Migration Does

The migration tool automatically analyzes your current `.devcontainer/devcontainer.json` configuration and applies updates to bring it in line with the latest Claude DevContainer standards. Whether your project was created months ago or you're upgrading from an older version, this tool ensures you get all the latest improvements without losing your customizations.

## Overview of Recent Improvements

The Claude DevContainer system has evolved to provide better developer experience with:

- **Universal Worktree Detection** - Automatic support for both main repositories and git worktrees without manual configuration
- **Git Wrapper Integration** - Seamless git operations across worktree boundaries with automatic path translation
- **Automatic `.claude` directory mounting** for user customizations and preferences
- **Integrated MCP (Model Context Protocol) servers** (serena and context7) for enhanced AI assistance
- **Updated base images** with improved tooling and performance optimizations
- **Better VS Code extension management** with automatic Claude Code extension inclusion
- **Enhanced security and reliability** through updated dependencies and configurations
- **Template Inheritance System** - Single source of truth for universal features
- **Improved startup performance** and resource utilization

## Migration Process

### Automated Migration

The easiest way to migrate is using our automated migration tool:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the migration tool
npx claude-devcontainer migrate

# Or check what would be changed first
npx claude-devcontainer check
```

The migration tool will:
1. Analyze your current configuration
2. Detect issues and missing features
3. Show you a preview of changes
4. Create backups before making changes
5. Apply the migration with your approval

### Manual Migration

If you prefer to migrate manually, follow these steps:

#### 1. Update Image References

**Old:**
```json
{
  "name": "My Project",
  "image": "claude-docker:latest"
}
```

**New:**
```json
{
  "name": "My Project", 
  "image": "claude-base:latest"
}
```

For Next.js projects, use `claude-nextjs:latest` instead.

#### 2. Add .claude Directory Mount

Add the `.claude` directory mount to enable user customizations:

**Old:**
```json
{
  "mounts": [
    "source=/my/custom/path,target=/workspace/data,type=bind"
  ]
}
```

**New:**
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind",
    "source=/my/custom/path,target=/workspace/data,type=bind"
  ]
}
```

#### 3. Add MCP Servers Feature

Enable MCP servers for enhanced AI capabilities:

**Old:**
```json
{
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  }
}
```

**New:**
```json
{
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7"
    }
  }
}
```

#### 4. Ensure Claude Code Extension

Make sure the Claude Code extension is included:

**Old:**
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-vscode.vscode-json"
      ]
    }
  }
}
```

**New:**
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "ms-python.python", 
        "ms-vscode.vscode-json"
      ]
    }
  }
}
```

#### 5. Add Universal Worktree Detection (New!)

Enable automatic worktree detection and git wrapper functionality:

**Old:**
```json
{
  "name": "My Project",
  "image": "claude-base:latest",
  "postCreateCommand": "npm install"
}
```

**New:**
```json
{
  "name": "My Project",
  "image": "claude-base:latest", 
  "initializeCommand": ".devcontainer/setup-worktree-mounts.sh",
  "postCreateCommand": "npm install && .devcontainer/configure-git-wrapper.sh",
  "containerEnv": {
    // Populated automatically by worktree detection:
    // "WORKTREE_DETECTED": "true/false",
    // "WORKTREE_HOST_MAIN_REPO": "/path/to/main",
    // "WORKTREE_CONTAINER_MAIN_REPO": "/main-repo", 
    // "WORKTREE_NAME": "branch-name"
  }
}
```

The migration will automatically copy the required scripts (`setup-worktree-mounts.sh` and `configure-git-wrapper.sh`) to your `.devcontainer/` directory.

## Migration Examples

### Example 1: Basic Legacy Configuration

**Before:**
```json
{
  "name": "Python Project",
  "image": "claude-docker:latest",
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python"]
    }
  }
}
```

**After:**
```json
{
  "name": "Python Project", 
  "image": "claude-base:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ],
  "features": {
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "ms-python.python"
      ]
    }
  }
}
```

### Example 2: Next.js Project with Custom Mounts

**Before:**
```json
{
  "name": "Next.js App",
  "image": "claude-docker:latest", 
  "mounts": [
    "source=${localEnv:HOME}/project-data,target=/workspace/data,type=bind"
  ],
  "forwardPorts": [3000, 8080],
  "customizations": {
    "vscode": {
      "extensions": [
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

**After:**
```json
{
  "name": "Next.js App",
  "image": "claude-nextjs:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind",
    "source=${localEnv:HOME}/project-data,target=/workspace/data,type=bind"
  ],
  "forwardPorts": [3000, 8080],
  "features": {
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "bradlc.vscode-tailwindcss", 
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

### Example 3: Complex Configuration with Features

**Before:**
```json
{
  "name": "Full Stack Project",
  "image": "claude-docker:latest",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "mounts": [
    "source=${localEnv:HOME}/ssh,target=/home/claude-user/.ssh,type=bind",
    "source=${localEnv:HOME}/aws,target=/home/claude-user/.aws,type=bind"
  ],
  "containerEnv": {
    "NODE_ENV": "development",
    "API_URL": "http://localhost:8080"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "ms-python.python",
        "hashicorp.terraform"
      ]
    }
  }
}
```

**After:**
```json
{
  "name": "Full Stack Project",
  "image": "claude-base:latest", 
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
      "servers": "serena,context7"
    }
  },
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind",
    "source=${localEnv:HOME}/ssh,target=/home/claude-user/.ssh,type=bind",
    "source=${localEnv:HOME}/aws,target=/home/claude-user/.aws,type=bind"
  ],
  "containerEnv": {
    "NODE_ENV": "development",
    "API_URL": "http://localhost:8080"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "ms-vscode.vscode-typescript-next",
        "ms-python.python",
        "hashicorp.terraform"
      ]
    }
  }
}
```

## Validation

After migration, you can validate your configuration:

```bash
# Check if migration was successful
npx claude-devcontainer check

# Test the container
code . # Opens in DevContainer
```

### What to Verify

1. **Claude Code extension loads properly**
2. **MCP servers are available** (check terminal for serena/context7 commands)
3. **.claude directory is mounted** (check `/home/claude-user/.claude` exists)
   - ⚠️ **Security Note**: Migration uses full mount by default (exposes all personal data)
   - 💡 **Consider switching** to selective mounting for better security (see below)
   - See [Security Guide](SECURITY.md) for mounting strategies and examples
4. **Your custom mounts and settings are preserved**
5. **All your custom extensions still work**

## Rollback

If something goes wrong, the migration tool creates automatic backups:

```bash
# Restore from backup
npx claude-devcontainer rollback

# Or manually restore from backup files in .devcontainer/backups/
```

## Troubleshooting

### Common Issues

1. **Image pull fails**: Make sure you have access to the new image repositories
2. **Extensions don't load**: Clear VS Code extension cache and restart
3. **MCP servers not working**: Check container logs for startup errors
4. **Custom mounts missing**: Verify paths exist on host system

### Getting Help

- Check the [main documentation](./README.md)
- Report issues on [GitHub](https://github.com/visheshd/claude-devcontainer/issues)
- Join our [Discord community](https://discord.gg/claude-devcontainer)

## Benefits After Migration

After successful migration, you'll have:

✅ **Enhanced AI Integration**: MCP servers provide better code analysis and assistance  
✅ **User Customizations**: .claude directory allows persistent user preferences
   - ⚠️ **Privacy Impact**: Personal Claude Code data is now mounted in containers
   - 💡 **Tip**: Consider upgrading to selective mounting for better security
   - See [Security Guide](SECURITY.md) for three mounting strategies and migration examples  
✅ **Updated Tooling**: Latest base images with improved development tools  
✅ **Better Performance**: Optimized container startup and resource usage  
✅ **Future Compatibility**: Ready for upcoming Claude DevContainer features

## Post-Migration Security Upgrade

### Switch to Selective Mounting (Recommended for Teams)

After migration, your DevContainer uses **full mounting** by default, which exposes all personal data. For better security in team environments, consider upgrading to **selective mounting**:

#### 1. Edit your `devcontainer.json`
Replace the full mount:
```json
{
  "mounts": [
    // Replace this (full mount):
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

With selective mounting:
```json
{
  "mounts": [
    // Safe customizations only:
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

#### 2. Rebuild Container
```bash
# Rebuild container with new mount configuration
# Command Palette > "Dev Containers: Rebuild Container"
```

#### Benefits of Selective Mounting
- ✅ **Keep**: Personal commands, UI preferences, safe settings
- 🔒 **Protect**: API tokens, credentials, chat history, MCP configs
- 🤖 **Maintain**: Default MCP servers (serena, context7) still work

See [Security Guide](SECURITY.md) for complete details and more mounting options.