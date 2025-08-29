#!/bin/bash
# ABOUTME: Wrapper script to run Claude Code in Docker container
# ABOUTME: Handles project mounting, .claude setup, and environment variables

# Parse command line arguments
NO_CACHE=""
FORCE_REBUILD=false
CONTINUE_FLAG=""
MEMORY_LIMIT=""
GPU_ACCESS=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        --continue)
            CONTINUE_FLAG="--continue"
            shift
            ;;
        --memory)
            MEMORY_LIMIT="$2"
            shift 2
            ;;
        --gpus)
            GPU_ACCESS="$2"
            shift 2
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Get the absolute path of the current directory
CURRENT_DIR=$(pwd)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to detect git worktree and get main repository info
detect_git_worktree() {
    local git_info_json
    local is_worktree
    local main_repo_path
    
    # Use our git_utils.py to get repository information
    if command -v python3 >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/scripts/git_utils.py" ]; then
        git_info_json=$(python3 "$PROJECT_ROOT/scripts/git_utils.py" json 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$git_info_json" ]; then
            # Parse JSON to check if this is a worktree
            is_worktree=$(echo "$git_info_json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('is_worktree', False))" 2>/dev/null)
            
            if [ "$is_worktree" = "True" ]; then
                # Get main repository path from worktree info
                main_repo_path=$(echo "$git_info_json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
worktree_info = data.get('worktree_info', {})
main_worktree = worktree_info.get('main_worktree')
if main_worktree:
    print(main_worktree)
" 2>/dev/null)
                
                if [ -n "$main_repo_path" ] && [ -d "$main_repo_path" ]; then
                    echo "WORKTREE_DETECTED=true"
                    echo "MAIN_REPO_PATH=$main_repo_path"
                    echo "WORKTREE_PATH=$CURRENT_DIR"
                    return 0
                fi
            fi
        fi
    fi
    
    echo "WORKTREE_DETECTED=false"
    return 1
}

# Detect git worktree before proceeding
echo "Checking git repository status..."
WORKTREE_INFO=$(detect_git_worktree)
eval "$WORKTREE_INFO"

if [ "$WORKTREE_DETECTED" = "true" ]; then
    echo "✓ Git worktree detected"
    echo "  Worktree: $WORKTREE_PATH"
    echo "  Main repo: $MAIN_REPO_PATH"
    echo "  Enhanced git support will be available in container"
else
    echo "Standard git repository (or no git repository)"
fi

# Check if .claude directory exists in current project, create if not
if [ ! -d "$CURRENT_DIR/.claude" ]; then
    echo "Creating .claude directory for this project..."
    mkdir -p "$CURRENT_DIR/.claude"
    
    # Copy template files
    cp "$PROJECT_ROOT/.claude/CLAUDE.md" "$CURRENT_DIR/.claude/"
    
    # Create scratchpad.md if it doesn't exist
    if [ ! -f "$CURRENT_DIR/scratchpad.md" ]; then
        cp "$PROJECT_ROOT/.claude/scratchpad.md" "$CURRENT_DIR/"
    fi
    
    echo "✓ Claude configuration created"
fi

# Copy .env file if it exists in main repo and not in current directory
if [ -f "$PROJECT_ROOT/.env" ] && [ ! -f "$CURRENT_DIR/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$CURRENT_DIR/.env"
    echo "✓ Copied .env file from main repository"
fi

# Copy .env from main worktree to current worktree if in worktree mode
if [ "$WORKTREE_DETECTED" = "true" ] && [ -f "$MAIN_REPO_PATH/.env" ] && [ ! -f "$CURRENT_DIR/.env" ]; then
    cp "$MAIN_REPO_PATH/.env" "$CURRENT_DIR/.env"
    echo "✓ Copied .env file from main worktree"
fi

# Check if .env exists in claude-docker directory for building
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    echo "✓ Found .env file with credentials"
    # Source .env to get configuration variables
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
else
    echo "⚠️  No .env file found at $ENV_FILE"
    echo "   Twilio MCP features will be unavailable."
    echo "   To enable: copy .env.example to .env in the claude-docker repository and add your credentials"
fi

# Use environment variables as defaults if command line args not provided
if [ -z "$MEMORY_LIMIT" ] && [ -n "$DOCKER_MEMORY_LIMIT" ]; then
    MEMORY_LIMIT="$DOCKER_MEMORY_LIMIT"
    echo "✓ Using memory limit from environment: $MEMORY_LIMIT"
fi

if [ -z "$GPU_ACCESS" ] && [ -n "$DOCKER_GPU_ACCESS" ]; then
    GPU_ACCESS="$DOCKER_GPU_ACCESS"
    echo "✓ Using GPU access from environment: $GPU_ACCESS"
fi

# Check if we need to rebuild the image
NEED_REBUILD=false

if ! docker images | grep -q "claude-docker"; then
    echo "Building Claude Docker image for first time..."
    NEED_REBUILD=true
fi

if [ "$FORCE_REBUILD" = true ]; then
    echo "Forcing rebuild of Claude Docker image..."
    NEED_REBUILD=true
fi

# Warn if --no-cache is used without rebuild
if [ -n "$NO_CACHE" ] && [ "$NEED_REBUILD" = false ]; then
    echo "⚠️  Warning: --no-cache flag set but image already exists. Use --rebuild --no-cache to force rebuild without cache."
fi

if [ "$NEED_REBUILD" = true ]; then
    # Copy authentication files to build context
    if [ -f "$HOME/.claude.json" ]; then
        cp "$HOME/.claude.json" "$PROJECT_ROOT/.claude.json"
    fi
    
    # Get git config from host
    GIT_USER_NAME=$(git config --global --get user.name 2>/dev/null || echo "")
    GIT_USER_EMAIL=$(git config --global --get user.email 2>/dev/null || echo "")
    
    # Build docker command with conditional system packages and git config
    BUILD_ARGS="--build-arg USER_UID=$(id -u) --build-arg USER_GID=$(id -g)"
    if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
        BUILD_ARGS="$BUILD_ARGS --build-arg GIT_USER_NAME=\"$GIT_USER_NAME\" --build-arg GIT_USER_EMAIL=\"$GIT_USER_EMAIL\""
    fi
    if [ -n "$SYSTEM_PACKAGES" ]; then
        echo "✓ Building with additional system packages: $SYSTEM_PACKAGES"
        BUILD_ARGS="$BUILD_ARGS --build-arg SYSTEM_PACKAGES=\"$SYSTEM_PACKAGES\""
    fi
    
    eval "docker build $NO_CACHE $BUILD_ARGS -t claude-docker:latest \"$PROJECT_ROOT\""
    
    # Clean up copied auth files
    rm -f "$PROJECT_ROOT/.claude.json"
fi

# Ensure the claude-home, ssh, and git-backups directories exist
mkdir -p "$HOME/.claude-docker/claude-home"
mkdir -p "$HOME/.claude-docker/ssh"
mkdir -p "$HOME/.claude-docker/git-backups"

# Ensure host Claude directories exist for sharing
mkdir -p "$HOME/.claude/commands"
mkdir -p "$HOME/.claude/agents"

# Copy authentication files to persistent claude-home if they don't exist
if [ -f "$HOME/.claude/.credentials.json" ] && [ ! -f "$HOME/.claude-docker/claude-home/.credentials.json" ]; then
    echo "✓ Copying Claude authentication to persistent directory"
    cp "$HOME/.claude/.credentials.json" "$HOME/.claude-docker/claude-home/.credentials.json"
fi

# Log information about persistent Claude home directory
echo ""
echo "📁 Claude persistent home directory: ~/.claude-docker/claude-home/"
echo "   This directory contains Claude's settings and CLAUDE.md instructions"
echo "   Modify files here to customize Claude's behavior across all projects"
echo ""

# Check SSH key setup
SSH_KEY_PATH="$HOME/.claude-docker/ssh/host_keys/id_rsa"
SSH_PUB_KEY_PATH="$HOME/.claude-docker/ssh/host_keys/id_rsa.pub"

if [ ! -f "$SSH_KEY_PATH" ] || [ ! -f "$SSH_PUB_KEY_PATH" ]; then
    echo ""
    echo "⚠️  SSH keys not found for git operations"
    echo "   To enable git push/pull in Claude Docker:"
    echo ""
    echo "   1. Generate SSH key:"
    echo "      ssh-keygen -t rsa -b 4096 -f ~/.claude-docker/ssh/host_keys/id_rsa -N ''"
    echo ""
    echo "   2. Add public key to GitHub:"
    echo "      cat ~/.claude-docker/ssh/host_keys/id_rsa.pub"
    echo "      # Copy output and add to: GitHub → Settings → SSH Keys"
    echo ""
    echo "   3. Test connection:"
    echo "      ssh -T git@github.com -i ~/.claude-docker/ssh/host_keys/id_rsa"
    echo ""
    echo "   Claude will continue without SSH keys (read-only git operations only)"
    echo ""
else
    echo "✓ SSH keys found for git operations"
    
    # Create SSH config if it doesn't exist
    SSH_CONFIG_PATH="$HOME/.claude-docker/ssh/config"
    if [ ! -f "$SSH_CONFIG_PATH" ]; then
        cat > "$SSH_CONFIG_PATH" << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/host_keys/id_rsa
    IdentitiesOnly yes
EOF
        echo "✓ SSH config created for GitHub"
    fi
fi

# Check macOS host SSH connectivity for native builds
check_macos_ssh_connectivity() {
    if [ "$(uname)" = "Darwin" ]; then
        echo "Checking macOS SSH connectivity for native builds..."
        
        # Check if Remote Login is enabled
        if sudo systemsetup -getremotelogin 2>/dev/null | grep -q "On"; then
            echo "✓ macOS Remote Login is enabled"
            
            # Test host.docker.internal connectivity (will be available from container)
            echo "✓ Host SSH connectivity will be available via host.docker.internal"
            
            # Check if host SSH keys exist
            HOST_SSH_KEY_PATH="$HOME/.claude-docker/ssh/host_keys/id_rsa"
            if [ ! -f "$HOST_SSH_KEY_PATH" ]; then
                echo ""
                echo "⚠️  Host SSH keys not found for native macOS builds"
                echo "   To enable native macOS builds from container:"
                echo ""
                echo "   1. Generate SSH key for container-to-host communication:"
                echo "      mkdir -p ~/.claude-docker/ssh/host_keys"
                echo "      ssh-keygen -t rsa -b 4096 -f ~/.claude-docker/ssh/host_keys/id_rsa -N ''"
                echo ""
                echo "   2. Add public key to your macOS user:"
                echo "      cat ~/.claude-docker/ssh/host_keys/id_rsa.pub >> ~/.ssh/authorized_keys"
                echo "      chmod 600 ~/.ssh/authorized_keys"
                echo ""
                echo "   3. Test connection from container (after starting):"
                echo "      ssh -i ~/.ssh/host_keys/id_rsa $(whoami)@host.docker.internal"
                echo ""
                echo "   Native macOS builds will be unavailable until SSH keys are configured"
                echo ""
            else
                echo "✓ Host SSH keys found for native macOS builds"
                
                # Test the SSH connection
                HOST_USER=$(whoami)
                echo "Testing SSH connection as user: $HOST_USER"
                if ssh -i "$HOST_SSH_KEY_PATH" -o ConnectTimeout=15 -o BatchMode=yes "$HOST_USER@localhost" exit 2>/dev/null; then
                    echo "✓ SSH connection to macOS host verified"
                else
                    echo "⚠️  SSH connection test failed - may need to add public key to authorized_keys"
                    echo "   Username used: $HOST_USER"
                    echo "   SSH key: $HOST_SSH_KEY_PATH"
                fi
            fi
        else
            echo ""
            echo "⚠️  macOS Remote Login is disabled"
            echo "   To enable native macOS builds:"
            echo "   1. Go to System Preferences > Sharing"
            echo "   2. Enable 'Remote Login'"
            echo "   3. Restart claude-docker"
            echo ""
            echo "   Native macOS builds will be unavailable until Remote Login is enabled"
            echo ""
        fi
    else
        echo "Not running on macOS - native macOS build support not applicable"
    fi
}

# Check macOS SSH connectivity if enabled
if [ "${ENABLE_MACOS_BUILDS:-false}" = "true" ]; then
    check_macos_ssh_connectivity
fi

# Prepare additional mount arguments
MOUNT_ARGS=""
ENV_ARGS=""
DOCKER_OPTS=""

# Add memory limit if specified
if [ -n "$MEMORY_LIMIT" ]; then
    echo "✓ Setting memory limit: $MEMORY_LIMIT"
    DOCKER_OPTS="$DOCKER_OPTS --memory $MEMORY_LIMIT"
fi

# Add GPU access if specified
if [ -n "$GPU_ACCESS" ]; then
    # Check if nvidia-docker2 or nvidia-container-runtime is available
    if docker info 2>/dev/null | grep -q nvidia || which nvidia-docker >/dev/null 2>&1; then
        echo "✓ Enabling GPU access: $GPU_ACCESS"
        DOCKER_OPTS="$DOCKER_OPTS --gpus $GPU_ACCESS"
    else
        echo "⚠️  GPU access requested but NVIDIA Docker runtime not found"
        echo "   Install nvidia-docker2 or nvidia-container-runtime to enable GPU support"
        echo "   Continuing without GPU access..."
    fi
fi

# Mount conda installation if specified
if [ -n "$CONDA_PREFIX" ] && [ -d "$CONDA_PREFIX" ]; then
    echo "✓ Mounting conda installation from $CONDA_PREFIX"
    MOUNT_ARGS="$MOUNT_ARGS -v $CONDA_PREFIX:$CONDA_PREFIX:ro"
    ENV_ARGS="$ENV_ARGS -e CONDA_PREFIX=$CONDA_PREFIX -e CONDA_EXE=$CONDA_PREFIX/bin/conda"
else
    echo "No conda installation configured"
fi

# Mount additional conda directories if specified
if [ -n "$CONDA_EXTRA_DIRS" ]; then
    echo "✓ Mounting additional conda directories..."
    CONDA_ENVS_PATHS=""
    CONDA_PKGS_PATHS=""
    for dir in $CONDA_EXTRA_DIRS; do
        if [ -d "$dir" ]; then
            echo "  - Mounting $dir"
            MOUNT_ARGS="$MOUNT_ARGS -v $dir:$dir:ro"
            # Build comma-separated list for CONDA_ENVS_DIRS
            if [[ "$dir" == *"env"* ]]; then
                if [ -z "$CONDA_ENVS_PATHS" ]; then
                    CONDA_ENVS_PATHS="$dir"
                else
                    CONDA_ENVS_PATHS="$CONDA_ENVS_PATHS:$dir"
                fi
            fi
            # Build comma-separated list for CONDA_PKGS_DIRS
            if [[ "$dir" == *"pkg"* ]]; then
                if [ -z "$CONDA_PKGS_PATHS" ]; then
                    CONDA_PKGS_PATHS="$dir"
                else
                    CONDA_PKGS_PATHS="$CONDA_PKGS_PATHS:$dir"
                fi
            fi
        else
            echo "  - Skipping $dir (not found)"
        fi
    done
    # Set CONDA_ENVS_DIRS environment variable if we found env paths
    if [ -n "$CONDA_ENVS_PATHS" ]; then
        ENV_ARGS="$ENV_ARGS -e CONDA_ENVS_DIRS=$CONDA_ENVS_PATHS"
        echo "  - Setting CONDA_ENVS_DIRS=$CONDA_ENVS_PATHS"
    fi
    # Set CONDA_PKGS_DIRS environment variable if we found pkg paths
    if [ -n "$CONDA_PKGS_PATHS" ]; then
        ENV_ARGS="$ENV_ARGS -e CONDA_PKGS_DIRS=$CONDA_PKGS_PATHS"
        echo "  - Setting CONDA_PKGS_DIRS=$CONDA_PKGS_PATHS"
    fi
else
    echo "No additional conda directories configured"
fi

# Prepare macOS host SSH key mounting
HOST_SSH_MOUNT=""
if [ "${ENABLE_MACOS_BUILDS:-false}" = "true" ] && [ -d "$HOME/.claude-docker/ssh/host_keys" ]; then
    HOST_SSH_MOUNT="-v $HOME/.claude-docker/ssh/host_keys:/home/claude-user/.ssh/host_keys:ro"
fi

# Prepare git worktree mounting
WORKTREE_MOUNT=""
WORKTREE_ENV=""
if [ "$WORKTREE_DETECTED" = "true" ]; then
    echo "Setting up enhanced git worktree support..."
    WORKTREE_MOUNT="-v $MAIN_REPO_PATH:/main-repo:rw"
    WORKTREE_ENV="-e WORKTREE_DETECTED=true -e MAIN_REPO_PATH=/main-repo -e WORKTREE_PATH=/workspace"
    echo "  Main repository mounted at: /main-repo"
    echo "  Current worktree mounted at: /workspace"
fi

# Define backup file path for worktree .git file
BACKUP_FILE="$HOME/.claude-docker/git-backups/.git.backup.$(basename "$CURRENT_DIR").$$"

# Cleanup function for host-side worktree restoration
cleanup_host_worktree() {
    if [ "$WORKTREE_DETECTED" = "true" ] && [ -f "$BACKUP_FILE" ]; then
        echo "🧹 Restoring original git worktree file on host..."
        mv "$BACKUP_FILE" "$CURRENT_DIR/.git"
        echo "  ✓ Host git worktree restored"
    fi
}

# Set up signal handling for cleanup
trap 'echo "Received signal, cleaning up..."; cleanup_host_worktree; exit 0' SIGTERM SIGINT

# Backup git file if this is a worktree (before Docker modifies it)
if [ "$WORKTREE_DETECTED" = "true" ] && [ -f "$CURRENT_DIR/.git" ]; then
    echo "📋 Backing up worktree .git file for cleanup..."
    cp "$CURRENT_DIR/.git" "$BACKUP_FILE"
fi

# Rewrite .git file for container use (after backup, before Docker)
if [ "$WORKTREE_DETECTED" = "true" ] && [ -f "$CURRENT_DIR/.git" ]; then
    echo "🔧 Rewriting .git file for container paths..."
    ORIGINAL_GITDIR=$(cat "$CURRENT_DIR/.git" | cut -d' ' -f2)
    CONTAINER_GITDIR=$(echo "$ORIGINAL_GITDIR" | sed "s|$MAIN_REPO_PATH|/main-repo|")
    echo "gitdir: $CONTAINER_GITDIR" > "$CURRENT_DIR/.git"
    echo "  ✓ Git worktree configured for container use"
fi

# Set HOST_WORKING_DIRECTORY to current directory for container use
HOST_WORKING_DIRECTORY="$CURRENT_DIR"
echo "Setting HOST_WORKING_DIRECTORY to: $HOST_WORKING_DIRECTORY"

# Run Claude Code in Docker
echo "Starting Claude Code in Docker..."
docker run -it --rm \
    $DOCKER_OPTS \
    -v "$CURRENT_DIR:/workspace" \
    $WORKTREE_MOUNT \
    -v "$HOME/.claude-docker/claude-home:/home/claude-user/.claude:rw" \
    -v "$HOME/.claude/commands:/home/claude-user/.claude/commands:rw" \
    -v "$HOME/.claude/agents:/home/claude-user/.claude/agents:rw" \
    -v "$HOME/.claude-docker/ssh:/home/claude-user/.ssh:rw" \
    -v "$HOME/.claude-docker/scripts:/home/claude-user/scripts:rw" \
    $HOST_SSH_MOUNT \
    $MOUNT_ARGS \
    $ENV_ARGS \
    $WORKTREE_ENV \
    -e CLAUDE_CONTINUE_FLAG="$CONTINUE_FLAG" \
    -e ENABLE_MACOS_BUILDS="${ENABLE_MACOS_BUILDS:-false}" \
    -e MACOS_USERNAME="${MACOS_USERNAME:-$(whoami)}" \
    -e HOST_WORKING_DIRECTORY="$HOST_WORKING_DIRECTORY" \
    --workdir /workspace \
    --name "claude-docker-$(basename "$CURRENT_DIR")-$$" \
    claude-docker:latest "${ARGS[@]}"

# Clean up after Docker exits normally
DOCKER_EXIT_CODE=$?
cleanup_host_worktree
exit $DOCKER_EXIT_CODE