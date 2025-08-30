#!/bin/bash
# Git Wrapper Script for Worktree Support in Containers
# Provides atomic per-command handling of git worktree .git file path translation
# Allows concurrent git operations between host and container

# Path to the real git binary
REAL_GIT="/usr/bin/git"

# Path to git utilities script
GIT_UTILS_SCRIPT="/home/claude-user/scripts/git_utils.py"

# Debug mode (set to true for verbose output)
DEBUG_MODE="${GIT_WRAPPER_DEBUG:-false}"

# Persistent log file for all wrapper executions
LOG_FILE="${GIT_WRAPPER_LOG_FILE:-/tmp/git-wrapper.log}"

# Host path preservation
SAVED_HOST_GIT_PATH="${GIT_WRAPPER_SAVED_HOST_PATH:-}"

# Function to log with timestamp to persistent file
persistent_log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')
    local pid=$$
    local pwd_dir=$(pwd)
    echo "[$timestamp] [PID:$pid] [PWD:$pwd_dir] $1" >> "$LOG_FILE"
}

# Function to log debug messages (both stderr and file)
debug_log() {
    local message="$1"
    if [ "$DEBUG_MODE" = "true" ]; then
        echo "[git-wrapper] $message" >&2
    fi
    persistent_log "$message"
}

# Function to log call stack trace (simplified - no process tree)
log_call_stack() {
    persistent_log "=== CALL STACK TRACE ==="
    persistent_log "Git command: $*"
    persistent_log "Parent PID: $PPID"
    persistent_log "Environment variables:"
    env | grep -E "(WORKTREE|GIT)" >> "$LOG_FILE" 2>/dev/null || persistent_log "env failed"
    persistent_log "=== END CALL STACK ==="
}

# Function to check if we're in a worktree using git_utils.py
is_worktree() {
    if [ -f "$GIT_UTILS_SCRIPT" ] && command -v python3 >/dev/null 2>&1; then
        python3 "$GIT_UTILS_SCRIPT" is-worktree 2>/dev/null | grep -q "true"
        return $?
    else
        # Fallback: check if .git is a file (basic worktree detection)
        [ -f .git ] && grep -q "gitdir:" .git 2>/dev/null
        return $?
    fi
}

# Function to get worktree info using git_utils.py
get_worktree_info() {
    if [ -f "$GIT_UTILS_SCRIPT" ] && command -v python3 >/dev/null 2>&1; then
        python3 "$GIT_UTILS_SCRIPT" json 2>/dev/null
    fi
}

# Function to detect if we're in a devcontainer
is_devcontainer() {
    [ -d "/workspaces" ] || [ -n "$CODESPACES" ] || [ -n "$DEVCONTAINER" ]
}

# Function to transform paths from host to container
transform_gitdir_path() {
    local gitdir_line="$1"
    local host_main_repo="${WORKTREE_HOST_MAIN_REPO:-}"
    local container_main_repo="${WORKTREE_CONTAINER_MAIN_REPO:-/main-repo}"
    
    debug_log "Transforming gitdir path: $gitdir_line"
    debug_log "Host main repo: $host_main_repo"
    debug_log "Container main repo: $container_main_repo"
    
    # If environment variables are set, use them for transformation
    if [ -n "$host_main_repo" ] && [ -n "$container_main_repo" ]; then
        local transformed
        transformed=$(echo "$gitdir_line" | sed "s|$host_main_repo|$container_main_repo|g")
        debug_log "Path transformed to: $transformed"
        echo "$transformed"
        return 0
    fi
    
    # Auto-detect devcontainer transformation if no explicit config
    if is_devcontainer; then
        debug_log "Devcontainer detected, attempting auto-transformation"
        
        # Try to auto-detect the main repo path transformation
        # Common patterns: /Users/user/Work/repo -> /main-repo
        local auto_transformed
        if echo "$gitdir_line" | grep -q "/Users/"; then
            # Extract the repo name from the path and assume it's mounted at /main-repo
            auto_transformed=$(echo "$gitdir_line" | sed 's|gitdir: /Users/[^/]*/Work/[^/]*|gitdir: /main-repo|')
            debug_log "Auto-transformed (macOS): $auto_transformed"
            echo "$auto_transformed"
            return 0
        elif echo "$gitdir_line" | grep -q "/home/"; then
            # Linux path pattern
            auto_transformed=$(echo "$gitdir_line" | sed 's|gitdir: /home/[^/]*/[^/]*|gitdir: /main-repo|')
            debug_log "Auto-transformed (Linux): $auto_transformed"
            echo "$auto_transformed"
            return 0
        fi
    fi
    
    # No transformation applied
    debug_log "No path transformation applied"
    echo "$gitdir_line"
}

