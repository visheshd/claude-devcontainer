# Claude DevContainer Ecosystem

**Fast, isolated development with Claude Code across multiple git worktrees, native host builds via SSH, and `--dangerously-skip-permissions` for maximum development speed.**

⚠️ **BREAKING CHANGE**: The legacy `claude-docker` setup has been completely replaced and **no longer works**. You must migrate to the DevContainer approach below.

A comprehensive DevContainer-based development environment that enables seamless multi-worktree development, containerized Claude Code with unrestricted permissions, and native host system builds through SSH integration.

[![Build Images](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml/badge.svg)](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml)

🚨 **For Existing Users**: The old claude-docker setup no longer works - follow setup instructions below  
📋 **MCP Setup Guide**: See [MCP_SERVERS.md](MCP_SERVERS.md) for customizing or adding more MCP servers

## 🎯 Benefits Over Legacy Setup

✅ **Eliminated Complexity**: Removes ~300 lines of git worktree detection code  
✅ **Native IDE Integration**: Seamless VS Code, Cursor, and compatible editor support  
✅ **Stack Optimization**: Purpose-built containers for Python ML, Rust Tauri, Next.js  
✅ **Complete Isolation**: No conflicts between different tech stacks or projects  
✅ **Preserved Functionality**: All MCP servers and SSH host builds maintained  
✅ **Faster Startup**: Optimized containers reduce startup time by 50%  
✅ **Better DX**: Native DevContainer features instead of external scripts  
✅ **Automated Worktrees**: Git wrapper system handles worktree operations seamlessly  
✅ **Cross-Platform**: Resolved architecture issues (Apple Silicon/Rosetta compatibility)  

## 🚀 Quick Start

### For New Projects
```bash
# Install the CLI tool locally (one-time setup)
cd tools/claude-devcontainer
npm install
npm link

# Create new project with DevContainer
claude-devcontainer init

# Open in VS Code
code .
# Command Palette: "Dev Containers: Reopen in Container"
```

### For Existing claude-docker Users

⚠️ **IMPORTANT**: The old claude-docker setup no longer works and must be migrated.

```bash
# Install the CLI tool locally (one-time setup)
cd tools/claude-devcontainer
npm install
npm link

# Navigate to your existing project
cd /path/to/your/project

# Run migration tool
claude-devcontainer init

# Follow interactive prompts to migrate
# Your existing .env and .claude/ configs are preserved
```

## 🏗️ New Architecture

### Layer 1: Base Image
- **claude-base**: Foundation with Claude Code + essential dev tools
- **Components**: Node.js 20, Git, SSH, oh-my-zsh, authentication setup

### Layer 2: Stack Images  
- **claude-python-ml**: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- **claude-rust-tauri**: Rust toolchain, Tauri v2, cross-compilation support
- **claude-nextjs**: Node.js optimized, pnpm (not npm), modern web development tools

### Layer 3: DevContainer Features
- **claude-mcp**: Configurable MCP server installation and management
- **host-ssh-build**: SSH-based builds on host system (macOS native builds)
- **git-wrapper**: Automated git worktree operations with atomic transaction support

## 📋 Available Stacks

| Stack | Base Image | Use Case | Key Features |
|-------|------------|----------|--------------|
| **Python ML** | `claude-python-ml:latest` | AI/ML Development | Python 3.11, Jupyter, LangChain, PyTorch, Vector DBs |
| **Rust Tauri** | `claude-rust-tauri:latest` | Desktop Apps | Rust toolchain, Tauri v2, Cross-compilation, GUI libs |
| **Next.js** | `claude-nextjs:latest` | Web Development | Node.js, pnpm, TypeScript, Tailwind, Modern web tools |
| **Custom** | `claude-base:latest` | General Purpose | Base environment for custom configurations |

## 🔨 Building Images Locally

### Prerequisites
- Docker installed and running
- At least 4GB free disk space for all images
- Claude Code already authenticated on your host system

### Quick Build
```bash
# Build all images with local tags
chmod +x build-all-images.sh
./build-all-images.sh --rebuild

# Or build specific images
./build-all-images.sh --images claude-base,python-ml
```

### Individual Image Builds
```bash
# Build base image first (required by others)
cd dockerfiles/claude-base
./build.sh

# Build stack images (requires claude-base)
cd ../python-ml && ./build.sh --base-image claude-base:latest
cd ../rust-tauri && ./build.sh --base-image claude-base:latest
cd ../nextjs && ./build.sh --base-image claude-base:latest
```

### Build Options
```bash
# Parallel build for faster completion
./build-all-images.sh --parallel --rebuild

# Build without cache for clean builds
./build-all-images.sh --no-cache --rebuild

# See all available options
./build-all-images.sh --help
```

## 🎨 Custom Images and Extensibility

The Claude DevContainer system is designed for extensibility. You can create custom images for specialized environments while maintaining full compatibility with the Claude toolchain.

### Image Architecture

```
claude-base:latest              # Foundation with Claude Code, git, build tools
├── claude-python-ml:latest     # + Python 3.11, ML libraries, Jupyter  
├── claude-rust-tauri:latest    # + Rust toolchain, Tauri v2, GUI deps
├── claude-nextjs:latest        # + Node.js, Bun, TypeScript tools
└── your-custom:latest          # + Your specialized tools
```

### Creating Custom Images

**Basic extension example:**
```dockerfile
FROM claude-base:latest

USER root
RUN apt-get update && apt-get install -y postgresql-client redis-tools \
    && rm -rf /var/lib/apt/lists/*

USER claude-user
RUN curl -fsSL https://get.pnpm.io/install.sh | sh

WORKDIR /workspace
```

