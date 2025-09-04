#!/bin/bash
# Devcontainer Worktree Mount Setup Script
# Runs on HOST before devcontainer starts
# Detects if we're in a worktree and updates mount paths accordingly

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

# This function was removed to prevent accidental destruction of user configurations.
# The update_devcontainer_config function now safely updates only worktree-specific fields.

# Update devcontainer.json mount and env vars for worktree
update_worktree_config() {
    local main_repo_path="$1"
    local worktree_name="$(basename "$CURRENT_DIR")"
    
    debug_log "Updating devcontainer.json for worktree: $worktree_name"
    
    # Create a backup
    cp "$DEVCONTAINER_JSON" "$DEVCONTAINER_JSON.backup.$(date +%s)"
    
    # Use jq to update only the mount path and environment variables
    if command -v jq >/dev/null 2>&1; then
        local temp_file temp_clean_file
        temp_file=$(mktemp)
        temp_clean_file=$(mktemp)
        
        # Strip JSON comments before processing with jq
        sed 's|//.*||g' "$DEVCONTAINER_JSON" > "$temp_clean_file"
        
        # Update mount source path and environment variables
        if jq --arg main_repo "$main_repo_path" \
           --arg worktree_name "$worktree_name" \
           '
           # Update the main repo mount source path
           .mounts = (.mounts // [] | map(
             if contains("target=/main-repo") then
               "source=\($main_repo),target=/main-repo,type=bind,consistency=cached"
             else
               .
             end
           )) |
           # Update environment variables
           .containerEnv.WORKTREE_DETECTED = "true" |
           .containerEnv.WORKTREE_HOST_MAIN_REPO = $main_repo |
           .containerEnv.WORKTREE_NAME = $worktree_name
           ' "$temp_clean_file" > "$temp_file" 2>/dev/null; then
            
            mv "$temp_file" "$DEVCONTAINER_JSON"
            rm -f "$temp_clean_file"
            debug_log "Updated devcontainer.json mount path for worktree"
            return 0
        else
            rm -f "$temp_file" "$temp_clean_file"
            echo "Warning: Failed to update devcontainer.json with jq" >&2
            debug_log "jq update failed - devcontainer.json unchanged"
            return 1
        fi
    else
        echo "Warning: jq not available, skipping devcontainer.json update" >&2
        debug_log "jq not available - using template defaults"
        return 0
    fi
}

# Main execution
main() {
    debug_log "Starting setup in: $CURRENT_DIR"
    
    # Check if devcontainer.json exists - skip if not (regular workflows should have it)
    if [ ! -f "$DEVCONTAINER_JSON" ]; then
        debug_log "No devcontainer.json found, skipping setup"
        exit 0
    fi
    
    # Check if we're in a git worktree
    if ! is_worktree; then
        debug_log "Not in a git worktree, using template defaults"
        exit 0
    fi
    
    debug_log "Detected git worktree - updating mount paths"
    
    # Get main repository path
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    
    if [ -z "$main_repo_path" ] || [ ! -d "$main_repo_path" ]; then
        echo "Warning: Could not determine main repository path: '$main_repo_path'" >&2
        debug_log "Using template defaults due to invalid main repo path"
        exit 0
    fi
    
    debug_log "Main repository found at: $main_repo_path"
    
    # Update devcontainer.json mount path for worktree
    if update_worktree_config "$main_repo_path"; then
        echo "✅ Worktree detected - main repo mounted at /main-repo"
    else
        echo "⚠️  Worktree detected but config update failed - using defaults"
    fi
    
    debug_log "Setup complete"
}

# Run main function
main "$@"