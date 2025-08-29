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
# Initialize a new DevContainer configuration
claude-devcontainer init

# Detect project type
claude-devcontainer detect

# List available stacks
claude-devcontainer stacks
```

## Commands

### `init`

Initialize a new Claude DevContainer configuration with interactive setup.

```bash
claude-devcontainer init [options]

Options:
  -s, --stack <stack>    Pre-select development stack
  --no-interaction      Run without interactive prompts
```

**Example:**
```bash
# Interactive setup
claude-devcontainer init

# Pre-select Python ML stack
claude-devcontainer init -s python-ml
```

### `detect`

Automatically detect the project type based on files in the current directory.

```bash
claude-devcontainer detect
```

**Detection Logic:**
- **Node.js/Next.js**: Detects `package.json`, checks for Next.js dependencies
- **Rust/Tauri**: Detects `Cargo.toml`, checks for `src-tauri/` directory
- **Python/ML**: Detects Python files and ML library imports

### `stacks`

List all available development stacks with descriptions.

```bash
claude-devcontainer stacks
```

## Available Stacks

### Python ML (`python-ml`)
- **Image**: `ghcr.io/your-org/claude-python-ml:latest`
- **Features**: Python 3.11+, uv, ML libraries, Jupyter, LangChain
- **Ports**: 8888 (Jupyter)
- **Extensions**: Python, Jupyter, Black formatter

### Rust Tauri (`rust-tauri`)
- **Image**: `ghcr.io/your-org/claude-rust-tauri:latest`
- **Features**: Rust toolchain, Tauri v2, cross-compilation
- **Ports**: 1420 (Tauri dev server)
- **Extensions**: rust-analyzer, Tauri, LLDB debugger
- **Host Builds**: Enabled by default

### Next.js (`nextjs`)
- **Image**: `ghcr.io/your-org/claude-nextjs:latest`
- **Features**: Node.js, Bun, pnpm, TypeScript, modern web tools
- **Ports**: 3000 (Next.js dev server)
- **Extensions**: Tailwind CSS, Prettier, TypeScript

### Custom (`custom`)
- **Image**: `ghcr.io/your-org/claude-base:latest`
- **Features**: Base Claude environment for custom configuration
- **Extensions**: None (configure as needed)

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

## Migration from claude-docker

The CLI automatically detects existing claude-docker setups and helps migrate:

1. **Detection**: Scans for `claude-docker.sh` and related files
2. **Configuration**: Preserves MCP server configurations
3. **Environment**: Migrates `.env` settings
4. **Features**: Maps existing functionality to DevContainer features

## Examples

### Basic Python ML Project

```bash
cd my-ml-project
claude-devcontainer init -s python-ml
# Select serena, context7, langchain-tools, vector-db
# Container will have Jupyter available on port 8888
```

### Tauri Desktop App with Host Builds

```bash
cd my-tauri-app
claude-devcontainer init -s rust-tauri
# Enable macOS host builds when prompted
# Select serena, context7, rust-analyzer, tauri-tools
```

### Next.js Web Application

```bash
cd my-nextjs-app
claude-devcontainer init -s nextjs  
# Container will have dev server on port 3000
# Includes Tailwind CSS and Prettier extensions
```

### Custom Configuration

```bash
cd my-custom-project
claude-devcontainer init -s custom
# Start with base image and configure as needed
# Add custom MCP servers and extensions
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
   - Ensure you have access to `ghcr.io/your-org/*` images
   - Update image tags if using custom registry