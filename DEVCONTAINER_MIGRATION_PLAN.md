# Claude DevContainer Migration Plan

## Overview
Migrate from the current claude-docker single-container approach to a DRY DevContainer ecosystem that supports multiple tech stacks while eliminating git worktree complexity.

## Current State Analysis

### What Works Well
- Comprehensive MCP server integration (Serena, Context7, GitHub)
- Native macOS build support via SSH
- Project type detection for multiple stacks
- Authenticated Claude Code environment

### What Can Be Simplified
- Git worktree detection logic (~200 lines of complex code)
- Single container trying to support all stacks
- Manual container management vs IDE-native DevContainers

## Proposed Architecture

### Layer 1: Core Base Image
**Target**: `ghcr.io/your-org/claude-base:latest`
- Merge best practices from claude-code and claude-docker Dockerfiles
- Foundation: `node:20` + essential dev tools
- Core components:
  - Claude Code installation
  - Git, GitHub CLI, git-delta
  - Zsh with oh-my-zsh setup
  - User management (node user with sudo)
  - Command history persistence
  - SSH client for host builds

### Layer 2: Stack-Specific Images
**Python ML**: `ghcr.io/your-org/claude-python-ml:latest`
- Python 3.11+ with uv package manager
- ML libraries (numpy, pandas, pytorch/tensorflow base)
- LangChain/LangGraph ecosystem
- Jupyter notebook support

**Rust Tauri**: `ghcr.io/your-org/claude-rust-tauri:latest`
- Rust toolchain (stable + nightly)
- Tauri v2 system dependencies
- GUI development libraries
- Cross-compilation tools

**Next.js**: `ghcr.io/your-org/claude-nextjs:latest`
- Node.js 20 optimized for web development
- Bun and pnpm support
- Common web development tools

### Layer 3: DevContainer Features
**MCP Management**: `claude-mcp`
- Configurable MCP server installation
- Stack-specific server recommendations

**Host Build Integration**: `host-ssh-build`
- SSH key management for macOS builds
- Build command forwarding
- Project type detection

**Stack Features**: Language/framework specific enhancements

## Implementation Phases

### Phase 1: Core Base Image (2-3 days)
1. Create `claude-base` Dockerfile merging best practices
2. Set up automated builds and registry publishing
3. Test core functionality (Claude Code + MCP servers)

### Phase 2: Stack Images (2-3 days)
1. Create Python-ML, Rust-Tauri, Next.js variants
2. Optimize each for their respective ecosystems
3. Validate stack-specific tooling works correctly

### Phase 3: DevContainer Features (3-4 days)
1. Build reusable DevContainer features
2. Create feature documentation and examples
3. Test feature composition across different stacks

### Phase 4: Migration Tooling (1-2 days)
1. CLI tool for generating devcontainer configs
2. Migration guide from current claude-docker setup
3. Template repository examples

### Phase 5: Documentation & Examples (1-2 days)
1. Complete setup documentation
2. Example repositories for each stack
3. Migration guide for existing projects

## Benefits of This Approach

### Simplified Architecture
- **Remove Git Worktree Complexity**: Each worktree gets its own container
- **Eliminate ~200 lines** of worktree detection code
- **Native IDE Integration**: Works seamlessly with VS Code, Cursor, etc.

### Better Developer Experience
- **Stack Optimization**: Each image optimized for specific use case
- **Faster Startup**: Smaller, focused containers
- **Isolated Environments**: No stack conflicts between projects

### Maintained Capabilities
- **SSH Host Builds**: Continue to work, now per-container
- **MCP Server Ecosystem**: Maintained and enhanced
- **Authentication**: Claude credentials persist across restarts

## Migration Strategy

### For Existing claude-docker Users
1. **Gradual Migration**: Can run both systems in parallel
2. **Project-by-Project**: Migrate repositories individually
3. **Configuration Reuse**: Existing `.env` and build configs transfer

### For New Projects
1. **Template Generation**: `claude-devcontainer init --stack python-ml`
2. **Quick Start**: Git clone + container rebuild = ready to code
3. **Stack Switching**: Different branches can use different stacks

