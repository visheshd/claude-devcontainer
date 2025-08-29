# Claude DevContainer Ecosystem

A comprehensive DevContainer-based development environment for Claude Code, replacing the monolithic claude-docker approach with optimized, stack-specific containers and native IDE integration.

[![Build Images](https://github.com/your-org/claude-devcontainer/actions/workflows/build-images.yml/badge.svg)](https://github.com/your-org/claude-devcontainer/actions/workflows/build-images.yml)

📋 **Migration Guide**: See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for migrating from claude-docker  
📋 **MCP Setup Guide**: See [MCP_SERVERS.md](MCP_SERVERS.md) for customizing or adding more MCP servers

## 🎯 Benefits Over claude-docker

✅ **Eliminated Complexity**: Removes ~300 lines of git worktree detection code  
✅ **Native IDE Integration**: Seamless VS Code, Cursor, and compatible editor support  
✅ **Stack Optimization**: Purpose-built containers for Python ML, Rust Tauri, Next.js  
✅ **Complete Isolation**: No conflicts between different tech stacks or projects  
✅ **Preserved Functionality**: All MCP servers and SSH host builds maintained  
✅ **Faster Startup**: Optimized containers reduce startup time by 50%  
✅ **Better DX**: Native DevContainer features instead of external scripts  

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

### Legacy claude-docker (Deprecated)
The original claude-docker script is still available but deprecated. For new projects, use the DevContainer approach above.

## 🏗️ New Architecture

### Layer 1: Base Image
- **claude-base**: Foundation with Claude Code + essential dev tools
- **Components**: Node.js 20, Git, SSH, oh-my-zsh, authentication setup

### Layer 2: Stack Images  
- **claude-python-ml**: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- **claude-rust-tauri**: Rust toolchain, Tauri v2, cross-compilation support
- **claude-nextjs**: Node.js optimized, Bun/pnpm, modern web development tools

### Layer 3: DevContainer Features
- **claude-mcp**: Configurable MCP server installation and management
- **host-ssh-build**: SSH-based builds on host system (macOS native builds)

## 📋 Available Stacks

| Stack | Base Image | Use Case | Key Features |
|-------|------------|----------|--------------|
| **Python ML** | `claude-python-ml:latest` | AI/ML Development | Python 3.11, Jupyter, LangChain, PyTorch, Vector DBs |
| **Rust Tauri** | `claude-rust-tauri:latest` | Desktop Apps | Rust toolchain, Tauri v2, Cross-compilation, GUI libs |
| **Next.js** | `claude-nextjs:latest` | Web Development | Node.js, Bun, TypeScript, Tailwind, Modern web tools |
| **Custom** | `claude-base:latest` | General Purpose | Base environment for custom configurations |

## What This Does (Legacy claude-docker)
- **Complete AI coding agent setup** with Claude Code in an isolated Docker container
- **Pre-configured MCP servers** for maximum coding productivity:
  - **Serena** - Advanced coding agent toolkit with project indexing and symbol manipulation
  - **Context7** - Pulls up-to-date, version-specific documentation and code examples straight from the source into your prompt
  - **Twilio** - SMS notifications when long-running tasks complete (perfect for >10min jobs)
- **Git repository and worktree detection** - Automatic detection of git repositories and worktrees with environment variables
- **Native macOS build support** - SSH-based communication to execute native macOS commands (xcodebuild, swift, etc.) from the container
- **Persistent conversation history** - Resumes from where you left off, even after crashes
- **Remote work notifications** - Get pinged via SMS when tasks finish, so you can step away from your monitor
- **Simple one-command setup and usage** - Zero friction set up for plug and play integration with existing cc workflows.
- **Fully customizable** - Modify the can modify the files at `~/.claude-docker` for custom slash commands, settings and claude.md files.

## Quick Start
```bash
# 0. Assumes you claude-code and docker already installed.

# 1. Clone and enter directory
git clone https://github.com/VishalJ99/claude-docker.git
cd claude-docker

# 2. Setup environment
cp .env.example .env
nano .env  # Add your API keys (see below)

# 3. Install
./src/install.sh

# 4. Run from any project
cd ~/your-project
claude-docker

# Optional: Set up SSH keys for git push (see Prerequisites section)
# The script will show setup instructions if keys are missing
```
## Command Line Flags

Claude Docker supports several command-line flags for different use cases:

### Basic Usage
```bash
claude-docker                    # Start Claude in current directory
claude-docker --continue         # Resume previous conversation in this directory
claude-docker --rebuild          # Force rebuild Docker image
claude-docker --rebuild --no-cache  # Rebuild without using Docker cache
```

### Available Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--continue` | Resume the previous conversation in current directory | `claude-docker --continue` |
| `--rebuild` | Force rebuild of the Docker image | `claude-docker --rebuild` |
| `--no-cache` | When rebuilding, don't use Docker cache | `claude-docker --rebuild --no-cache` |
| `--memory` | Set container memory limit | `claude-docker --memory 8g` |
| `--gpus` | Enable GPU access (requires nvidia-docker) | `claude-docker --gpus all` |

### Environment Variables
You can also set defaults in your `.env` file:
```bash
DOCKER_MEMORY_LIMIT=8g          # Default memory limit
DOCKER_GPU_ACCESS=all           # Default GPU access
```

### Examples
```bash
# Resume work with 16GB memory limit
claude-docker --continue --memory 16g

# Rebuild after updating .env file
claude-docker --rebuild

# Use GPU for ML tasks
claude-docker --gpus all
```

## Prerequisites

⚠️ **IMPORTANT**: Complete these steps BEFORE using claude-docker:

### 1. Claude Code Authentication (Required)
You must authenticate Claude Code on your host system first:
```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Run and complete authentication
claude

# Verify authentication files exist
ls ~/.claude.json ~/.claude/
```

📖 **Full Claude Code Setup Guide**: https://docs.anthropic.com/en/docs/claude-code

### 2. Docker Installation (Required)
- **Docker Desktop**: https://docs.docker.com/get-docker/
- Ensure Docker daemon is running before proceeding

### 3. Git Configuration (Required)
Git configuration is automatically loaded from your host system during Docker build:
- Make sure you have configured git on your host system first:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```
- **Important**: Claude Docker will commit to your current branch - make sure you're on the correct branch before starting

### 4. SSH Keys for Git Push (Optional - for push/pull operations)
Claude Docker uses dedicated SSH keys (separate from your main SSH keys for security):

**Setup SSH keys:**
```bash
# 1. Create directory for Claude Docker SSH keys
mkdir -p ~/.claude-docker/ssh

# 2. Generate SSH key for Claude Docker
ssh-keygen -t rsa -b 4096 -f ~/.claude-docker/ssh/id_rsa -N ''

# 3. Add public key to GitHub
cat ~/.claude-docker/ssh/id_rsa.pub
# Copy output and add to: GitHub → Settings → SSH and GPG keys → New SSH key

# 4. Test connection
ssh -T git@github.com -i ~/.claude-docker/ssh/id_rsa
```

**Why separate SSH keys?**
- ✅ **Security Isolation**: Claude can't access or modify your personal SSH keys, config, or known_hosts
- ✅ **SSH State Persistence**: The SSH directory is mounted at runtime.
- ✅ **Easy Revocation**: Delete `~/.claude-docker/ssh/` to instantly revoke Claude's git access
- ✅ **Clean Audit Trail**: All Claude SSH activity is isolated and easily traceable

**Technical Note**: We mount the SSH directory rather than copying keys because SSH operations modify several files (`known_hosts`, connection state) that must persist between container sessions for a smooth user experience.

### 5. Native macOS Build Support (Optional - for native macOS compilation)
For projects requiring native macOS builds (Xcode, Swift packages, etc.), claude-docker can execute commands directly on your macOS host via SSH:

**Setup native macOS builds:**
```bash
# 1. Enable native builds in your .env file
echo "ENABLE_MACOS_BUILDS=true" >> .env

# 2. Run the automated setup script
./scripts/setup_macos_ssh.sh

# 3. Rebuild Docker image to include new settings
claude-docker --rebuild
```

**What this enables:**
- Execute `xcodebuild` commands from within the container
- Build Swift packages natively on macOS
- Run any macOS-specific build tools
- Transparent file synchronization between container and host

**Example usage in Claude:**
```python
from macos_builder import run_build, run_dev, execute_native_command

# Use configured build commands (defined in .env)
result = run_build()      # Runs NATIVE_BUILD_COMMAND
result = run_dev()        # Runs NATIVE_DEV_COMMAND

# Or execute arbitrary macOS commands
result = execute_native_command("xcodebuild -version")
```

**Configure build commands per-project in `.env`:**
```bash
# In your-tauri-project/.env (project-specific)
NATIVE_BUILD_COMMAND=npm run tauri build
NATIVE_DEV_COMMAND=npm run tauri dev
NATIVE_TEST_COMMAND=npm run test
NATIVE_CLEAN_COMMAND=npm run clean
NATIVE_BUILD_DIR=src-tauri
NATIVE_PRE_BUILD=npm run build
```

**Each project gets its own configuration:**
```bash
cd tauri-project && claude-docker     # Uses Tauri commands
cd react-native-project && claude-docker  # Uses RN commands  
cd swift-project && claude-docker     # Uses Swift commands
```

**Then just tell Claude what you want:**
- *"run the build"* → executes project's build command
- *"start dev mode"* → executes project's dev command
- *"run tests"* → executes project's test command
- *"clean the project"* → executes project's clean command

**Security considerations:**
- Uses dedicated SSH keys (separate from your personal keys)
- SSH connection restricted to `host.docker.internal`
- Requires macOS Remote Login to be enabled
- Easy to disable by setting `ENABLE_MACOS_BUILDS=false`

### 6. Twilio Account (Optional - for SMS notifications)
If you want SMS notifications when tasks complete:
- Create free trial account: https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account
- Get your Account SID and Auth Token from the Twilio Console
- Get a phone number for sending SMS

### Why Pre-authentication?
The Docker container needs your existing Claude authentication to function. This approach:
- ✅ Uses your existing Claude subscription/API access
- ✅ Maintains secure credential handling
- ✅ Enables persistent authentication across container restarts


### Environment Variables (.env)
```bash
# SMS notifications (highly recommended!)
# Perfect for long-running tasks - step away and get notified when done
TWILIO_ACCOUNT_SID=your_twilio_sid  
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
TWILIO_TO_NUMBER=+0987654321

# Optional - Custom conda paths
CONDA_PREFIX=/path/to/your/conda
CONDA_EXTRA_DIRS="/path/to/envs /path/to/pkgs"

# Optional - System packages
SYSTEM_PACKAGES="libopenslide0 libgdal-dev"

# Optional - Native macOS Build Support
ENABLE_MACOS_BUILDS=true
MACOS_USERNAME=your_username
HOST_WORKING_DIRECTORY=/Users/username/projects/myproject
```

⚠️ **Security Note**: Credentials are baked into the Docker image. Keep your image secure!

## Features

### 🤖 Full Autonomy
- Claude runs with `--dangerously-skip-permissions` for complete access
- Can read, write, execute, and modify any files in your project
- No permission prompts or restrictions

### 🔌 Modular MCP Server Support
- Easy installation of any MCP server through `mcp-servers.txt`
- Automatic environment variable handling for MCP servers requiring API keys
- Pre-configured popular servers (Twilio, GitHub, filesystem, browser automation)
- See [MCP_SERVERS.md](MCP_SERVERS.md) for full setup guide

### 📱 SMS Notifications  
- Automatic SMS via Twilio when Claude completes tasks
- Configurable via MCP integration
- Optional - works without if Twilio not configured

### 🐍 Conda Integration
- Has access to your conda envs so do not need to add build instructions to the Dockerfile
- Supports custom conda installation directories (ideal for academic/lab environments where home is quota'd)


### 🔑 Persistence
- Login once, use forever - authentication tokens persist across sessions
- Automatic UID/GID mapping ensures perfect file permissions between host and container
- Loads history from previous chats in a given project.

### 📝 Task Execution Logging  
- Prompt engineered to generate `task_log.md` documenting agent's execution process
- Stores assumptions, insights, and challenges encountered
- Acts as a simple summary to quickly understand what the agent accomplished

### 🛠️ Shared Utility Scripts (`~/.claude-docker/scripts/`)
- **`sys_utils.py`** - Common utilities for reproducibility and git state management
  - `check_git_state_clean()` - Ensures clean git state before script execution
  - `create_reproduce_command()` - Generates reproduction commands with git hash and arguments
- Automatically available for import in Python scripts: `from sys_utils import check_git_state_clean, create_reproduce_command`
- Enforces reproducibility standards and clean execution environments

**Custom Script Development:**
- Place executable scripts in `~/.claude-docker/scripts/` to extend Claude's capabilities
- Add Python modules for shared functionality across projects
- Scripts are accessible as commands in both host terminal and Claude containers
- All modifications persist across container sessions and rebuilds

### 🔍 Git Repository & Worktree Detection
- **Automatic Git Detection** - Detects git repositories and worktrees on startup
- **Environment Variables** - Exports git information as environment variables for Claude to use:
  - `CLAUDE_GIT_IS_REPO` - Whether current directory is in a git repository
  - `CLAUDE_GIT_IS_WORKTREE` - Whether current directory is a git worktree
  - `CLAUDE_GIT_ROOT_PATH` - Repository root path
  - `CLAUDE_GIT_CURRENT_BRANCH` - Current branch name
  - `CLAUDE_GIT_REMOTE_URL` - Remote repository URL
  - `CLAUDE_GIT_COMMIT_HASH` - Current commit hash
- **Enhanced Worktree Support** - Automatic dual mounting for seamless git operations:
  - Main repository mounted at `/main-repo` (contains `.git` directory)
  - Current worktree mounted at `/workspace` (working directory)
  - Automatic path translation for proper git functionality
- **Worktree-aware Configuration** - Automatic fallback from current worktree to main worktree for missing configuration files
- **Safety Checks** - Worktree-aware git state validation before script execution

### 🍎 Native macOS Build Support
- **SSH-based Communication** - Secure container-to-host communication via `host.docker.internal`
- **Native Build Tools** - Direct access to xcodebuild, swift build, make, and other macOS tools
- **Custom Build Commands** - Define project-specific commands in `.env` for semantic usage
- **Pre/Post Build Hooks** - Automatic execution of setup and cleanup commands
- **Automatic Setup** - Guided SSH key generation and Remote Login configuration
- **Transparent Integration** - Execute native commands as if running directly on macOS
- **Security Isolation** - Dedicated SSH keys separate from personal credentials

### ⚡ Custom Build Commands
- **Project-Specific Configuration** - Define your build commands once in `.env`
- **Semantic Interface** - Use natural language like "run the build" or "start dev mode"
- **Multiple Command Types** - Support for build, dev, test, clean, install, release, lint, format
- **Working Directory Control** - Specify subdirectories for build operations
- **Build Hooks** - Automatic pre-build and post-build command execution
- **CLI & Python API** - Access via command line or Python functions

### 🧠 Enhanced Prompt Engineering (`CLAUDE.md`)
- **Execution Protocols** - Strict guidelines for simplicity, no error handling, surgical edits
- **Python Reproducibility** - Mandatory output directory structure with git hash, timestamp, and reproduction commands
- **Git State Assertion** - Scripts automatically check for clean git state before execution (except test/demo inputs)
- **System Package Installation** - Automatic documentation of apt-get packages in task logs
- **Startup Procedure** - Automatic codebase indexing using Serena MCP for enhanced code understanding

### 🐳 Clean Environment
- Each session runs in fresh Docker container
- Only current working directory mounted (along with conda directories specified in `.env`).


## Configuration
During build, the `.env` file from the claude-docker repository directory is baked into the image:
- Credentials are embedded at `/app/.env` inside the container
- No need to manage .env files in each project
- The image contains everything needed to run
- **Important**: After updating `.env`, you must rebuild the image with `claude-docker --rebuild`

The setup creates `~/.claude-docker/` in your home directory with:
- `claude-home/` - Persistent Claude authentication and settings
- `ssh/` - Directory where claude-dockers private ssh key and known hosts file is stored

The `scripts/` directory is automatically mounted in each container session, making `sys_utils.py` and other shared utilities available across all projects.

### 🛣️ PATH and PYTHONPATH Integration
During installation, the scripts directory is automatically added to both your host system and container environments:

**Host System Setup:**
- `~/.claude-docker/scripts` is added to both `PATH` and `PYTHONPATH` in `.bashrc` and `.zshrc`
- Scripts placed in this directory become available as system commands on your host
- Python modules can be imported directly: `from sys_utils import check_git_state_clean`

**Container Setup:**
- Scripts directory mounted at `/home/claude-user/scripts` with read/write access
- Container `PATH` includes `/home/claude-user/scripts` (Dockerfile:92)
- Container `PYTHONPATH` includes `/home/claude-user/scripts` (Dockerfile:93)
- All custom scripts and Python modules are immediately available to Claude

**What This Means:**
- ✅ **Bidirectional Access**: Scripts work on both host and in Claude containers
- ✅ **No Import Issues**: Python utilities available without path manipulation
- ✅ **Custom Commands**: Add executable scripts to extend Claude's capabilities
- ✅ **Shared Libraries**: Common code shared across all projects automatically
- ✅ **Persistent Utilities**: Scripts survive container restarts and rebuilds

### Template Configuration Copy
During installation (`install.sh`), all contents from the project's `.claude/` directory are copied to `~/.claude-docker/claude-home/` as template/base settings. This includes:
- `settings.json` - Default Claude Code settings with MCP configuration
- `CLAUDE.md` - Default instructions and protocols  
- `commands/` - Slash commands (if any)
- Any other configuration files

**To modify these settings:**
- **Recommended**: Directly edit files in `~/.claude-docker/claude-home/`
- **Alternative**: Modify `.claude/` in this repository and re-run `install.sh`

All changes to `~/.claude-docker/claude-home/` persist across container sessions.

Each project gets:
- `.claude/settings.json` - Claude Code settings with MCP
- `.claude/CLAUDE.md` - Project-specific instructions (if you create one)


### Rebuilding the Image

The Docker image is built only once when you first run `claude-docker`. To force a rebuild:

```bash
# Force rebuild (uses cache)
claude-docker --rebuild

# Force rebuild without cache
claude-docker --rebuild --no-cache
```

Rebuild when you:
- Update your .env file with new credentials
- Update the Claude Docker repository
- Change system packages in .env

### Conda Configuration

For custom conda installations (common in academic/lab environments), add these to your `.env` file:

```bash
# Main conda installation
CONDA_PREFIX=/vol/lab/username/miniconda3

# Additional conda directories (space-separated)
CONDA_EXTRA_DIRS="/vol/lab/username/.conda/envs /vol/lab/username/conda_envs /vol/lab/username/.conda/pkgs /vol/lab/username/conda_pkgs"
```

**How it works:**
- `CONDA_PREFIX`: Mounts your conda installation to the same path in container
- `CONDA_EXTRA_DIRS`: Mounts additional directories and automatically configures conda

**Automatic Detection:**
- Paths containing `*env*` → Added to `CONDA_ENVS_DIRS` (conda environment search)
- Paths containing `*pkg*` → Added to `CONDA_PKGS_DIRS` (package cache search)

**Result:** All your conda environments and packages work exactly as they do on your host system.

### System Package Installation

For scientific computing packages that require system libraries, add them to your `.env` file:

```bash
# Install OpenSlide for medical imaging
SYSTEM_PACKAGES="libopenslide0"

# Install multiple packages (space-separated)
SYSTEM_PACKAGES="libopenslide0 libgdal-dev libproj-dev libopencv-dev"
```

**Note:** Adding system packages requires rebuilding the Docker image (`docker rmi claude-docker:latest`).

## Custom Build Commands

Claude-docker supports **per-project** build commands with automatic detection and multiple configuration methods. Each project can have its own build setup.

### Configuration Methods

**1. Project `.env` File (Recommended)**
Create a `.env` file in each project directory:

```bash
# your-tauri-project/.env
NATIVE_BUILD_COMMAND=npm run tauri build
NATIVE_DEV_COMMAND=npm run tauri dev
NATIVE_TEST_COMMAND=npm run test
NATIVE_CLEAN_COMMAND=npm run clean
NATIVE_BUILD_DIR=src-tauri
NATIVE_PRE_BUILD=npm run build
```

**2. claude-build.json Configuration**
```json
{
  "build": "npm run tauri build",
  "dev": "npm run tauri dev", 
  "test": "npm run test",
  "buildDir": "src-tauri",
  "preBuild": "npm run build"
}
```

**3. package.json Integration**
```json
{
  "scripts": {
    "build": "tauri build",
    "dev": "tauri dev"
  },
  "claude-docker": {
    "build": "npm run build",
    "dev": "npm run dev",
    "buildDir": "src-tauri"
  }
}
```

**4. Auto-Detection**
Commands are automatically inferred from:
- Tauri projects (`src-tauri/` + `package.json`)
- React Native (`ios/` + `package.json`)
- Swift packages (`Package.swift`)
- Xcode projects (`*.xcodeproj`)
- Rust projects (`Cargo.toml`)
- And more...

### Usage

**With Claude (Natural Language):**
- *"run the build"* - Executes `NATIVE_BUILD_COMMAND`
- *"start dev mode"* - Executes `NATIVE_DEV_COMMAND`
- *"run tests"* - Executes `NATIVE_TEST_COMMAND`
- *"clean the project"* - Executes `NATIVE_CLEAN_COMMAND`
- *"install dependencies"* - Executes `NATIVE_INSTALL_COMMAND`

**Python API:**
```python
from macos_builder import run_build, run_dev, run_test

# Execute configured commands
result = run_build()      # Runs with pre/post hooks
result = run_dev()        # Starts development server
result = run_test()       # Runs test suite
```

**Command Line:**
```bash
# Direct command execution
python3 ~/scripts/macos_builder.py build
python3 ~/scripts/macos_builder.py dev
python3 ~/scripts/macos_builder.py test

# List configured commands
python3 ~/scripts/macos_builder.py list

# Check status
python3 ~/scripts/macos_builder.py status
```

### Multi-Project Workflow

**Setup different projects:**
```bash
# Tauri project
cd tauri-project
echo "NATIVE_BUILD_COMMAND=npm run tauri build" > .env
echo "NATIVE_DEV_COMMAND=npm run tauri dev" >> .env

# React Native project  
cd ../react-native-project
echo "NATIVE_BUILD_COMMAND=npx react-native run-macos --mode Release" > .env
echo "NATIVE_DEV_COMMAND=npx react-native run-macos" >> .env

# Swift project
cd ../swift-project
echo "NATIVE_BUILD_COMMAND=swift build -c release" > .env
echo "NATIVE_DEV_COMMAND=swift run" >> .env

# Use auto-detection for other projects (no .env needed)
cd ../go-project  # Auto-detects: go build, go run
cd ../xcode-project  # Auto-detects: xcodebuild commands
```

**Usage:**
```bash
cd tauri-project && claude-docker       # Tauri commands available
cd ../react-native-project && claude-docker  # RN commands available
cd ../swift-project && claude-docker    # Swift commands available
```

### Git Worktree Configuration Support

For projects using git worktrees, claude-docker provides intelligent configuration loading:

**Configuration Priority (highest to lowest):**
1. **Current worktree** configuration files (`.env`, `claude-build.json`, `package.json`)
2. **Main worktree** configuration files (fallback when not found in current worktree)
3. **Auto-detection** based on project structure

**How it works:**
- Configuration files aren't copied to git worktrees by default
- Claude-docker automatically checks the main worktree for missing configuration
- Current worktree settings override main worktree settings when both exist
- This ensures consistent build commands across all worktrees while allowing per-worktree customization

**Git Operations in Worktrees:**
- Automatically detects git worktrees and mounts both main repository and current worktree
- Fixes the common "fatal: not a git repository" error in containerized worktrees
- Git commands (status, diff, commit, push, etc.) work seamlessly
- No manual setup required - everything works out of the box

**Example workflow:**
```bash
# Setup main worktree with build configuration
cd main-project
echo "NATIVE_BUILD_COMMAND=npm run tauri build" > .env
echo "NATIVE_DEV_COMMAND=npm run tauri dev" >> .env

# Create and use worktree - automatically inherits configuration
git worktree add ../feature-branch feature-branch
cd ../feature-branch
claude-docker  # Uses main worktree's build commands

# Override in specific worktree if needed
echo "NATIVE_DEV_COMMAND=npm run tauri dev -- --debug" > .env
claude-docker  # Now uses worktree-specific dev command, main worktree's build command
```

**Example Configurations:**

**Tauri with Frontend Build:**
```bash
# tauri-project/.env
NATIVE_BUILD_COMMAND=npm run tauri build
NATIVE_DEV_COMMAND=npm run tauri dev
NATIVE_BUILD_DIR=src-tauri
NATIVE_PRE_BUILD=npm run build
```

**Complex Multi-step Build:**
```json
// claude-build.json
{
  "build": "make release",
  "dev": "make dev",
  "test": "make test",
  "preBuild": "make clean && make deps",
  "postBuild": "make sign && make notarize"
}
```

## How This Differs from Anthropic's DevContainer

We provide a different approach than [Anthropic's official .devcontainer](https://github.com/anthropics/claude-code/tree/main/.devcontainer), optimized for autonomous task execution:


### Feature Comparison

| Feature | claude-docker | Anthropic's DevContainer |
|---------|--------------|-------------------------|
| **IDE Support** | Any editor/IDE | VSCode-specific |
| **Authentication** | Once per machine, persists forever | Per-devcontainer setup |
| **Conda Environments** | Direct access to all host envs | Manual setup in Dockerfile |
| **Prompt Engineering** | Optimized CLAUDE.md for tasks | Standard behavior |
| **Network Access** | Full access (firewall coming soon) | Configurable firewall |
| **SMS Notifications** | Built-in Twilio MCP | Not available |
| **Permissions** | Auto (--dangerously-skip-permissions) | Auto (--dangerously-skip-permissions) |


**Note**: Network firewall functionality similar to Anthropic's implementation is our next planned feature.

## Next Steps

**Phase 2 - Security Enhancements:**
- Network firewall to whitelist specific domains (similar to Anthropic's DevContainer)
- Shell history persistence between sessions
- Additional security features

## Attribution & Dependencies

### Core Dependencies
- **Claude Code**: Anthropic's official CLI - https://github.com/anthropics/claude-code
- **Twilio MCP Server**: SMS integration by @yiyang.1i - https://github.com/yiyang1i/sms-mcp-server
- **Docker**: Container runtime - https://www.docker.com/

### Inspiration & References
- Anthropic's DevContainer implementation: https://github.com/anthropics/claude-code/tree/main/.devcontainer
- MCP (Model Context Protocol): https://modelcontextprotocol.io/

### Created By
- **Repository**: https://github.com/VishalJ99/claude-docker
- **Author**: Vishal J (@VishalJ99)

## License

This project is open source. See the LICENSE file for details.
