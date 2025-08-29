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

# Function to log debug messages
debug_log() {
    if [ "$DEBUG_MODE" = "true" ]; then
        echo "[git-wrapper] $1" >&2
    fi
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

# Function to transform paths from host to container
transform_gitdir_path() {
    local gitdir_line="$1"
    local host_main_repo="${WORKTREE_HOST_MAIN_REPO:-}"
    local container_main_repo="${WORKTREE_CONTAINER_MAIN_REPO:-/main-repo}"
    
    if [ -n "$host_main_repo" ]; then
        echo "$gitdir_line" | sed "s|$host_main_repo|$container_main_repo|g"
    else
        echo "$gitdir_line"
    fi
}

# Function to handle worktree git command
handle_worktree_git() {
    local git_file=".git"
    local backup_file=".git.wrapper.$$"
    local temp_file=".git.temp.$$"
    local exit_code=0
    
    debug_log "Handling worktree git command: $*"
    
    # Check if .git file exists
    if [ ! -f "$git_file" ]; then
        debug_log ".git file not found, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Create backup of original .git file
    if ! cp "$git_file" "$backup_file" 2>/dev/null; then
        debug_log "Failed to backup .git file, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Create temporary .git file with container paths
    if grep -q "gitdir:" "$git_file" 2>/dev/null; then
        debug_log "Transforming gitdir paths for container"
        transform_gitdir_path "$(cat "$git_file")" > "$temp_file"
        
        if [ -s "$temp_file" ]; then
            mv "$temp_file" "$git_file"
            debug_log "Git file updated for container paths"
        else
            debug_log "Failed to transform paths, using original"
            mv "$backup_file" "$git_file"
            rm -f "$temp_file"
            "$REAL_GIT" "$@"
            return $?
        fi
    else
        debug_log ".git file doesn't contain gitdir, running normally"
        rm -f "$backup_file"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Setup cleanup trap
    cleanup() {
        debug_log "Cleaning up: restoring original .git file"
        if [ -f "$backup_file" ]; then
            mv "$backup_file" "$git_file" 2>/dev/null || true
        fi
        rm -f "$temp_file" 2>/dev/null || true
    }
    trap cleanup EXIT INT TERM
    
    # Execute the actual git command
    debug_log "Executing: $REAL_GIT $*"
    "$REAL_GIT" "$@"
    exit_code=$?
    
    # Cleanup (restore original .git file)
    cleanup
    trap - EXIT INT TERM
    
    debug_log "Git command completed with exit code: $exit_code"
    return $exit_code
}

# Main wrapper logic
main() {
    debug_log "Git wrapper called with: $*"
    
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
    "$REAL_GIT" "$@"
    return $?
}

# Execute main function with all arguments
main "$@"