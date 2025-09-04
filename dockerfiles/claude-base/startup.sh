#!/bin/bash
# Startup script for Claude Base Image
# Configures environment and starts Claude Code with persistent authentication

# Function to check authentication files
check_auth() {
    local auth_found=false
    
    # Check for .credentials.json (OAuth/API key auth)
    if [ -f "$HOME/.claude/.credentials.json" ]; then
        echo "✓ Found OAuth/API credentials at ~/.claude/.credentials.json"
        auth_found=true
    fi
    
    
    if [ "$auth_found" = true ]; then
        echo "✓ Authentication available - no login required"
        return 0
    else
        echo "⚠ No authentication found - you will need to log in"
        echo "  Your login will be saved for future container sessions"
        return 1
    fi
}

# Check and handle authentication
check_auth
AUTH_STATUS=$?


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

# Show Claude Code startup instructions
if [ $AUTH_STATUS -eq 0 ]; then
    # Authentication found - ready to use
    echo "  ✅ Ready! Your authentication is configured."
    echo ""
    echo "🚀 To start Claude Code, run:"
    echo "   claude"
else
    # No auth found - will need to authenticate interactively
    echo "  ⚠️  Authentication required on first use"
    echo ""
    echo "🚀 To start Claude Code and authenticate, run:"
    echo "   claude"
fi

echo ""
echo "💡 Your authentication and settings will persist across container restarts."