# Simplified worktree git handler - no backup files needed
handle_worktree_git() {
    local exit_code=0
    local git_file=".git"
    
    debug_log "=== SIMPLIFIED WORKTREE GIT HANDLING START ==="
    debug_log "Handling worktree git command: $*"
    debug_log "Process ID: $$"
    debug_log "Working directory: $(pwd)"
    
    # Check if .git file exists
    if [ ! -f "$git_file" ]; then
        debug_log ".git file not found, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Store original content for logging
    local original_content=$(cat "$git_file" 2>/dev/null)
    debug_log "Original .git content: $original_content"
    
    # Transform .git file to container paths if it contains gitdir
    if echo "$original_content" | grep -q "gitdir:" 2>/dev/null; then
        debug_log "Transforming gitdir paths for container"
        local transformed_content=$(transform_gitdir_path "$original_content")
        debug_log "Transformed content: $transformed_content"
        
        # Write transformed content directly to .git file
        echo "$transformed_content" > "$git_file"
        debug_log "✅ Updated .git file with container paths"
    else
        debug_log ".git file doesn't contain gitdir, running normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    debug_log "=== WORKTREE GIT HANDLING SETUP COMPLETE ==="
    
    # Simple cleanup function - only restore host paths
    cleanup() {
        debug_log "=== CLEANUP: Restoring host paths ==="
        
        # Always restore host paths after git command
        if restore_original_host_path; then
            debug_log "✅ Successfully restored host paths"
        else
            debug_log "❌ Failed to restore host paths"
        fi
        
        # Log final state
        if [ -f "$git_file" ]; then
            local final_content=$(cat "$git_file" 2>/dev/null || echo "unreadable")
            debug_log "Final .git content: $final_content"
            persistent_log "FINAL_STATE: $final_content"
        fi
        
        debug_log "🏁 === GIT WRAPPER EXECUTION END ==="
    }
    trap cleanup EXIT INT TERM
    
    # Execute the actual git command
    debug_log "Executing: $REAL_GIT $*"
    "$REAL_GIT" "$@"
    exit_code=$?
    debug_log "Git command exit code: $exit_code"
    
    # Note: cleanup will be called automatically by trap
    debug_log "Git command completed with exit code: $exit_code"
    return $exit_code
}

# Function to get or compute the original host path for .git file
get_original_host_path() {
    # If we have a saved host path, use it
    if [ -n "$SAVED_HOST_GIT_PATH" ]; then
        debug_log "Using saved host path: $SAVED_HOST_GIT_PATH"
        echo "$SAVED_HOST_GIT_PATH"
        return 0
    fi
    
    # Try to compute host path from current .git content
    if [ -f .git ]; then
        local current_content=$(cat .git 2>/dev/null)
        debug_log "Current .git content: $current_content"
        
        # If it contains container path, transform back to host path
        if echo "$current_content" | grep -q "/main-repo/"; then
            local host_path=$(echo "$current_content" | sed "s|/main-repo|${WORKTREE_HOST_MAIN_REPO:-/Users/visheshd/Work/7tea1}|g")
            debug_log "Computed host path from container path: $host_path"
            echo "$host_path"
            return 0
        else
            # Already has host path
            debug_log "Already has host path: $current_content"
            echo "$current_content"
            return 0
        fi
    fi
    
    debug_log "⚠️ Could not determine original host path"
    return 1
}

# Function to restore original host path (replaces backup-based restore)
restore_original_host_path() {
    local original_path=$(get_original_host_path)
    
    if [ -n "$original_path" ]; then
        debug_log "Restoring original host path: $original_path"
        echo "$original_path" > ".git"
        debug_log "✅ Restored original host path to .git file"
        return 0
    else
        debug_log "❌ Could not restore original host path"
        return 1
    fi
}

# Main wrapper logic
main() {
    # Always log every execution with call stack
    debug_log "🚀 === GIT WRAPPER EXECUTION START ==="
    log_call_stack "$@"
    
    debug_log "Git wrapper called with: $*"
    
    # Log initial .git file state
    if [ -f .git ]; then
        local initial_git_content=$(cat .git 2>/dev/null)
        debug_log "Initial .git file content: $initial_git_content"
    else
        debug_log "No .git file found initially"
    fi
    
    # Check if worktree environment variables are set
    if [ "${WORKTREE_DETECTED:-false}" = "true" ]; then
        debug_log "Worktree detected via environment variable"
        handle_worktree_git "$@"
        return $?
    fi
    
    # Check if we're in a worktree directory
    if is_worktree; then
        debug_log "Worktree detected in current directory"
        handle_worktree_git "$@"
        return $?
    fi
    
    # Not in a worktree, run git normally
    debug_log "Not in worktree, running git normally"
    debug_log "🏁 === GIT WRAPPER EXECUTION END (NORMAL) ==="
    "$REAL_GIT" "$@"
    return $?
}

# Execute main function with all arguments
main "$@"