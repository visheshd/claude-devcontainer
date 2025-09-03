# 🔒 Security Guide for Claude DevContainer

## Overview

**⚠️ Security Notice**: Claude DevContainer automatically mounts your `~/.claude` directory (containing API tokens, credentials, and personal settings) into containers for seamless Claude Code integration.

**Key Points:**
- **Personal Development**: Default mounting is safe
- **Team/Shared Environments**: Use selective mounting to exclude credentials 
- **Public/CI Systems**: Disable mounting entirely
- **Three mounting tiers available**: Full, Selective (recommended for teams), or None

**Quick Action**: Check your environment type in the [Risk Assessment](#risk-assessment-by-environment) table below and follow the corresponding mounting strategy.

---

## Default Behavior

Claude DevContainer automatically mounts `~/.claude` → `/home/claude-user/.claude` in your `devcontainer.json`:

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

## What's in Your .claude Directory

**🔴 High-Risk**: API tokens, MCP server keys, authentication credentials, session data  
**🟡 Medium-Risk**: Personal settings, custom commands, project history, analytics  
**🟢 Low-Risk**: UI preferences, themes, extension configs, cache files

## Risk Assessment by Environment

| Environment Type | Risk Level | Recommendation |
|------------------|------------|----------------|
| **Personal Development** | 🟢 Low | Safe to use default mounting |
| **Team Development** | 🟡 Medium | Review contents, consider selective mounting |
| **Shared Workstations** | 🟠 High | Disable mounting or use separate account |
| **Public/Demo Systems** | 🔴 Critical | Never mount personal .claude directory |
| **CI/CD Pipelines** | 🔴 Critical | Use service accounts, never personal data |

## Mounting Strategies

**Before shared use, audit your directory:**
```bash
# Check for sensitive data
grep -r "key\|token\|secret" ~/.claude/ 2>/dev/null || echo "No secrets found"
ls -la ~/.claude/mcp/ 2>/dev/null || echo "No MCP configs found"
```

### **Tier 1: Full Mount** 🟢 (Personal Development)
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```
**✅ You get**: All settings, commands, API tokens, MCP configs  
**⚠️ Risk**: All personal data exposed

### **Tier 2: Selective Mount** ⭐ (Recommended for Teams)  
```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```
**✅ You get**: Personal commands, UI preferences, safe settings  
**🔒 Protected**: API tokens, credentials, chat history  
**📝 Note**: Default MCP servers (serena, context7) still work

### **Tier 3: No Mount** 🔴 (Maximum Security)
```json
{
  "mounts": [
    // No .claude mounting
  ]
}
```
**✅ You get**: Default MCP servers, basic Claude Code functionality  
**🔒 Protected**: All personal data

**✅ Safe to mount**: `/commands`, `/settings.json`, `/projects`  
**🚫 Never mount**: `/auth/`, `/mcp/`, `/sessions/`, `/cache/`

## Alternative Approaches

**Service Account**: Create dedicated Claude account for team containers  
**Environment Variables**: Store API keys in `containerEnv` instead of mounting

## Disabling .claude Mounting

**Remove from devcontainer.json**:
```json
{
  "mounts": [
    // Remove the .claude mount line
  ]
}
```

**CLI support**:
```bash
cdc migrate --no-claude-mount  # Migrate without mounting
```

## Incident Response

**If compromised**:
1. Rotate all API keys in `.claude` directory
2. Review container logs for data access
3. Update authentication credentials

## Advanced Features

**Read-only mounting**:
```json
{"mounts": ["source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind,readonly"]}
```

**Container hardening**:
```json
{"runArgs": ["--security-opt=no-new-privileges:true", "--cap-drop=ALL"]}
```

## Enterprise & Compliance

- Review organizational policies before mounting personal data
- Consider GDPR/privacy implications for personal data in containers  
- Use centralized secrets management for team environments

**Questions?** File a security-labeled issue (no credentials in reports)