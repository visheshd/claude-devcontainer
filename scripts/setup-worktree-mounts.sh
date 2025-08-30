#!/bin/bash
# Devcontainer Worktree Mount Setup Script
# Runs on HOST before devcontainer starts to configure proper mounts
# Analyzes git worktree structure and updates devcontainer.json automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"
DEVCONTAINER_JSON="$CURRENT_DIR/.devcontainer/devcontainer.json"

# Debug mode
DEBUG="${WORKTREE_SETUP_DEBUG:-false}"

debug_log() {
    if [ "$DEBUG" = "true" ]; then
        echo "[worktree-setup] $1" >&2
    fi
}

# Check if current directory is a git worktree
is_worktree() {
    [ -f .git ] && grep -q "gitdir:" .git 2>/dev/null
}

# Extract main repository path from .git file
get_main_repo_path() {
    if [ ! -f .git ]; then
        return 1
    fi
    
    local gitdir_line
    gitdir_line=$(cat .git)
    
    # Extract path from "gitdir: /path/to/main/.git/worktrees/worktree-name"
    local gitdir_path
    gitdir_path=$(echo "$gitdir_line" | sed 's/gitdir: //')
    
    # Remove /worktrees/worktree-name to get main repo path
    local main_repo_path
    main_repo_path=$(echo "$gitdir_path" | sed 's|/\.git/worktrees/.*|/.git|')
    main_repo_path=$(dirname "$main_repo_path")
    
    echo "$main_repo_path"
}

# Create or update devcontainer.json with worktree mount
create_devcontainer_config() {
    local main_repo_path="$1"
    local worktree_name
    worktree_name=$(basename "$CURRENT_DIR")
    
    debug_log "Creating devcontainer config for worktree: $worktree_name"
    debug_log "Main repo path: $main_repo_path"
    
    # Create .devcontainer directory if it doesn't exist
    mkdir -p "$CURRENT_DIR/.devcontainer"
    
    # Generate devcontainer.json
    cat > "$DEVCONTAINER_JSON" << EOF
{
  "name": "Claude Worktree: $worktree_name",
  "image": "claude-nextjs:latest",
  
  // Initialize command runs on HOST before container starts
  "initializeCommand": "$SCRIPT_DIR/setup-worktree-mounts.sh",
  
  // Post-create command runs inside container after creation
  "postCreateCommand": "$SCRIPT_DIR/configure-git-wrapper.sh",
  
  // Mount both the worktree and main repository
  "mounts": [
    "source=$main_repo_path,target=/main-repo,type=bind,consistency=cached"
  ],
  
  // Environment variables for git wrapper
  "containerEnv": {
    "WORKTREE_DETECTED": "true",
    "WORKTREE_HOST_MAIN_REPO": "$main_repo_path",
    "WORKTREE_CONTAINER_MAIN_REPO": "/main-repo",
    "WORKTREE_NAME": "$worktree_name"
  },
  
  // Working directory inside container
  "workspaceFolder": "/workspaces/$worktree_name",
  
  // VS Code extensions and settings
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss"
      ]
    }
  },
  
  // Forward common ports
  "forwardPorts": [3000, 3001, 5173, 8080],
  
  // Use non-root user
  "remoteUser": "claude-user"
}
EOF
    
    debug_log "Created devcontainer.json at: $DEVCONTAINER_JSON"
}

# Update existing devcontainer.json with mount
update_devcontainer_config() {
    local main_repo_path="$1"
    
    debug_log "Updating existing devcontainer.json"
    
    # Create a backup
    cp "$DEVCONTAINER_JSON" "$DEVCONTAINER_JSON.backup.$(date +%s)"
    
    # Use jq to update the configuration if available, otherwise recreate
    if command -v jq >/dev/null 2>&1; then
        local temp_file
        temp_file=$(mktemp)
        
        jq --arg main_repo "$main_repo_path" \
           --arg worktree_name "$(basename "$CURRENT_DIR")" \
           '
           .mounts = [
             "source=\($main_repo),target=/main-repo,type=bind,consistency=cached"
           ] |
           .containerEnv.WORKTREE_DETECTED = "true" |
           .containerEnv.WORKTREE_HOST_MAIN_REPO = $main_repo |
           .containerEnv.WORKTREE_CONTAINER_MAIN_REPO = "/main-repo" |
           .containerEnv.WORKTREE_NAME = $worktree_name
           ' "$DEVCONTAINER_JSON" > "$temp_file"
        
        mv "$temp_file" "$DEVCONTAINER_JSON"
        debug_log "Updated devcontainer.json using jq"
    else
        debug_log "jq not available, recreating devcontainer.json"
        create_devcontainer_config "$main_repo_path"
    fi
}

# Main execution
main() {
    debug_log "Starting worktree mount setup in: $CURRENT_DIR"
    
    # Check if we're in a git worktree
    if ! is_worktree; then
        debug_log "Not in a git worktree, skipping setup"
        exit 0
    fi
    
    debug_log "Detected git worktree"
    
    # Get main repository path
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    
    if [ -z "$main_repo_path" ] || [ ! -d "$main_repo_path" ]; then
        echo "Error: Could not determine main repository path" >&2
        debug_log "Main repo path: '$main_repo_path'"
        exit 1
    fi
    
    debug_log "Main repository found at: $main_repo_path"
    
    # Create or update devcontainer configuration
    if [ -f "$DEVCONTAINER_JSON" ]; then
        debug_log "Existing devcontainer.json found"
        update_devcontainer_config "$main_repo_path"
    else
        debug_log "No existing devcontainer.json found"
        create_devcontainer_config "$main_repo_path"
    fi
    
    echo "✅ Devcontainer configured for worktree with main repo mounted at /main-repo"
    debug_log "Setup complete"
}

# Run main function
main "$@"