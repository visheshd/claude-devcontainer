#!/bin/bash
# Devcontainer Git Wrapper Configuration Script
# Runs inside container after creation to configure git wrapper environment
# Sets up environment variables and validates worktree setup

set -e

# Debug mode
DEBUG="${WORKTREE_SETUP_DEBUG:-false}"

debug_log() {
    if [ "$DEBUG" = "true" ]; then
        echo "[git-wrapper-config] $1" >&2
    fi
}

# Check if we're in a devcontainer environment
is_devcontainer() {
    [ -d "/workspaces" ] || [ -n "$CODESPACES" ] || [ -n "$DEVCONTAINER" ]
}

# Validate worktree environment setup
validate_worktree_setup() {
    debug_log "Validating worktree environment setup"
    
    local errors=0
    
    # Check required environment variables
    if [ -z "$WORKTREE_HOST_MAIN_REPO" ]; then
        echo "Warning: WORKTREE_HOST_MAIN_REPO not set" >&2
        errors=$((errors + 1))
    fi
    
    if [ -z "$WORKTREE_CONTAINER_MAIN_REPO" ]; then
        echo "Warning: WORKTREE_CONTAINER_MAIN_REPO not set" >&2
        errors=$((errors + 1))
    fi
    
    # Check if main repo is mounted
    if [ ! -d "$WORKTREE_CONTAINER_MAIN_REPO" ]; then
        echo "Warning: Main repository not mounted at $WORKTREE_CONTAINER_MAIN_REPO" >&2
        errors=$((errors + 1))
    fi
    
    # Check if main repo has .git directory
    if [ ! -d "$WORKTREE_CONTAINER_MAIN_REPO/.git" ]; then
        echo "Warning: Main repository .git not found at $WORKTREE_CONTAINER_MAIN_REPO/.git" >&2
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        echo "⚠️  Worktree setup validation found $errors issues" >&2
        debug_log "Environment variables:"
        debug_log "  WORKTREE_DETECTED=${WORKTREE_DETECTED:-unset}"
        debug_log "  WORKTREE_HOST_MAIN_REPO=${WORKTREE_HOST_MAIN_REPO:-unset}"
        debug_log "  WORKTREE_CONTAINER_MAIN_REPO=${WORKTREE_CONTAINER_MAIN_REPO:-unset}"
        debug_log "  WORKTREE_NAME=${WORKTREE_NAME:-unset}"
        return 1
    fi
    
    debug_log "Worktree setup validation passed"
    return 0
}

# Configure git settings for the container
configure_git_settings() {
    debug_log "Configuring git settings"
    
    # Set git safe directory to avoid dubious ownership warnings
    local workspace_dir="/workspaces"
    if [ -d "$workspace_dir" ]; then
        for dir in "$workspace_dir"/*; do
            if [ -d "$dir" ]; then
                debug_log "Adding safe directory: $dir"
                git config --global --add safe.directory "$dir"
            fi
        done
    fi
    
    # Add main repo as safe directory too
    if [ -d "$WORKTREE_CONTAINER_MAIN_REPO" ]; then
        debug_log "Adding main repo safe directory: $WORKTREE_CONTAINER_MAIN_REPO"
        git config --global --add safe.directory "$WORKTREE_CONTAINER_MAIN_REPO"
    fi
    
    debug_log "Git settings configured"
}

# Test git wrapper functionality
test_git_wrapper() {
    debug_log "Testing git wrapper functionality"
    
    local current_dir
    current_dir=$(pwd)
    
    # Test basic git command
    if git --version >/dev/null 2>&1; then
        debug_log "Git wrapper is accessible"
    else
        echo "Error: Git wrapper not working" >&2
        return 1
    fi
    
    # Test in worktree directory if available
    local workspace_dir
    if [ -n "$WORKTREE_NAME" ]; then
        workspace_dir="/workspaces/$WORKTREE_NAME"
        if [ -d "$workspace_dir" ]; then
            cd "$workspace_dir"
            
            if GIT_WRAPPER_DEBUG=false git status >/dev/null 2>&1; then
                debug_log "Git operations work in worktree directory"
            else
                echo "Warning: Git operations may not work correctly in worktree" >&2
                cd "$current_dir"
                return 1
            fi
            
            cd "$current_dir"
        fi
    fi
    
    debug_log "Git wrapper functionality test passed"
    return 0
}

# Display setup summary
display_setup_summary() {
    echo "🔧 Git Wrapper Container Configuration Complete"
    echo ""
    echo "Environment:"
    echo "  Devcontainer: $(is_devcontainer && echo "Yes" || echo "No")"
    echo "  Worktree detected: ${WORKTREE_DETECTED:-false}"
    echo "  Main repo (host): ${WORKTREE_HOST_MAIN_REPO:-not set}"
    echo "  Main repo (container): ${WORKTREE_CONTAINER_MAIN_REPO:-not set}"
    echo "  Worktree name: ${WORKTREE_NAME:-not set}"
    echo ""
    
    if [ -d "$WORKTREE_CONTAINER_MAIN_REPO" ]; then
        echo "✅ Main repository mounted successfully"
    else
        echo "❌ Main repository not mounted"
    fi
    
    echo ""
    echo "Git wrapper ready for worktree operations!"
}

# Main execution
main() {
    debug_log "Starting git wrapper configuration"
    
    # Check if we're in a devcontainer
    if ! is_devcontainer; then
        debug_log "Not in a devcontainer environment, skipping configuration"
        exit 0
    fi
    
    debug_log "Devcontainer environment detected"
    
    # Only run setup if worktree is detected
    if [ "$WORKTREE_DETECTED" != "true" ]; then
        debug_log "Worktree not detected, skipping git wrapper configuration"
        exit 0
    fi
    
    debug_log "Worktree detected, configuring git wrapper"
    
    # Configure git settings
    configure_git_settings
    
    # Validate setup
    if ! validate_worktree_setup; then
        echo "⚠️  Setup validation failed, but continuing..." >&2
    fi
    
    # Test git wrapper
    if ! test_git_wrapper; then
        echo "⚠️  Git wrapper test failed, but continuing..." >&2
    fi
    
    # Display summary
    display_setup_summary
    
    debug_log "Git wrapper configuration complete"
}

# Run main function
main "$@"