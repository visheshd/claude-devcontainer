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

# This function was removed to prevent accidental destruction of user configurations.
# The update_devcontainer_config function now safely updates only worktree-specific fields.

# Update existing devcontainer.json with mount
update_devcontainer_config() {
    local main_repo_path="$1"
    
    debug_log "Updating existing devcontainer.json"
    
    # Create a backup
    cp "$DEVCONTAINER_JSON" "$DEVCONTAINER_JSON.backup.$(date +%s)"
    
    # Use jq to update the configuration - strip comments first to avoid jq failures
    if command -v jq >/dev/null 2>&1; then
        local temp_file temp_clean_file
        temp_file=$(mktemp)
        temp_clean_file=$(mktemp)
        
        # Strip JSON comments before processing with jq to avoid failures
        sed 's|//.*||g' "$DEVCONTAINER_JSON" > "$temp_clean_file"
        
        # Update only worktree-specific fields, preserving all existing configuration
        if jq --arg main_repo "$main_repo_path" \
           --arg worktree_name "$(basename "$CURRENT_DIR")" \
           '
           # Add the main repo mount to existing mounts (preserving others like .claude, avoiding duplicates)
           .mounts = ((.mounts // []) | map(select(contains("target=/main-repo") | not))) + ["source=\($main_repo),target=/main-repo,type=bind,consistency=cached"] |
           # Ensure containerEnv exists and set worktree variables
           .containerEnv = (.containerEnv // {}) |
           .containerEnv.WORKTREE_DETECTED = "true" |
           .containerEnv.WORKTREE_HOST_MAIN_REPO = $main_repo |
           .containerEnv.WORKTREE_CONTAINER_MAIN_REPO = "/main-repo" |
           .containerEnv.WORKTREE_NAME = $worktree_name
           ' "$temp_clean_file" > "$temp_file" 2>/dev/null; then
            
            mv "$temp_file" "$DEVCONTAINER_JSON"
            rm -f "$temp_clean_file"
            debug_log "Updated devcontainer.json using jq (after stripping comments)"
        else
            rm -f "$temp_file" "$temp_clean_file"
            echo "Error: Failed to update devcontainer.json with jq" >&2
            echo "This preserves your existing configuration to avoid data loss." >&2
            debug_log "jq failed even after stripping comments - configuration preserved"
            return 1
        fi
    else
        echo "Error: jq is required for worktree setup but not available" >&2
        echo "Please install jq to enable worktree detection" >&2
        debug_log "jq not available - cannot update devcontainer.json safely"
        return 1
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
    
    # Update existing devcontainer configuration with worktree support
    if [ -f "$DEVCONTAINER_JSON" ]; then
        debug_log "Existing devcontainer.json found - updating with worktree support"
        update_devcontainer_config "$main_repo_path"
    else
        echo "Error: No devcontainer.json found at $DEVCONTAINER_JSON" >&2
        echo "Worktree detection requires an existing devcontainer configuration." >&2
        echo "Please run 'claude-devcontainer init' in the main repository first." >&2
        debug_log "No devcontainer.json found - cannot add worktree support to non-existent config"
        exit 1
    fi
    
    echo "✅ Devcontainer configured for worktree with main repo mounted at /main-repo"
    debug_log "Setup complete"
}

# Run main function
main "$@"