## Git Worktrees + DevContainers

### How It Simplifies Architecture
With DevContainers, **each worktree gets its own container instance**, eliminating the need for complex worktree detection:

```
main-repo/
├── .devcontainer/devcontainer.json    # Main branch (Next.js)
├── src/
└── ...

worktrees/
├── python-experiment/
│   ├── .devcontainer/devcontainer.json    # Python ML stack
│   ├── src/
│   └── ...
└── rust-rewrite/
    ├── .devcontainer/devcontainer.json    # Rust Tauri stack
    ├── src/
    └── ...
```

### Code Simplification
**Remove Complex Logic:**
- `scripts/git_utils.py` - Git worktree detection
- Worktree detection in `claude-docker.sh:47-83`
- Worktree-aware config loading in `macos_builder.py`
- Complex `.env` inheritance between worktrees

**Each Worktree Benefits:**
- Complete isolation
- Different tech stacks per branch
- Independent container lifecycles
- Native IDE support (VS Code treats each as separate project)

## Example DevContainer Configurations

### Python LangChain Project
```json
{
  "name": "LangChain AI Project",
  "image": "ghcr.io/your-org/claude-python-ml:latest",
  
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": ["langchain-tools", "vector-db", "anthropic-api"]
    },
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {}
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "ms-python.python", 
        "ms-toolsai.jupyter"
      ]
    }
  },
  
  "postCreateCommand": "uv sync"
}
```

### Tauri Desktop Project
```json
{
  "name": "Tauri Desktop App",
  "image": "ghcr.io/your-org/claude-rust-tauri:latest",
  
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": ["rust-analyzer", "tauri-tools"]
    },
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {
      "enableMacosBuild": true
    }
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "rust-lang.rust-analyzer",
        "tauri-apps.tauri-vscode"
      ]
    }
  }
}
```

### Next.js Web Project
```json
{
  "name": "Next.js Web App",
  "image": "ghcr.io/your-org/claude-nextjs:latest",
  
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": ["web-dev-tools", "nextjs-tools"]
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
  },
  
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```

## Monorepo Support

### Workspace-Aware Detection
For monorepos with multiple stacks, DevContainers can:

1. **Root-Level Configuration**: Single devcontainer for the entire monorepo
2. **Workspace-Specific**: Different devcontainers for each workspace/service
3. **Context Switching**: Use VS Code workspace features to switch between contexts

### Example Monorepo Structure
```
monorepo/
├── .devcontainer/
│   ├── devcontainer.json           # Root: Multi-stack support
│   └── docker-compose.yml          # Services for databases, etc.
├── apps/
│   ├── web/.devcontainer/          # Next.js specific
│   └── desktop/.devcontainer/      # Tauri specific  
├── services/
│   ├── api/.devcontainer/          # Python API specific
│   └── ml/.devcontainer/           # Python ML specific
└── packages/
    └── shared/                     # Shared libraries
```

## Success Metrics
- **Reduce setup complexity**: Fewer manual steps from clone to development
- **Faster development environment startup**: Optimized containers for each stack
- **Better IDE integration**: Native DevContainer support in modern editors
- **Simplified maintenance**: Fewer edge cases and worktree-specific bugs
- **Broader ecosystem adoption**: Standard DevContainer approach attracts more users

## Timeline
- **Phase 1-2 (Core + Stack Images)**: 4-6 days
- **Phase 3 (DevContainer Features)**: 3-4 days  
- **Phase 4-5 (Tooling + Docs)**: 2-3 days
- **Total Effort**: 10-14 days for complete ecosystem
- **MVP**: 5-7 days for core functionality
- **Full Migration**: Additional 2-3 weeks for ecosystem adoption

## Risk Mitigation
- **Parallel Development**: Keep existing claude-docker working during migration
- **Gradual Rollout**: Migrate one stack/project type at a time
- **Documentation**: Comprehensive migration guides and troubleshooting
- **Community Feedback**: Early testing with power users before general release
- **Rollback Plan**: Maintain current system until new approach is proven stable