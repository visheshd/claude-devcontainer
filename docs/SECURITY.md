# 🔒 Security Guide for Claude DevContainer

## Overview

Claude DevContainer provides a powerful development environment with seamless Claude Code integration. However, this integration involves mounting sensitive personal data from your local `~/.claude` directory into development containers. This guide explains the security implications and how to manage them.

## Default Behavior: .claude Directory Mounting

### What Happens Automatically
When you create a DevContainer using `claude-devcontainer init` or `cdc init`, the system automatically:

1. **Mounts your personal `~/.claude` directory** from `~/.claude` (host) to `/home/claude-user/.claude` (container)
2. **Makes all your Claude Code configuration available** inside the container
3. **Enables seamless Claude Code functionality** without additional setup

### Mount Configuration
The mounting is configured in your `devcontainer.json`:
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

## Sensitive Data Analysis

### What's in Your .claude Directory
Your `~/.claude` directory may contain sensitive information including:

#### High-Risk Data
- **API tokens and authentication credentials** for Claude services
- **MCP server API keys** (OpenAI, Anthropic, custom services)
- **Authentication tokens** for third-party integrations
- **Session tokens and cookies** from Claude Code sessions

#### Medium-Risk Data
- **Personal settings and preferences** 
- **Custom command configurations**
- **Project-specific settings and history**
- **Usage analytics and telemetry data**

#### Low-Risk Data
- **UI preferences** (themes, layout settings)
- **Extension configurations** 
- **Local cache files**

### Risk Assessment by Environment

| Environment Type | Risk Level | Recommendation |
|------------------|------------|----------------|
| **Personal Development** | 🟢 Low | Safe to use default mounting |
| **Team Development** | 🟡 Medium | Review contents, consider selective mounting |
| **Shared Workstations** | 🟠 High | Disable mounting or use separate account |
| **Public/Demo Systems** | 🔴 Critical | Never mount personal .claude directory |
| **CI/CD Pipelines** | 🔴 Critical | Use service accounts, never personal data |

## Security Best Practices

### 1. Audit Your .claude Directory
Before using Claude DevContainer in shared environments:

```bash
# List all files in your .claude directory
find ~/.claude -type f -name "*.json" -o -name "*.toml" -o -name "*.yaml" | head -20

# Check for potential API keys or tokens
grep -r "key\|token\|secret" ~/.claude/ 2>/dev/null || echo "No obvious secrets found"

# Review MCP server configurations
ls -la ~/.claude/mcp/ 2>/dev/null || echo "No MCP directory found"
```

### 2. Three-Tier Mounting Strategy

Choose the mounting strategy that best fits your security requirements and development environment:

#### **Tier 1: Full Mount** 🟢 (Personal Development)
**Best for**: Solo development, trusted personal environments  
**Risk**: High - all personal data exposed  
**Benefit**: Complete seamless experience with all your customizations

