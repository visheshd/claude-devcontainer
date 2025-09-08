#!/bin/bash
# Claude Code Wrapper Script for Container Environments
# Uses subscription-first authentication with token fallback

# Path to the real claude binary  
REAL_CLAUDE="/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js"

# Function to try subscription authentication first
try_subscription_auth() {
    # Unset any existing API key to force subscription fallback
    unset ANTHROPIC_API_KEY
    unset ANTHROPIC_AUTH_TOKEN
    
    # Set environment variables for subscription bypass
    export CLAUDE_USE_SUBSCRIPTION="true"
    export CLAUDE_BYPASS_BALANCE_CHECK="true"
    export CLAUDE_CODE_ENTRYPOINT="container-wrapper"
    
    echo "[DEBUG] Trying subscription authentication..." >&2
    return 0
}

# Function to fallback to token extraction from .credentials.json
try_token_auth() {
    local creds_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.credentials.json"
    
    if [ -f "$creds_file" ]; then
        echo "[DEBUG] Falling back to token authentication..." >&2
        
        # Extract OAuth access token using jq
        local access_token=$(jq -r '.claudeAiOauth.accessToken // empty' "$creds_file" 2>/dev/null)
        
        if [ -n "$access_token" ] && [ "$access_token" != "null" ]; then
            # Clear subscription environment variables
            unset CLAUDE_USE_SUBSCRIPTION
            unset CLAUDE_BYPASS_BALANCE_CHECK
            unset CLAUDE_CODE_ENTRYPOINT
            
            # Export token as API key (no Bearer prefix)
            export ANTHROPIC_API_KEY="$access_token"
            echo "[DEBUG] Using extracted OAuth token" >&2
            return 0
        else
            echo "[DEBUG] No valid token found in credentials file" >&2
            return 1
        fi
    else
        echo "[DEBUG] No credentials file found at $creds_file" >&2
        return 1
    fi
}

# Authentication strategy with fallback
authenticate() {
    echo "[DEBUG] Setting up Claude Code authentication..." >&2
    
    # Always try subscription authentication first
    try_subscription_auth
    
    # For now, we always use subscription auth as primary
    # The token fallback function is available if needed for debugging
    echo "[DEBUG] Primary: Subscription authentication configured" >&2
    
    local creds_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.credentials.json"
    if [ -f "$creds_file" ]; then
        echo "[DEBUG] Fallback: Token authentication available if needed" >&2
        # Uncomment the next line to force token auth instead:
        # try_token_auth
    fi
}

# Set up authentication
authenticate

# Startup initialization is no longer needed - git-wrapper.sh handles safe directories automatically

# Check if --dangerously-skip-permissions is already in the arguments
if [[ "$*" == *"--dangerously-skip-permissions"* ]]; then
    # Already has the flag, run normally
    exec node "$REAL_CLAUDE" "$@"
else
    # Add the flag for container safety
    exec node "$REAL_CLAUDE" --dangerously-skip-permissions "$@"
fi