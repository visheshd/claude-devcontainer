#!/usr/bin/env bash
# Build and run
set -euo pipefail
trap 'echo "$0: line $LINENO: $BASH_COMMAND: exitcode $?"' ERR
# ABOUTME: Startup script for claude-docker container with MCP server
# ABOUTME: Loads twilio env vars, checks for .credentials.json, copies CLAUDE.md template if no claude.md in claude-docker/claude-home.
# ABOUTME: Starts claude code with permissions bypass and continues from last session.

# Load environment variables from .env if it exists
if [ -f /app/.env ]; then
    echo "Loading environment from baked-in .env file"
    set -a
    source /app/.env 2>/dev/null || true
    set +a
    export TWILIO_ACCOUNT_SID
    export TWILIO_AUTH_TOKEN
    export TWILIO_FROM_NUMBER
    export TWILIO_TO_NUMBER
else
    echo "WARNING: No .env file found in image."
fi

# Check for existing authentication
if [ -f "$HOME/.claude/.credentials.json" ]; then
    echo "Found existing Claude authentication"
else
    echo "No existing authentication found - you will need to log in"
    echo "Your login will be saved for future sessions"
fi

# Handle CLAUDE.md template
if [ ! -f "$HOME/.claude/CLAUDE.md" ]; then
    echo "✓ No CLAUDE.md found - copying template"
    if [ -f "/app/.claude/CLAUDE.md" ]; then
        cp "/app/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
    elif [ -f "/home/claude-user/.claude.template/CLAUDE.md" ]; then
        cp "/home/claude-user/.claude.template/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
    fi
    echo "  Template copied to: $HOME/.claude/CLAUDE.md"
else
    echo "✓ Using existing CLAUDE.md from $HOME/.claude/CLAUDE.md"
fi


# macOS builder check
echo "Checking macOS native build support..."
if [ "${ENABLE_MACOS_BUILDS:-false}" = "true" ]; then
    if command -v python3 >/dev/null 2>&1 && [ -f "/home/claude-user/scripts/macos_builder.py" ]; then
        BUILD_STATUS=$(python3 /home/claude-user/scripts/macos_builder.py status 2>/dev/null || true)
        if echo "$BUILD_STATUS" | grep -q "Connection Available: True"; then
            echo "✓ macOS native builds available"
            PROJECT_TYPE=$(echo "$BUILD_STATUS" | grep "Project Type:" | cut -d: -f2- | xargs || true)
            CONFIGURED_COMMANDS=$(echo "$BUILD_STATUS" | grep "Configured Commands:" | cut -d: -f2- | xargs || true)
            echo "  Project: $PROJECT_TYPE"
            echo "  Commands: $CONFIGURED_COMMANDS"
        else
            echo "⚠️  macOS build connection failed"
        fi
    else
        echo "⚠️  macOS builder script missing"
    fi
else
    echo "macOS native builds disabled"
fi

# Twilio check
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ]; then
    echo "✓ Twilio MCP server configured"
else
    echo "No Twilio credentials found - SMS disabled"
fi

# Start Claude Code directly with exec
echo "Starting Claude Code..."
exec claude $CLAUDE_CONTINUE_FLAG --dangerously-skip-permissions "$@"
