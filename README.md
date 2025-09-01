# Claude DevContainer Ecosystem

**Fast, isolated local development with Claude Code across multiple git worktrees, native host builds via SSH, and `--dangerously-skip-permissions` for maximum development speed.**

A comprehensive DevContainer-based development environment for local development that enables seamless multi-worktree development, containerized Claude Code with unrestricted permissions, and native host system builds through SSH integration. All Docker images are built locally on your machine.

[![Build Images](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml/badge.svg)](https://github.com/visheshd/claude-devcontainer/actions/workflows/build-images.yml)

📋 **MCP Setup Guide**: See [MCP_SERVERS.md](MCP_SERVERS.md) for customizing or adding more MCP servers

> ⚠️ **Important**: All Docker images must be built locally. This project does not provide pre-built images on Docker Hub or other registries. You must run the build process on your machine before using any DevContainer configurations.

## 🎯 Key Benefits

✅ **Native IDE Integration**: Seamless VS Code, Cursor, and compatible editor support  
✅ **Stack Optimization**: Purpose-built containers for Python ML, Rust Tauri, Next.js  
✅ **Complete Isolation**: No conflicts between different tech stacks or projects  
✅ **MCP Integration**: Built-in serena and context7 MCP servers for enhanced AI assistance  
✅ **Fast Startup**: Optimized containers with intelligent layering  
✅ **Automated Worktrees**: Git wrapper system handles worktree operations seamlessly  
✅ **Cross-Platform**: Full compatibility across Apple Silicon, Intel, and Linux  
✅ **SSH Host Builds**: Native builds on host system for optimal performance  

## 🚀 Quick Start

### 1. Build Docker Images (Required First Step)
```bash
# Build all images locally (required before first use)
chmod +x build-all-images.sh
./build-all-images.sh --rebuild
```

### 2. Install CLI Tool
```bash
# Install the CLI tool locally (one-time setup)
cd tools/claude-devcontainer
npm install
npm link
```

### 3. Create and Use DevContainer
```bash
# Create new project with DevContainer
claude-devcontainer init

# Open in VS Code
code .
# Command Palette: "Dev Containers: Reopen in Container"
```

### CLI Commands

```bash
# Initialize a new DevContainer configuration
claude-devcontainer init

# Analyze existing DevContainer configuration
claude-devcontainer check

# Upgrade existing DevContainer to latest features
claude-devcontainer migrate

# Detect project type
claude-devcontainer detect

# List available development stacks
claude-devcontainer stacks
```

## 🏗️ Architecture

### Layer 1: Base Image (Local Build)
- **claude-base**: Foundation with Claude Code + essential dev tools
- **Components**: Node.js 20, Git, SSH, oh-my-zsh, authentication setup
- **Build locally**: `./dockerfiles/claude-base/build.sh`

### Layer 2: Stack Images (Local Builds)
- **claude-python-ml**: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- **claude-rust-tauri**: Rust toolchain, Tauri v2, cross-compilation support
- **claude-nextjs**: Node.js optimized, pnpm (not npm), modern web development tools
- **Build all**: `./build-all-images.sh --rebuild`

### Layer 3: DevContainer Features
- **claude-mcp**: Configurable MCP server installation and management
- **host-ssh-build**: SSH-based builds on host system (macOS native builds)
- **git-wrapper**: Automated git worktree operations with atomic transaction support

## 📋 Available Stacks (Local Builds)

| Stack | Local Image Tag | Use Case | Key Features |
|-------|-----------------|----------|--------------|
| **Python ML** | `claude-python-ml:latest` *(local)* | AI/ML Development | Python 3.11, Jupyter, LangChain, PyTorch, Vector DBs |
| **Rust Tauri** | `claude-rust-tauri:latest` *(local)* | Desktop Apps | Rust toolchain, Tauri v2, Cross-compilation, GUI libs |
| **Next.js** | `claude-nextjs:latest` *(local)* | Web Development | Node.js, pnpm, TypeScript, Tailwind, Modern web tools |
| **Custom** | `claude-base:latest` *(local)* | General Purpose | Base environment for custom configurations |

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

### Image Architecture (All Local Builds)

```
claude-base:latest              # Foundation with Claude Code, git, build tools (local)
├── claude-python-ml:latest     # + Python 3.11, ML libraries, Jupyter (local)
├── claude-rust-tauri:latest    # + Rust toolchain, Tauri v2, GUI deps (local)
├── claude-nextjs:latest        # + Node.js, Bun, TypeScript tools (local)
└── your-custom:latest          # + Your specialized tools (local)
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

## 🚀 Features & Capabilities

### Git Worktree Integration
- **Atomic Operations**: All git worktree operations are transaction-safe
- **Automatic Setup**: DevContainers automatically configure worktree mounts
- **Cross-Platform**: Full compatibility across Apple Silicon, Intel, and Linux
- **Seamless Management**: Automated worktree detection and configuration

### Optimized Performance  
- **Smart Layering**: Optimized Docker images with intelligent caching
- **Fast Startup**: Minimal container overhead for quick development cycles
- **Resource Efficient**: Lean images without unnecessary dependencies
- **Platform Native**: Architecture-specific optimizations for your system

### DevContainer Features
- **MCP Integration**: Built-in serena and context7 servers with extensible configuration
- **Upgrade Tools**: Automated migration and configuration analysis tools
- **Stack Templates**: Pre-configured environments for Python ML, Rust Tauri, Next.js
- **Custom Extensions**: Easy customization with your own Docker images

### Claude Integration
- **User Data Mounting**: Your `~/.claude` directory automatically mounted and persistent
- **Complete Customization**: Custom agents, commands, and settings work seamlessly
- **Zero Configuration**: Works immediately with your existing Claude setup
- **Data Persistence**: Settings and project history survive container rebuilds

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

### 4. Test DevContainer Upgrade Tools
```bash
# Test configuration analysis
claude-devcontainer check

# Test upgrade functionality (if you have an older DevContainer config)
claude-devcontainer migrate --dry-run  # Preview changes
claude-devcontainer migrate           # Apply upgrades
```

### 5. Test in VS Code
```bash
# Open in VS Code
code test-project/

# Use Command Palette (Cmd/Ctrl + Shift + P):
# "Dev Containers: Reopen in Container"
# Wait for container build and Claude Code to start
```

## 📖 Documentation & Guides

- **🔌 [MCP Setup Guide](MCP_SERVERS.md)** - Configure MCP servers for your workflow
- **🔄 [Migration Guide](docs/migration-guide.md)** - Upgrade DevContainer configurations to latest features
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

## 🔧 Troubleshooting

### Common Issues

**"Error: image not found" when opening DevContainer**
```bash
# Solution: Build images first (required)
./build-all-images.sh --rebuild
```

**DevContainer fails to start with missing image**
```bash
# Verify images were built successfully
docker images | grep claude

# Expected output should show:
# claude-base          latest    ...
# claude-python-ml     latest    ... 
# claude-rust-tauri    latest    ...
# claude-nextjs        latest    ...
```

**CLI tool not found after npm link**
```bash
# Reinstall CLI tool
cd tools/claude-devcontainer
npm unlink  # if previously linked
npm install && npm link
```

**Build fails with permission errors**
```bash
# Ensure build script is executable
chmod +x build-all-images.sh
chmod +x dockerfiles/*/build.sh
```

For more help, see [Building Images Locally](#-building-images-locally) section above.

