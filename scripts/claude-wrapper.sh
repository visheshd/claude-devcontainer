#!/bin/bash
# Claude Code Wrapper Script for Container Environments
# Automatically adds --dangerously-skip-permissions for container usage

# Path to the real claude binary  
REAL_CLAUDE="/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js"

# Check if --dangerously-skip-permissions is already in the arguments
if [[ "$*" == *"--dangerously-skip-permissions"* ]]; then
    # Already has the flag, run normally
    exec node "$REAL_CLAUDE" "$@"
else
    # Add the flag for container safety
    exec node "$REAL_CLAUDE" --dangerously-skip-permissions "$@"
fi