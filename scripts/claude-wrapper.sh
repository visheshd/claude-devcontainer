#!/bin/bash
# Claude Code Wrapper Script for Container Environments
# Automatically adds --dangerously-skip-permissions and extracts OAuth token

# Path to the real claude binary  
REAL_CLAUDE="/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js"

# Extract and export OAuth token if credentials exist
CREDS_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.credentials.json"
if [ -f "$CREDS_FILE" ]; then
    # Extract OAuth access token using jq
    ACCESS_TOKEN=$(jq -r '.claudeAiOauth.accessToken // empty' "$CREDS_FILE" 2>/dev/null)
    if [ -n "$ACCESS_TOKEN" ]; then
        export ANTHROPIC_AUTH_TOKEN="$ACCESS_TOKEN"
    fi
fi

# Check if --dangerously-skip-permissions is already in the arguments
if [[ "$*" == *"--dangerously-skip-permissions"* ]]; then
    # Already has the flag, run normally
    exec node "$REAL_CLAUDE" "$@"
else
    # Add the flag for container safety
    exec node "$REAL_CLAUDE" --dangerously-skip-permissions "$@"
fi