#!/bin/sh
# Dynamic Main Repository Path Resolution
# Writes environment variables in KEY=value format for Docker --env-file
# For worktrees: sets main repository path
# For regular repos: sets current directory

set -e
cd "$1" || exit

# Check if we're in a git worktree
if [ -f ".git" ] && grep -q "gitdir:" ".git" 2>/dev/null; then
    # We're in a worktree - extract main repo path
    GIT_DIR_PATH=$(cat .git | sed 's/gitdir: //g')
    MAIN_REPO_PATH=$(dirname "$(readlink "$GIT_DIR_PATH")")
    echo "MAIN_REPO_PATH=$MAIN_REPO_PATH"
else
    # Regular repository - use current directory
    MAIN_REPO_PATH=$(pwd)
    echo "MAIN_REPO_PATH=$MAIN_REPO_PATH"
fi