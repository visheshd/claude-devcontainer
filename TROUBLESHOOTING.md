# Troubleshooting Guide

Common issues and solutions for Claude DevContainer setup and usage.

## Build Issues

### "Error: image not found" when opening DevContainer

**Problem**: DevContainer fails to start because required Docker images haven't been built locally.

**Solution**: Build the required images for your stack:

```bash
# Check what stack your DevContainer is configured for:
cat .devcontainer/devcontainer.json | grep image

# Then build the required images:
./build-all-images.sh --images claude-base,python-ml    # for Python ML
./build-all-images.sh --images claude-base,nextjs       # for Next.js  
./build-all-images.sh --images claude-base,rust-tauri   # for Rust Tauri
```

### DevContainer fails to start with missing image

**Problem**: Container startup fails even though you think images were built.

**Solution**: Verify the specific images you need were built successfully:

```bash
# List all Claude images
docker images | grep claude

# You should see claude-base and your chosen stack image:
# claude-base          latest    ...
# claude-python-ml     latest    ... (for Python ML)
# OR claude-nextjs     latest    ... (for Next.js)
# OR claude-rust-tauri latest    ... (for Rust Tauri)
```

### Build fails with permission errors

**Problem**: Build scripts fail with permission denied errors.

**Solution**: Ensure build scripts are executable:

```bash
chmod +x build-all-images.sh
chmod +x dockerfiles/*/build.sh
```

## CLI Tool Issues

### CLI tool not found after npm link

**Problem**: Commands like `claude-devcontainer` or `cdc` are not recognized after installation.

**Solution**: Reinstall the CLI tool:

```bash
cd tools/claude-devcontainer
npm unlink  # if previously linked
npm install && npm link

# Test the installation
claude-devcontainer --help
cdc --help
```

## Worktree Issues

### DevContainer mount errors after creating worktree manually

**Problem**: Getting "invalid mount config" or "mount path must be absolute" errors.

**Root Cause**: Used manual `git worktree add` instead of the provided `wt` command.

**Solution**: Always use the `wt` command for worktree creation:

```bash
# ❌ WRONG: Manual git worktree add (breaks DevContainer setup)
# git worktree add ../my-feature

# ✅ CORRECT: Use the wt command
cdc wt my-feature           # Creates worktree with proper DevContainer setup
wt my-feature              # Standalone command also works

# If you already created manually, delete and recreate:
git worktree remove ../my-feature
wt my-feature              # This configures DevContainer properly
```

### Worktree missing DevContainer configuration

**Problem**: Worktree lacks proper DevContainer setup, missing environment variables or mount paths.

**Root Cause**: Worktree created manually instead of using the `wt` command.

**Solution**: The `wt` command automatically configures:
- Proper mount paths in devcontainer.json
- All required environment variables (WORKTREE_HOST_MAIN_REPO, etc.)
- Git assume-unchanged to prevent dirty status

```bash
# Always use wt command for worktree creation
wt my-feature              # Automatically configures all required settings
```

### Worktree directory deleted but git still tracking it

**Problem**: Directory was deleted but `git worktree list` still shows it.

**Solution**: Clean up stale worktree references:

```bash
# List problematic worktrees
git worktree list

# Remove stale worktree references
git worktree prune

# Or use CLI to clean up including Docker artifacts
cdc cleanup --list    # Find the problematic worktree
cdc cleanup problem-worktree-name
```

## Docker Cleanup Issues

### "Zombie" Docker containers/images accumulating

**Problem**: Old Docker containers and images from worktrees are taking up disk space.

**Solution**: Use the built-in cleanup tools:

```bash
# List all worktrees and their Docker artifacts
cdc cleanup --list

# Clean up specific worktree artifacts
cdc cleanup old-feature-name

# Clean up all merged branches (safe)
cdc cleanup --merged

# Interactive cleanup - choose what to remove
cdc cleanup --interactive

# Preview what would be cleaned without doing it
cdc cleanup --dry-run --all
```

### Docker daemon connection issues

**Problem**: Build or container operations fail with Docker daemon errors.

**Solution**: Ensure Docker is running and accessible:

```bash
# Check if Docker is running
docker info

# Restart Docker Desktop if needed (macOS/Windows)
# Or restart Docker service on Linux:
sudo systemctl restart docker
```

## Authentication Issues

### Claude Code authentication not persisting

**Problem**: Have to re-authenticate with Claude Code every time container restarts.

**Solution**: Ensure your `~/.claude` directory is properly mounted:

```bash
# Check devcontainer.json for the mount:
cat .devcontainer/devcontainer.json | grep -A5 -B5 "claude"

# Should see something like:
# "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
```

### SSH keys not working in container

**Problem**: Git operations fail with SSH authentication errors.

**Solution**: Ensure SSH keys are mounted and have proper permissions:

```bash
# Check if SSH keys are mounted
ls -la ~/.ssh/

# Ensure proper permissions
chmod 600 ~/.ssh/id_*
chmod 644 ~/.ssh/*.pub
```

## Performance Issues

### Slow container startup

**Problem**: DevContainer takes a long time to start.

**Potential Solutions**:
1. **Reduce Docker resource allocation** if too high
2. **Use specific image builds** instead of building all images
3. **Clean up unused Docker resources**:

```bash
# Clean up unused Docker resources
docker system prune -f

# Clean up unused volumes (careful!)
docker volume prune -f
```

### Out of disk space errors

**Problem**: Build fails due to insufficient disk space.

**Solution**: Clean up Docker resources and old images:

```bash
# See disk usage by Docker
docker system df

# Clean up everything not in use
docker system prune -a -f --volumes

# Remove specific old images
docker images | grep claude
docker rmi <image-id>
```

## Platform-Specific Issues

### Apple Silicon (M1/M2) compatibility

**Problem**: Some images or tools don't work on Apple Silicon.

**Solution**: The Claude images are built for your platform automatically. If you encounter issues:

```bash
# Force rebuild for your architecture
./build-all-images.sh --no-cache --rebuild

# Check image architecture
docker inspect claude-base:latest | grep Architecture
```

### Linux permissions issues

**Problem**: File permissions issues when mounting host directories.

**Solution**: The images are configured with proper user mapping, but if you encounter issues:

```bash
# Check the user mapping
docker run --rm -it claude-base:latest id

# Should show claude-user with your host UID/GID
```

## Getting Help

If none of these solutions work:

1. **Check the logs**: Look at DevContainer creation logs in VS Code
2. **Verify your setup**: Run `cdc check` to analyze your configuration
3. **Create an issue**: Report the problem with full error messages and system details
4. **Include system info**: OS, Docker version, Claude Code version, etc.

### Debug Information to Include

When reporting issues, include:

```bash
# System information
uname -a
docker --version
node --version

# Claude DevContainer CLI version
cdc --version

# Docker images
docker images | grep claude

# DevContainer configuration
cat .devcontainer/devcontainer.json
```