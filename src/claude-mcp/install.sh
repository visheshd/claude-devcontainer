#!/bin/bash
# Claude MCP Servers DevContainer Feature Installation Script

set -e

# Feature options
SERVERS="${SERVERS:-"serena,context7"}"
ADDITIONAL_SERVERS="${ADDITIONALSERVERS:-""}"
ENABLE_ENV_VARS="${ENABLEENVIRONMENTVARIABLES:-"true"}"
INSTALL_LOCATION="${INSTALLLOCATION:-"user"}"

echo "Installing Claude MCP Servers feature..."
echo "Servers: $SERVERS"
echo "Install location: $INSTALL_LOCATION"

# Determine installation scope
if [ "$INSTALL_LOCATION" = "system" ]; then
    INSTALL_SCOPE="-s system"
else
    INSTALL_SCOPE="-s user"
fi

# Create MCP server definitions
create_server_definitions() {
    cat > /tmp/mcp-servers.txt << 'EOF'
# MCP Server Configuration File
# Each line should contain a complete claude mcp add or claude mcp add-json command
# Use ${VAR_NAME} for environment variable substitution
# Lines starting with # are comments and will be ignored

# Serena - Coding agent toolkit
claude mcp add $INSTALL_SCOPE serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant

# Context7 - Up-to-date documentation and code examples from source
claude mcp add $INSTALL_SCOPE --transport sse context7 https://mcp.context7.com/sse

# Twilio SMS - Send SMS messages (requires env vars)
# Will only install if TWILIO_* env vars are set in .env
claude mcp add-json twilio $INSTALL_SCOPE "{\"command\":\"npx\",\"args\":[\"-y\",\"@yiyang.1i/sms-mcp-server\"],\"env\":{\"ACCOUNT_SID\":\"${TWILIO_ACCOUNT_SID}\",\"AUTH_TOKEN\":\"${TWILIO_AUTH_TOKEN}\",\"FROM_NUMBER\":\"${TWILIO_FROM_NUMBER}\"}}"

# LangChain Tools - LangChain development utilities
claude mcp add $INSTALL_SCOPE langchain-tools -- uvx langchain-mcp-server

# Vector Database - Vector search and embeddings
claude mcp add $INSTALL_SCOPE vector-db -- uvx vector-db-mcp-server

# Anthropic API - Direct Anthropic API access
claude mcp add $INSTALL_SCOPE anthropic-api -- uvx anthropic-mcp-server

# Rust Analyzer - Rust language server integration
claude mcp add $INSTALL_SCOPE rust-analyzer -- uvx rust-analyzer-mcp

# Tauri Tools - Tauri development utilities
claude mcp add $INSTALL_SCOPE tauri-tools -- uvx tauri-mcp-server

# Web Development Tools - General web dev utilities
claude mcp add $INSTALL_SCOPE web-dev-tools -- uvx web-dev-mcp-server

# Next.js Tools - Next.js specific development utilities
claude mcp add $INSTALL_SCOPE nextjs-tools -- uvx nextjs-mcp-server
EOF

    # Replace $INSTALL_SCOPE in the file
    sed -i "s/\$INSTALL_SCOPE/$INSTALL_SCOPE/g" /tmp/mcp-servers.txt
}

# Install selected MCP servers
install_mcp_servers() {
    echo "Installing MCP servers: $SERVERS"
    
    # Create server definitions
    create_server_definitions
    
    # Load environment variables if enabled
    if [ "$ENABLE_ENV_VARS" = "true" ]; then
        if [ -f /workspace/.env ]; then
            echo "Loading environment variables from /workspace/.env"
            set -a
            source /workspace/.env 2>/dev/null || true
            set +a
        fi
    fi
    
    # Parse and install selected servers
    IFS=',' read -ra SERVER_ARRAY <<< "$SERVERS"
    for server in "${SERVER_ARRAY[@]}"; do
        # Trim whitespace
        server=$(echo "$server" | xargs)
        
        if [ -n "$server" ]; then
            echo "Installing MCP server: $server"
            
            # Extract the installation command for this server
            if grep -q "^# $server " /tmp/mcp-servers.txt; then
                # Get the command line after the comment
                install_cmd=$(grep -A 1 "^# $server " /tmp/mcp-servers.txt | tail -n 1)
                
                # Skip if no command found or if environment variables are missing
                if [[ "$install_cmd" =~ \$\{([^}]+)\} ]]; then
                    # Check if required environment variables are set
                    var_names=$(echo "$install_cmd" | grep -o '\${[^}]*}' | sed 's/[${}]//g' | sort -u)
                    missing_vars=""
                    
                    for var in $var_names; do
                        if [ -z "${!var}" ]; then
                            missing_vars="$missing_vars $var"
                        fi
                    done
                    
                    if [ -n "$missing_vars" ]; then
                        echo "⚠ Skipping $server - missing environment variables:$missing_vars"
                        continue
                    fi
                fi
                
                # Expand environment variables and execute
                expanded_cmd=$(eval echo "$install_cmd")
                echo "Executing: $expanded_cmd"
                
                if eval "$expanded_cmd"; then
                    echo "✓ Successfully installed $server"
                else
                    echo "✗ Failed to install $server (continuing)"
                fi
            else
                echo "⚠ Unknown MCP server: $server"
            fi
        fi
    done
    
    # Clean up temporary file
    rm -f /tmp/mcp-servers.txt
}

# Install additional servers from JSON if provided
install_additional_servers() {
    if [ -n "$ADDITIONAL_SERVERS" ]; then
        echo "Installing additional MCP servers..."
        echo "$ADDITIONAL_SERVERS" | jq -r '.[] | @base64' | while read server_def; do
            server=$(echo "$server_def" | base64 -d)
            server_name=$(echo "$server" | jq -r '.name')
            server_command=$(echo "$server" | jq -r '.command')
            
            echo "Installing additional server: $server_name"
            echo "Command: $server_command"
            
            if eval "$server_command"; then
                echo "✓ Successfully installed $server_name"
            else
                echo "✗ Failed to install $server_name (continuing)"
            fi
        done
    fi
}

# Ensure Claude Code is available
if ! command -v claude >/dev/null 2>&1; then
    echo "⚠ Claude Code not found - MCP servers will be configured but may not be available until Claude Code is installed"
fi

# Install selected servers
install_mcp_servers

# Install additional servers
install_additional_servers

echo "✓ Claude MCP Servers feature installation completed"