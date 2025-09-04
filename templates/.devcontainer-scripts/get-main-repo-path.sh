#!/bin/bash
# Dynamic Main Repository Path Resolution
# Writes environment variables in KEY=value format for Docker --env-file
# For worktrees: sets main repository path
# For regular repos: sets current directory

set -e

CURRENT_DIR="${1:-$(pwd)}"

# Check if we're in a git worktree
if [ -f "$CURRENT_DIR/.git" ] && grep -q "gitdir:" "$CURRENT_DIR/.git" 2>/dev/null; then
    # We're in a worktree - extract main repo path
    gitdir_line=$(cat "$CURRENT_DIR/.git")
    gitdir_path=$(echo "$gitdir_line" | sed 's/gitdir: //')
    main_repo_path=$(echo "$gitdir_path" | sed 's|/\.git/worktrees/.*|/.git|')
    main_repo_path=$(dirname "$main_repo_path")
    echo "MAIN_REPO_PATH=$main_repo_path"
else
    # Regular repository - use current directory
    echo "MAIN_REPO_PATH=$CURRENT_DIR"
fi