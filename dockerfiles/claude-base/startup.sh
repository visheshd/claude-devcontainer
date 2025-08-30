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

# Check for mounted Claude directory
if [ -d "$HOME/.claude" ] && [ "$(ls -A $HOME/.claude 2>/dev/null)" ]; then
    echo "✓ Found mounted Claude directory with user customizations"
    
    # Check for specific customizations
    [ -f "$HOME/.claude/CLAUDE.md" ] && echo "  • Global CLAUDE.md instructions"
    [ -d "$HOME/.claude/agents" ] && [ "$(ls -A $HOME/.claude/agents 2>/dev/null)" ] && echo "  • Custom agents available"
    [ -d "$HOME/.claude/commands" ] && [ "$(ls -A $HOME/.claude/commands 2>/dev/null)" ] && echo "  • Custom commands available"
    [ -f "$HOME/.claude/settings.json" ] && echo "  • Personal settings preserved"
    [ -d "$HOME/.claude/projects" ] && [ "$(ls -A $HOME/.claude/projects 2>/dev/null)" ] && echo "  • Project history available"
else
    echo "No Claude user data mounted (first run or mount not configured)"
    echo "Your Claude customizations will be created in this container session"
fi

echo "Starting Claude Code..."
exec claude --dangerously-skip-permissions "$@"