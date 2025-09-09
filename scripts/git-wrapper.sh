#!/bin/bash
# Git Wrapper Script for Worktree Support in Containers  
# Provides atomic per-command handling of git worktree .git file path translation
# Allows concurrent git operations between host and container
# FIXED: Simple approach using direct sed transforms, no buggy original_content preservation

# Path to the real git binary
REAL_GIT="/usr/bin/git"


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

# Simple worktree detection - just check if .git is a file
is_worktree() {
    [ -f .git ]
}



# Add git safe directory configuration
ensure_git_safe_directory() {
    local repo_path="$(pwd)"
    debug_log "Ensuring safe directory for: $repo_path"
    
    # Check if already configured
    if "$REAL_GIT" config --global --get-all safe.directory | grep -Fxq "$repo_path" 2>/dev/null; then
        debug_log "Safe directory already configured for: $repo_path"
        return 0
    fi
    
    # Add safe directory
    "$REAL_GIT" config --global --add safe.directory "$repo_path" 2>/dev/null
    if [ $? -eq 0 ]; then
        debug_log "✅ Added safe directory: $repo_path"
    else
        debug_log "⚠️ Failed to add safe directory: $repo_path"
    fi
}

# Validate .git file content
validate_git_file() {
    local git_file="$1"
    local content="$2"
    
    if [ -z "$content" ]; then
        debug_log "❌ .git file content is empty"
        return 1
    fi
    
    if ! echo "$content" | grep -q "^gitdir: " 2>/dev/null; then
        debug_log "❌ .git file doesn't contain valid gitdir line"
        return 1
    fi
    
    # Check for multiple lines (corruption indicator)
    local line_count=$(echo "$content" | wc -l)
    if [ "$line_count" -gt 1 ]; then
        debug_log "❌ .git file contains multiple lines (corrupted): $line_count lines"
        return 1
    fi
    
    debug_log "✅ .git file content is valid"
    return 0
}

# Atomic file write operation
atomic_write_git_file() {
    local git_file="$1"
    local content="$2"
    local temp_file="${git_file}.tmp.$$"
    
    debug_log "Writing content atomically to $git_file"
    debug_log "Using temp file: $temp_file"
    
    # Validate content before writing
    if ! validate_git_file "$git_file" "$content"; then
        debug_log "❌ Content validation failed, aborting write"
        return 1
    fi
    
    # Write to temp file
    if echo "$content" > "$temp_file" 2>/dev/null; then
        # Atomic move
        if mv "$temp_file" "$git_file" 2>/dev/null; then
            debug_log "✅ Atomically wrote content to $git_file"
            return 0
        else
            debug_log "❌ Failed to move temp file to $git_file"
            rm -f "$temp_file" 2>/dev/null
            return 1
        fi
    else
        debug_log "❌ Failed to write to temp file $temp_file"
        rm -f "$temp_file" 2>/dev/null
        return 1
    fi
}

