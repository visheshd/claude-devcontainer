# Claude DevContainer Configuration Examples

This directory contains practical examples and templates for configuring Claude DevContainer with different security and mounting strategies.

## 📁 Files

### `mounting-strategies.json`
Comprehensive examples of all three mounting strategies:
- **Tier 1**: Full Mount (Personal Development)
- **Tier 2**: Selective Mount (Recommended for Teams) ⭐
- **Tier 3**: No Mount (Maximum Security)

Includes migration examples, environment-specific recommendations, and troubleshooting guidance.

## 🚀 Quick Start Examples

### For Personal Development
```json
{
  "name": "My Personal Project",
  "image": "claude-nextjs:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

### For Team Development (Recommended)
```json
{
  "name": "Team Project",
  "image": "claude-nextjs:latest",
  "mounts": [
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly"
  ]
}
```

### For Public/Secure Environments
```json
{
  "name": "Secure Project",
  "image": "claude-nextjs:latest",
  "mounts": []
}
```

## 🔗 Related Documentation

- **[Security Guide](../SECURITY.md)** - Complete security analysis and best practices
- **[Migration Guide](../migration-guide.md)** - Upgrading existing configurations
- **[Main README](../../README.md)** - Full project documentation

## 💡 Need Help?

1. **Choose your mounting strategy** based on your environment (personal/team/public)
2. **Copy the appropriate configuration** from `mounting-strategies.json`
3. **Customize for your stack** (replace `claude-nextjs:latest` with your preferred image)
4. **Review security implications** in the Security Guide

Remember: Claude Code and MCP servers work in all configurations - you're just choosing what personal data to expose.