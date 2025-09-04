#!/bin/bash
# Dynamic Main Repository Path Resolution
# Writes main repo path to .devcontainer/worktree.env for mount configuration
# For worktrees: writes main repository path
# For regular repos: writes current directory

set -e

CURRENT_DIR="${1:-$(pwd)}"
OUTPUT_FILE="$CURRENT_DIR/.devcontainer/worktree.env"

# Check if we're in a git worktree
if [ -f "$CURRENT_DIR/.git" ] && grep -q "gitdir:" "$CURRENT_DIR/.git" 2>/dev/null; then
    # We're in a worktree - extract main repo path
    gitdir_line=$(cat "$CURRENT_DIR/.git")
    gitdir_path=$(echo "$gitdir_line" | sed 's/gitdir: //')
    main_repo_path=$(echo "$gitdir_path" | sed 's|/\.git/worktrees/.*|/.git|')
    main_repo_path=$(dirname "$main_repo_path")
    echo "$main_repo_path" > "$OUTPUT_FILE"
else
    # Regular repository - use current directory
    echo "$CURRENT_DIR" > "$OUTPUT_FILE"
fi