# Simple worktree git handler - use environment variables directly
handle_worktree_git() {
    local exit_code=0
    local git_file=".git"

    debug_log "=== SIMPLE WORKTREE GIT HANDLING START ==="
    debug_log "Handling worktree git command: $*"
    debug_log "Using environment variables directly"

    # Ensure safe directory is configured for this workspace (with safety checks)
    current_dir="$(pwd)"
    if [ -d "/workspaces" ] && echo "$current_dir" | grep -q "^/workspaces" && [ -d "$current_dir" ]; then
        # Validate that current_dir looks like a safe path
        if echo "$current_dir" | grep -qE "^/workspaces/[^/]+(/.*)?$"; then
            if ! "$REAL_GIT" config --global --get-all safe.directory 2>/dev/null | grep -Fxq "$current_dir"; then
                debug_log "Adding safe directory: $current_dir"
                "$REAL_GIT" config --global --add safe.directory "$current_dir" 2>/dev/null || debug_log "Failed to add safe directory"
            fi
        else
            debug_log "⚠️ Skipping safe directory for suspicious path: $current_dir"
        fi
    fi

    # Store current content and construct proper host content
    local current_content=""
    if [ -f "$git_file" ]; then
        current_content=$(cat "$git_file" 2>/dev/null)
        debug_log "Current .git content: $current_content"

        # Validate current content
        if ! validate_git_file "$git_file" "$current_content"; then
            debug_log "❌ Current .git file is corrupted, running git normally"
            "$REAL_GIT" "$@"
            return $?
        fi
    else
        debug_log ".git file not found, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi

    # Construct container .git content directly from environment variables
    # Use defaults if environment variables are missing
    local worktree_mount="${WORKTREE_MOUNT_PATH:-/main-repo}"
    local worktree_name="${WORKTREE_NAME:-$(basename "$(pwd)")}"
    local host_repo="${WORKTREE_HOST_MAIN_REPO:-/tmp/fallback}"

    local container_gitdir="$worktree_mount/.git/worktrees/$worktree_name"
    local container_content="gitdir: $container_gitdir"
    debug_log "Container .git content: $container_content"

    local host_gitdir="$host_repo/.git/worktrees/$worktree_name"
    local host_content="gitdir: $host_gitdir"
    debug_log "Host .git content: $host_content"

    # Write container content using atomic operation
    if atomic_write_git_file "$git_file" "$container_content"; then
        debug_log "✅ Safely updated .git file with container paths"
    else
        debug_log "❌ Failed to update .git file atomically"
        "$REAL_GIT" "$@"
        return $?
    fi

    # Execute git command
    debug_log "Executing: $REAL_GIT $*"
    "$REAL_GIT" "$@"
    exit_code=$?

    # Always restore to proper host content using atomic operation
    if atomic_write_git_file "$git_file" "$host_content"; then
        debug_log "✅ Safely restored .git file to host paths"
        # Tiny delay to ensure file is fully written and available for subsequent commands
        # This prevents race conditions when AI agents run git commands in rapid succession
        sleep 0.1 2>/dev/null || sleep 1 2>/dev/null || true
    else
        debug_log "❌ Failed to restore .git file to host paths atomically"
        # Emergency fallback - try to restore what we started with
        if [ -n "$current_content" ]; then
            if echo "$current_content" > "$git_file" 2>/dev/null; then
                debug_log "⚠️ Emergency restore to original content"
                # Tiny delay for emergency fallback too
                sleep 0.1 2>/dev/null || sleep 1 2>/dev/null || true
            else
                debug_log "❌ CRITICAL: Could not restore .git file"
            fi
        fi
    fi

    debug_log "Git command exit code: $exit_code"
    return $exit_code
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
    
    # Only apply worktree handling for commands that actually need path translation
    # Skip configuration commands and commands that don't interact with repository files
    local skip_commands="config --global|config --system|config --local|init|clone|version|--version|--help|-h"
    local command_string="$*"

    if [ -n "$WORKTREE_HOST_MAIN_REPO" ] && [ -f .git ] && ! echo "$command_string" | grep -qE "$skip_commands"; then
        debug_log "Worktree detected and command needs path translation: WORKTREE_HOST_MAIN_REPO=$WORKTREE_HOST_MAIN_REPO"

        # Basic check - we have a host repo defined
        if [ -z "$WORKTREE_HOST_MAIN_REPO" ]; then
            debug_log "⚠️ Missing WORKTREE_HOST_MAIN_REPO, falling back to normal git"
            "$REAL_GIT" "$@"
            return $?
        fi

        handle_worktree_git "$@"
        return $?
    fi
    
    # Not in a worktree or no environment variable, run git normally
    debug_log "Not in worktree or no environment variable, running git normally"
    debug_log "🏁 === GIT WRAPPER EXECUTION END (NORMAL) ==="
    "$REAL_GIT" "$@"
    return $?
}

# Execute main function with all arguments
main "$@"