```json
{
  "name": "Personal Project",
  "image": "claude-nextjs:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

**What you get**: All personal settings, custom commands, API tokens, MCP configurations, chat history

---

#### **Tier 2: Selective Mount** ⭐ 🟡 (Recommended for Teams)
**Best for**: Team development, shared workstations, collaborative environments  
**Risk**: Low - only safe customizations exposed  
**Benefit**: Personal productivity without security compromise

```json
{
  "name": "Team Project",
  "image": "claude-nextjs:latest", 
  "mounts": [
    // Safe customizations only
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

**What you get**: Personal commands, UI preferences, safe settings  
**What's excluded**: API tokens, credentials, MCP server configs, chat history  
**Note**: Default MCP servers (serena, context7) are still automatically available

---

#### **Tier 3: No Mount** 🔴 (Maximum Security)
**Best for**: Public demos, CI/CD pipelines, untrusted environments  
**Risk**: None - no personal data exposed  
**Limitation**: No personal customizations, but Claude Code still works

```json
{
  "name": "Secure Project",
  "image": "claude-nextjs:latest",
  "mounts": [
    // No .claude mounting
  ]
}
```

**What you get**: Default MCP servers (serena, context7), basic Claude Code functionality  
**What's excluded**: All personal data, settings, commands, customizations  
**Important**: Claude Code and MCP servers still work with defaults

---

### Selective Mount Details

For **Tier 2 (Selective Mount)**, you can choose exactly what to expose:

#### Safe to Mount (Low Risk)
```json
"mounts": [
  // Personal commands (your custom shortcuts)
  "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
  
  // UI preferences and safe settings  
  "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly",
  
  // Project-specific configurations (if they exist)
  "source=${localEnv:HOME}/.claude/projects,target=/home/claude-user/.claude/projects,type=bind,readonly"
]
```

#### Never Mount (High Risk)
- `~/.claude/auth/` - Authentication tokens and credentials
- `~/.claude/mcp/` - MCP server configurations with API keys  
- `~/.claude/sessions/` - Chat history and session data
- `~/.claude/cache/` - Potentially sensitive cached data

### 3. Alternative Approaches

#### Service Account Pattern
For team environments, create a dedicated Claude account:

1. **Create a service account** specifically for development containers
2. **Configure only necessary MCP servers** for that account
3. **Use the service account's .claude directory** instead of personal data
4. **Share access** to the service account with team members

#### Environment Variables Pattern
Store sensitive configuration in environment variables:

```json
{
  "containerEnv": {
    "OPENAI_API_KEY": "${localEnv:OPENAI_API_KEY}",
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  },
  "mounts": [
    // Mount only non-sensitive configuration
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

## Disabling .claude Mounting

### Complete Opt-Out
To completely disable mounting:

1. **Edit your `devcontainer.json`**:
   ```json
   {
     "mounts": [
       // Remove or comment out the .claude mount
       // "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
     ]
   }
   ```

2. **Manual MCP Server Setup** (if needed):
   ```bash
   # Inside the container, manually configure MCP servers
   mkdir -p /home/claude-user/.claude
   echo '{"mcpServers": {"serena": {"command": "uvx", "args": ["--from", "git+https://github.com/oraios/serena", "serena"]}}}' > /home/claude-user/.claude/settings.json
   ```

### Migration Command Support
The migration system respects your choice:

```bash
# Check if .claude mounting is configured
cdc check

# Migrate but specify no .claude mounting
cdc migrate --no-claude-mount
```

## Incident Response

### If Personal Data is Compromised
1. **Immediately rotate all API keys** found in your `.claude` directory
2. **Review container logs** for potential data exfiltration
3. **Check shared systems** for cached copies of your data
4. **Update authentication credentials** for all connected services

### Security Monitoring
```bash
# Monitor container access to .claude directory
docker exec -it <container> find /home/claude-user/.claude -type f -printf '%T+ %p\n' | sort

# Check for unusual access patterns
docker logs <container> 2>&1 | grep -i claude
```

## Advanced Security Features

### Read-Only Mounting
For maximum security while maintaining functionality:

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind,readonly"
  ]
}
```

### Partial Directory Mounting
Mount only what you need:

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly"
  ]
}
```

### Container Security Hardening
Additional security measures:

```json
{
  "runArgs": [
    "--security-opt=no-new-privileges:true",
    "--cap-drop=ALL",
    "--cap-add=SYS_PTRACE"
  ],
  "containerUser": "claude-user",
  "remoteUser": "claude-user"
}
```

## Compliance Considerations

### Enterprise Environments
- **Review organizational security policies** before mounting personal data
- **Consider data classification** of your Claude Code configurations
- **Implement audit logging** for container access to mounted directories
- **Use centralized secrets management** instead of personal credentials

### GDPR/Privacy Compliance
- **Personal data in .claude directory** may be subject to privacy regulations
- **Cross-border data transfers** when using cloud development environments
- **Data retention policies** for container images and logs

## Support and Updates

This security guide is updated regularly. For the latest security recommendations:

- **Check the repository** for security updates
- **Review release notes** for security-related changes
- **Subscribe to security notifications** if available

For security issues or questions:
- **File an issue** with security label in the repository
- **Do not include** actual credentials or sensitive data in issue reports