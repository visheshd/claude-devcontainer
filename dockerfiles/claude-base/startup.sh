#!/bin/bash
# Startup script for Claude Base Image
# Configures environment and starts Claude Code with proper authentication

# Check for existing authentication
if [ -f "$HOME/.claude/.credentials.json" ]; then
    echo "✓ Found existing Claude authentication"
else
    echo "No existing authentication found - you will need to log in"
    echo "Your login will be saved for future sessions"
fi

# Handle CLAUDE.md template if provided
if [ ! -f "$HOME/.claude/CLAUDE.md" ]; then
    echo "No CLAUDE.md found in home directory"
    # DevContainer features will handle CLAUDE.md template copying
else
    echo "✓ Using existing CLAUDE.md from $HOME/.claude/CLAUDE.md"
fi

echo "Starting Claude Code..."
exec claude --dangerously-skip-permissions "$@"