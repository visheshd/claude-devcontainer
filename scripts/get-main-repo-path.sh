#!/bin/bash
# Dynamic Main Repository Path Resolution
# Sets environment variable for devcontainer mount configuration
# For worktrees: exports MAIN_REPO_PATH to main repository path
# For regular repos: exports MAIN_REPO_PATH to current directory

set -e

CURRENT_DIR="${1:-$(pwd)}"

# Check if we're in a git worktree
if [ -f "$CURRENT_DIR/.git" ] && grep -q "gitdir:" "$CURRENT_DIR/.git" 2>/dev/null; then
    # We're in a worktree - extract main repo path
    gitdir_line=$(cat "$CURRENT_DIR/.git")
    gitdir_path=$(echo "$gitdir_line" | sed 's/gitdir: //')
    main_repo_path=$(echo "$gitdir_path" | sed 's|/\.git/worktrees/.*|/.git|')
    main_repo_path=$(dirname "$main_repo_path")
    export MAIN_REPO_PATH="$main_repo_path"
    echo "export MAIN_REPO_PATH=\"$main_repo_path\""
else
    # Regular repository - use current directory
    export MAIN_REPO_PATH="$CURRENT_DIR"
    echo "export MAIN_REPO_PATH=\"$CURRENT_DIR\""
fi