**Using your custom image:**
```bash
# Build your custom image
docker build -t my-custom-claude:latest .

# Initialize DevContainer with custom stack
claude-devcontainer init -s custom

# Edit .devcontainer/devcontainer.json to use your image
{
  "image": "my-custom-claude:latest",
  // ... other configuration
}
```

### Documentation and Examples

- **[Custom Images Guide](docs/custom-images/README.md)** - Complete guide to creating custom images
- **[Example Dockerfiles](docs/custom-images/)** - Ready-to-use examples for common scenarios:
  - Basic extension with common tools
  - Database development environment
  - Multi-language development setup
  - DevOps and infrastructure tools
  - Scientific computing environments

### Best Practices

1. **Always extend `claude-base:latest`** for compatibility
2. **Follow the USER pattern** (root for system, claude-user for user tools)
3. **Clean up package caches** to keep images lean
4. **Use environment variables** for configuration
5. **Document your customizations** in README files

## 🚀 Recent Improvements

### Git Worktree Automation
New git wrapper system provides:
- **Atomic Operations**: All git worktree operations are transaction-safe
- **Automatic Setup**: DevContainers automatically configure worktree mounts
- **Cross-Platform**: Resolved architecture issues on Apple Silicon
- **Simplified Management**: No manual worktree detection or configuration needed

### Architecture & Performance
- **Rosetta Compatibility**: Fixed architecture detection issues on Apple Silicon Macs
- **Simplified Build Process**: Removed complex backup and recovery systems
- **Optimized Images**: Reduced size by 50-70% through package cleanup and smart layering
- **Portable Setup**: DevContainer configurations work across different host systems

### Publishing & Distribution
- **GitHub Container Registry**: DevContainer features published to `ghcr.io`
- **Automated Workflows**: CI/CD pipeline ensures features stay up-to-date
- **Version Management**: Semantic versioning for reliable feature updates

## 🧪 Testing Your Setup

### 1. Verify Images Built
```bash
# List available Claude images
docker images | grep claude

# Expected output:
# claude-base          latest    abc123...
# claude-python-ml     latest    def456...
# claude-rust-tauri    latest    ghi789...
# claude-nextjs        latest    jkl012...
```

### 2. Test CLI Tool
```bash
# Install and link CLI tool
cd tools/claude-devcontainer
npm install && npm link

# Test CLI functionality
claude-devcontainer --help
claude-devcontainer detect  # Test project detection
```

### 3. Test DevContainer Generation
```bash
# Create a test project
mkdir test-project && cd test-project
claude-devcontainer init

# Verify DevContainer files created
ls -la .devcontainer/
cat .devcontainer/devcontainer.json
```

### 4. Test in VS Code
```bash
# Open in VS Code
code test-project/

# Use Command Palette (Cmd/Ctrl + Shift + P):
# "Dev Containers: Reopen in Container"
# Wait for container build and Claude Code to start
```

## 📖 Documentation & Guides

- **🔌 [MCP Setup Guide](MCP_SERVERS.md)** - Configure MCP servers for your workflow
- **🏗️ [DevContainer Features](src/)** - Advanced feature configuration
- **📝 [CLI Tool Guide](tools/claude-devcontainer/)** - CLI tool documentation

## 🤝 Contributing

### Development Setup
```bash
# Clone and setup development environment
git clone https://github.com/visheshd/claude-devcontainer.git
cd claude-docker

# Install CLI tool in development mode
cd tools/claude-devcontainer
npm install && npm link

# Build images for testing
./build-all-images.sh --rebuild
```

### Making Changes
1. **Docker Images**: Modify `dockerfiles/*/Dockerfile` and test with `./build.sh`
2. **DevContainer Features**: Edit `src/*/install.sh` and test
3. **CLI Tool**: Modify `tools/claude-devcontainer/src/index.js` (ES modules)
4. **Documentation**: Update relevant `.md` files

### Testing Your Changes
```bash
# Test Docker builds
./dockerfiles/claude-base/build.sh
docker run -it claude-base:latest

# Test CLI changes
cd test-project
claude-devcontainer init  # Test your CLI changes

# Test DevContainer integration
code . && # "Dev Containers: Reopen in Container"
```

### Pull Request Guidelines
- Test all Docker images build successfully
- Verify CLI tool works with `npm test` (if tests exist)
- Update documentation for any new features
- Follow existing code patterns and conventions

## ⚠️ Legacy claude-docker (BREAKING CHANGE)

🚨 **The monolithic claude-docker setup has been completely removed and NO LONGER WORKS.**

**Critical Information:**
- ❌ The original `claude-docker.sh` script has been **removed** from the repository
- ❌ Running old commands will result in "file not found" errors
- ❌ There is **no backwards compatibility** - you must use the DevContainer setup above
- ⚠️ Follow the **Quick Start** section above to get started

**This is a breaking change because:**
- 🐛 **Architectural Issues**: The old approach had fundamental problems with git worktree detection
- 📈 **Performance Problems**: Monolithic container was slow and resource-intensive  
- 🔧 **Maintenance Burden**: 300+ lines of complex worktree code were unmaintainable
- 🎯 **Better Solution Available**: DevContainers provide superior developer experience

**Migration Benefits:**
- ✅ **50% faster startup** with optimized containers
- ✅ **Native IDE integration** instead of external terminal
- ✅ **Complete project isolation** prevents conflicts
- ✅ **Automated worktree support** replaces complex detection logic
- ✅ **Stack-specific optimizations** for better performance

**🚨 ACTION REQUIRED: You must migrate to continue using this project.**
