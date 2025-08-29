# Claude MCP Servers DevContainer Feature

This feature provides configurable installation of MCP (Model Context Protocol) servers for Claude Code development containers.

## Usage

```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7,twilio",
      "installLocation": "user"
    }
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `servers` | string | `"serena,context7"` | Comma-separated list of MCP servers to install |
| `additionalServers` | string | `""` | JSON array of additional server definitions |
| `enableEnvironmentVariables` | boolean | `true` | Load environment variables from .env files |
| `installLocation` | string | `"user"` | Install scope: `"user"` or `"system"` |

## Available MCP Servers

### Core Development
- **serena**: Advanced coding agent toolkit with semantic code analysis
- **context7**: Up-to-date documentation and code examples from source

### Communication & Notifications  
- **twilio**: SMS messaging capabilities (requires TWILIO_* env vars)

### Language & Framework Specific
- **langchain-tools**: LangChain development utilities
- **vector-db**: Vector search and embeddings support
- **anthropic-api**: Direct Anthropic API access
- **rust-analyzer**: Rust language server integration
- **tauri-tools**: Tauri development utilities
- **web-dev-tools**: General web development utilities
- **nextjs-tools**: Next.js specific development tools

## Environment Variables

Some MCP servers require environment variables. Create a `.env` file in your project root:

```env
# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_from_number

# Add other server-specific variables as needed
```

## Advanced Usage

### Custom Server Installation

You can specify additional servers using the `additionalServers` option:

```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7",
      "additionalServers": "[{\"name\":\"custom-server\", \"command\":\"claude mcp add -s user custom -- npx my-custom-mcp-server\"}]"
    }
  }
}
```

### Stack-Specific Configurations

#### Python ML Project
```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7,langchain-tools,vector-db,anthropic-api"
    }
  }
}
```

#### Rust Tauri Project
```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7,rust-analyzer,tauri-tools"
    }
  }
}
```

#### Next.js Web Project
```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7,web-dev-tools,nextjs-tools"
    }
  }
}
```

## Troubleshooting

### Missing Environment Variables
If a server requires environment variables that aren't set, it will be skipped with a warning. Check your `.env` file and ensure all required variables are present.

### Server Installation Failures
Individual server installation failures won't stop the feature installation. Check the container logs for specific error messages.

### Verifying Installation
After container creation, you can verify installed MCP servers:

```bash
claude mcp list
```