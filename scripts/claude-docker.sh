#!/bin/bash
# Claude Docker - Comprehensive wrapper for running Claude Code in Docker
# Provides persistent authentication, project mounting, and environment customization

set -e

# Default configuration
DOCKER_IMAGE="claude-docker:latest"
MEMORY_LIMIT="8g"
CONTAINER_NAME="claude-docker-$(basename "$PWD")"
PERSISTENT_AUTH_DIR="$HOME/.claude-docker/auth"
CLAUDE_HOME_DIR="$HOME/.claude-docker/claude-home"
SSH_DIR="$HOME/.claude-docker/ssh"
GPUS=""
CONTINUE_CONTAINER=false
REBUILD_IMAGE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
Claude Docker - Comprehensive wrapper for Claude Code in Docker

USAGE:
    $0 [OPTIONS] [COMMAND...]

OPTIONS:
    --memory SIZE       Set memory limit (default: 8g)
    --gpus GPUS         GPU specification (e.g., 'all', '0,1', 'device=0')
    --name NAME         Custom container name
    --continue          Continue existing container instead of creating new
    --rebuild           Force rebuild of Docker image
    --help              Show this help message

PERSISTENT AUTHENTICATION:
    This script automatically creates and mounts persistent authentication
    directories to avoid repeated logins:
    
    - $PERSISTENT_AUTH_DIR   (Claude authentication files)
    - $CLAUDE_HOME_DIR       (Claude home directory)
    - $SSH_DIR               (SSH keys for git operations)

EXAMPLES:
    # Basic usage
    $0
    
    # With more memory
    $0 --memory 16g
    
    # With GPU support
    $0 --gpus all
    
    # Continue existing container
    $0 --continue
    
    # Custom configuration
    $0 --memory 8g --gpus 0,1 --name my-claude-project

FIRST TIME SETUP:
    1. Ensure you have Claude Code authenticated on your host system
    2. Run: $0
    3. Your authentication will be preserved across container restarts

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --memory)
            MEMORY_LIMIT="$2"
            shift 2
            ;;
        --gpus)
            GPUS="$2"
            shift 2
            ;;
        --name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --continue)
            CONTINUE_CONTAINER=true
            shift
            ;;
        --rebuild)
            REBUILD_IMAGE=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            # Pass remaining arguments to container
            break
            ;;
    esac
done

# Setup persistent directories
setup_persistent_dirs() {
    print_status "Setting up persistent authentication directories..."
    
    # Create base directory
    mkdir -p "$HOME/.claude-docker"
    
    # Create authentication directory
    mkdir -p "$PERSISTENT_AUTH_DIR"
    
    # Create Claude home directory
    mkdir -p "$CLAUDE_HOME_DIR"
    
    # Create SSH directory
    mkdir -p "$SSH_DIR"
    
    # Copy host authentication if it exists and target doesn't
    if [ -f "$HOME/.claude/.credentials.json" ] && [ ! -f "$PERSISTENT_AUTH_DIR/.credentials.json" ]; then
        print_status "Copying existing Claude authentication..."
        cp -r "$HOME/.claude/"* "$PERSISTENT_AUTH_DIR/" 2>/dev/null || true
        print_success "Authentication files copied to persistent storage"
    fi
    
    # Copy SSH keys if they exist and target doesn't
    if [ -d "$HOME/.ssh" ] && [ ! -f "$SSH_DIR/id_rsa" ]; then
        print_status "Copying SSH keys for git operations..."
        cp -r "$HOME/.ssh/"* "$SSH_DIR/" 2>/dev/null || true
        chmod 700 "$SSH_DIR"
        chmod 600 "$SSH_DIR/"* 2>/dev/null || true
        print_success "SSH keys copied to persistent storage"
    fi
}

# Check if container exists and is running
check_container_status() {
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
            return 0  # Container exists and is running
        else
            return 1  # Container exists but is not running
        fi
    else
        return 2  # Container does not exist
    fi
}

# Build or rebuild Docker image
build_image() {
    if [ "$REBUILD_IMAGE" = true ] || ! docker images | grep -q "^claude-docker "; then
        print_status "Building Claude Docker image..."
        
        # Get git config for build args
        GIT_USER_NAME=$(git config --global user.name 2>/dev/null || echo "")
        GIT_USER_EMAIL=$(git config --global user.email 2>/dev/null || echo "")
        
        docker build \
            --build-arg "GIT_USER_NAME=$GIT_USER_NAME" \
            --build-arg "GIT_USER_EMAIL=$GIT_USER_EMAIL" \
            --build-arg "USER_UID=$(id -u)" \
            --build-arg "USER_GID=$(id -g)" \
            -t "$DOCKER_IMAGE" \
            .
        
        print_success "Docker image built successfully"
    else
        print_status "Using existing Docker image: $DOCKER_IMAGE"
    fi
}

# Run the container
run_container() {
    local docker_args=(
        "--rm"
        "--interactive"
        "--tty"
        "--name" "$CONTAINER_NAME"
        "--memory" "$MEMORY_LIMIT"
        "--volume" "$PWD:/workspace:cached"
        "--volume" "$PERSISTENT_AUTH_DIR:/home/claude-user/.claude:rw"
        "--volume" "$SSH_DIR:/home/claude-user/.ssh:rw"
        "--workdir" "/workspace"
        "--env" "CLAUDE_AUTH_PERSIST=true"
    )
    
    # Add GPU support if specified
    if [ -n "$GPUS" ]; then
        docker_args+=("--gpus" "$GPUS")
        print_status "GPU support enabled: $GPUS"
    fi
    
    # Add git config if available
    if [ -f "$HOME/.gitconfig" ]; then
        docker_args+=("--volume" "$HOME/.gitconfig:/home/claude-user/.gitconfig:ro")
    fi
    
    print_status "Starting Claude Docker container: $CONTAINER_NAME"
    print_status "Memory limit: $MEMORY_LIMIT"
    print_status "Persistent auth: $PERSISTENT_AUTH_DIR"
    print_status "Project directory: $PWD"
    
    # Run the container
    docker run "${docker_args[@]}" "$DOCKER_IMAGE" "$@"
}

# Continue existing container
continue_container() {
    print_status "Continuing existing container: $CONTAINER_NAME"
    docker start -ai "$CONTAINER_NAME"
}

# Main execution
main() {
    print_status "Claude Docker - Starting persistent authentication setup"
    
    # Setup persistent directories
    setup_persistent_dirs
    
    # Check container status
    check_container_status
    container_status=$?
    
    if [ "$CONTINUE_CONTAINER" = true ]; then
        if [ $container_status -eq 2 ]; then
            print_error "Container $CONTAINER_NAME does not exist. Run without --continue first."
            exit 1
        elif [ $container_status -eq 1 ]; then
            continue_container
        else
            print_warning "Container $CONTAINER_NAME is already running. Attaching..."
            docker attach "$CONTAINER_NAME"
        fi
    else
        # Stop existing container if running
        if [ $container_status -eq 0 ]; then
            print_warning "Stopping existing container: $CONTAINER_NAME"
            docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
        fi
        
        # Remove existing container if it exists
        if [ $container_status -ne 2 ]; then
            print_status "Removing existing container: $CONTAINER_NAME"
            docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
        fi
        
        # Build image if needed
        build_image
        
        # Run new container
        run_container "$@"
    fi
}

# Check dependencies
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Run main function
main "$@"