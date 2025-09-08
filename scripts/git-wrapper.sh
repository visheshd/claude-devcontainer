#!/bin/bash
# Git Wrapper Script for Worktree Support in Containers
# Provides atomic per-command handling of git worktree .git file path translation
# Allows concurrent git operations between host and container

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


# Function to transform paths from host to container
transform_gitdir_path() {
    local gitdir_line="$1"
    local host_main_repo="$WORKTREE_HOST_MAIN_REPO"
    local container_main_repo="${WORKTREE_MOUNT_PATH:-/main-repo}"
    
    debug_log "Transforming gitdir path: $gitdir_line"
    debug_log "Host main repo: $host_main_repo"
    debug_log "Container main repo: $container_main_repo"
    
    # Transform host path to container path
    local transformed
    transformed=$(echo "$gitdir_line" | sed "s|$host_main_repo|$container_main_repo|g")
    debug_log "Path transformed to: $transformed"
    echo "$transformed"
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

# Improved worktree git handler with atomic operations
handle_worktree_git() {
    local exit_code=0
    local git_file=".git"
    local original_content=""
    
    debug_log "=== IMPROVED WORKTREE GIT HANDLING START ==="
    debug_log "Handling worktree git command: $*"
    debug_log "Process ID: $$"
    debug_log "Working directory: $(pwd)"
    
    # Ensure git safe directory is configured
    ensure_git_safe_directory
    
    # Check if .git file exists
    if [ ! -f "$git_file" ]; then
        debug_log ".git file not found, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Store original content safely
    original_content=$(cat "$git_file" 2>/dev/null)
    if [ -z "$original_content" ]; then
        debug_log "❌ Failed to read .git file or file is empty"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    debug_log "Original .git content: $original_content"
    
    # Validate original content
    if ! validate_git_file "$git_file" "$original_content"; then
        debug_log "❌ Original .git file is corrupted, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    # Transform .git file to container paths if it contains gitdir
    if echo "$original_content" | grep -q "gitdir:" 2>/dev/null; then
        debug_log "Transforming gitdir paths for container"
        local transformed_content=$(transform_gitdir_path "$original_content")
        debug_log "Transformed content: $transformed_content"
        
        # Write transformed content atomically
        if atomic_write_git_file "$git_file" "$transformed_content"; then
            debug_log "✅ Updated .git file with container paths"
        else
            debug_log "❌ Failed to write transformed content, running git normally"
            "$REAL_GIT" "$@"
            return $?
        fi
    else
        debug_log ".git file doesn't contain gitdir, running git normally"
        "$REAL_GIT" "$@"
        return $?
    fi
    
    debug_log "=== WORKTREE GIT HANDLING SETUP COMPLETE ==="
    
    # Improved cleanup function with proper error handling
    cleanup() {
        local cleanup_exit_code=$?
        debug_log "=== CLEANUP: Restoring host paths (exit_code=$cleanup_exit_code) ==="
        
        # Always restore original content after git command
        if [ -n "$original_content" ]; then
            if atomic_write_git_file "$git_file" "$original_content"; then
                debug_log "✅ Successfully restored original .git content"
            else
                debug_log "❌ Failed to restore original .git content atomically"
                # Fallback to direct write if atomic write fails
                if echo "$original_content" > "$git_file" 2>/dev/null; then
                    debug_log "✅ Restored original content using fallback method"
                else
                    debug_log "❌ CRITICAL: Failed to restore .git file with any method"
                fi
            fi
        else
            debug_log "⚠️ No original content to restore"
        fi
        
        # Log final state and validate
        if [ -f "$git_file" ]; then
            local final_content=$(cat "$git_file" 2>/dev/null || echo "unreadable")
            debug_log "Final .git content: $final_content"
            persistent_log "FINAL_STATE: $final_content"
            
            # Validate final state
            if validate_git_file "$git_file" "$final_content"; then
                debug_log "✅ Final .git file validation passed"
            else
                debug_log "❌ Final .git file validation failed"
            fi
        else
            debug_log "❌ .git file missing after cleanup"
        fi
        
        debug_log "🏁 === GIT WRAPPER EXECUTION END ==="
        
        # Preserve original exit code
        exit $cleanup_exit_code
    }
    trap cleanup EXIT INT TERM
    
    # Execute the actual git command
    debug_log "Executing: $REAL_GIT $*"
    "$REAL_GIT" "$@"
    exit_code=$?
    debug_log "Git command exit code: $exit_code"
    
    # Note: cleanup will be called automatically by trap
    debug_log "Git command completed with exit code: $exit_code"
    
    # Store exit code for cleanup function
    return $exit_code
}

# Legacy functions - kept for backwards compatibility but no longer used
# The new implementation stores the original content directly in handle_worktree_git()

# Function to get or compute the original host path for .git file (DEPRECATED)
get_original_host_path() {
    debug_log "WARNING: Using deprecated get_original_host_path function"
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
            # Use environment variable if available
            if [ -n "$WORKTREE_HOST_MAIN_REPO" ]; then
                local host_path=$(echo "$current_content" | sed "s|/main-repo|$WORKTREE_HOST_MAIN_REPO|g")
                debug_log "Computed host path using env var: $host_path"
                echo "$host_path"
                return 0
            else
                debug_log "⚠️ Container path detected but WORKTREE_HOST_MAIN_REPO not set"
                debug_log "Cannot restore host path - keeping container path"
                echo "$current_content"
                return 0
            fi
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

# Function to restore original host path (DEPRECATED)
restore_original_host_path() {
    debug_log "WARNING: Using deprecated restore_original_host_path function"
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
    
    # Simple check: environment variable set AND we're in a worktree
    if [ -n "$WORKTREE_HOST_MAIN_REPO" ] && [ -f .git ]; then
        debug_log "Worktree detected: WORKTREE_HOST_MAIN_REPO=$WORKTREE_HOST_MAIN_REPO"
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