# Security Guide

Comprehensive security guidance for Claude DevContainer configurations and personal data handling.

## Table of Contents

- [Security Overview](#security-overview)
- [Risk Assessment](#risk-assessment)
- [Mounting Strategies](#mounting-strategies)
- [Authentication Security](#authentication-security)
- [Container Security](#container-security)
- [Network Security](#network-security)
- [Data Privacy](#data-privacy)
- [Incident Response](#incident-response)

## Security Overview

### Critical Security Notice

Claude DevContainer automatically mounts your `~/.claude` directory into containers for seamless authentication and settings. This directory contains sensitive personal data that requires careful handling.

**What's Mounted by Default:**
```bash
~/.claude → /home/claude-user/.claude
```

**Contains:**
- **🔴 High-Risk**: API tokens, MCP server credentials, authentication files
- **🟡 Medium-Risk**: Personal settings, custom commands, project history  
- **🟢 Low-Risk**: UI preferences, themes, cache files

### Security Principles

1. **Principle of Least Privilege**: Mount only what's needed
2. **Data Classification**: Understand what data is being shared
3. **Environment Separation**: Different strategies for different environments
4. **Defense in Depth**: Multiple layers of protection

## Risk Assessment

### By Environment Type

| Environment | Risk Level | Data Exposure | Recommendation |
|-------------|------------|---------------|----------------|
| **Personal Development** | 🟢 Low | Personal only | Default mounting acceptable |
| **Team Development** | 🟡 Medium | Team access | Selective mounting recommended |
| **Shared Workstations** | 🟠 High | Multiple users | Use separate accounts |
| **Public/Demo Systems** | 🔴 Critical | Public access | No mounting, service accounts |
| **CI/CD Pipelines** | 🔴 Critical | Automated systems | Service accounts only |

### Audit Your Environment

Before using in shared environments, audit your `.claude` directory:

```bash
# Check for sensitive files
find ~/.claude -type f -name "*key*" -o -name "*token*" -o -name "*secret*"

# Check MCP server configurations
ls -la ~/.claude/mcp/ 2>/dev/null

# Review authentication files
ls -la ~/.claude/auth/ 2>/dev/null

# Check for API credentials
grep -r -i "api\|key\|token" ~/.claude/ 2>/dev/null | head -10
```

## Mounting Strategies

Choose your mounting strategy based on your environment and security requirements:

### Strategy 1: Full Mount (Personal Development Only)

**Use Case**: Personal development on trusted systems

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

**Benefits:**
- Complete Claude Code functionality
- All personal settings and commands available
- MCP servers work with personal configurations
- Seamless authentication persistence

**Risks:**
- All personal data exposed to container
- API tokens accessible to container processes
- Chat history and usage data available

### Strategy 2: Selective Mount (Recommended for Teams)

**Use Case**: Team development, shared environments, when you want functionality with reduced risk

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.claude/commands,target=/home/claude-user/.claude/commands,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/settings.json,target=/home/claude-user/.claude/settings.json,type=bind,readonly",
    "source=${localEnv:HOME}/.claude/projects,target=/home/claude-user/.claude/projects,type=bind,readonly"
  ]
}
```

**Benefits:**
- Personal commands and preferences available
- UI settings preserved
- Project configurations maintained
- Default MCP servers still functional

**Protected:**
- API tokens and authentication credentials
- MCP server configurations with secrets
- Chat history and session data
- Cache files with potentially sensitive data

### Strategy 3: Service Account Mount (Enterprise)

**Use Case**: Team environments with dedicated service accounts

```json
{
  "mounts": [
    "source=/shared/claude-service/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

Create a dedicated service account with limited, team-appropriate credentials.

### Strategy 4: No Mount (Maximum Security)

**Use Case**: Public systems, CI/CD, untrusted environments

```json
{
  "mounts": [
    // No .claude directory mounting
  ]
}
```

**Security Benefits:**
- No personal data exposure
- Complete isolation from host credentials
- Safe for public demonstrations
- Suitable for automated systems

**Limitations:**
- Manual authentication required
- No personal settings or commands
- Default MCP server configuration only

### Directory-Level Security Classification

**🟢 Generally Safe to Mount:**
- `~/.claude/commands/` (custom commands)
- `~/.claude/settings.json` (UI preferences)
- `~/.claude/projects/` (project configurations)
- `~/.claude/themes/` (appearance settings)

**🟡 Mount with Caution:**
- `~/.claude/history/` (may contain sensitive context)
- `~/.claude/cache/` (may contain sensitive data)
- `~/.claude/logs/` (may contain sensitive information)

**🔴 Never Mount in Shared Environments:**
- `~/.claude/auth/` (authentication tokens)
- `~/.claude/credentials/` (API keys and secrets)
- `~/.claude/mcp/` (MCP server configurations with keys)
- `~/.claude/sessions/` (active session data)

## Authentication Security

### Persistent Authentication Architecture

Claude DevContainer uses runtime volume mounts for authentication - **never baking credentials into Docker images**:

```yaml
# ✅ Safe: Runtime mounting only
volumes:
  - ~/.claude:/home/claude-user/.claude:rw

# ✅ Protected: .dockerignore prevents credential inclusion in build context
# ✅ Secure: Images can be safely published without credential leaks
```

### Authentication Methods

**1. OAuth/API Key Authentication:**
- Stored in `~/.claude/credentials.json` or similar
- Automatically mounted and detected
- Supports rotation and updates

**2. Environment Variable Authentication:**
```json
{
  "containerEnv": {
    "CLAUDE_API_KEY": "${localEnv:CLAUDE_API_KEY}",
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  }
}
```

**3. Service Account Authentication:**
- Create dedicated accounts for team/CI use
- Store credentials in secure secret management
- Rotate regularly and audit access

### SSH Key Security

For git operations, SSH keys are also mounted:

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.ssh,target=/home/claude-user/.ssh,type=bind,readonly"
  ]
}
```

**Best Practices:**
- Use read-only mounting for SSH keys
- Use dedicated deploy keys for automated systems
- Regularly rotate SSH keys
- Monitor SSH key usage

## Container Security

### Container Hardening

**Security Options:**
```json
{
  "runArgs": [
    "--security-opt=no-new-privileges:true",
    "--cap-drop=ALL",
    "--cap-add=SYS_PTRACE",  // Only if debugging needed
    "--read-only",           // For enhanced security (may limit functionality)
    "--tmpfs=/tmp:exec"
  ]
}
```

**Resource Limits:**
```json
{
  "runArgs": [
    "--memory=4g",
    "--cpus=2.0",
    "--pids-limit=1000"
  ]
}
```

### Image Security

**All Claude images are built locally:**
- No pre-built images from untrusted registries
- Full control over base images and dependencies
- Regular security updates through rebuild process

**Security Scanning:**
```bash
# Scan images for vulnerabilities (requires docker scan or trivy)
docker scout cves claude-base:latest
# or
trivy image claude-base:latest
```

### User Security

**Non-root User:**
All Claude images use a non-root user (`claude-user`) for security:

```dockerfile
USER claude-user
WORKDIR /workspace
```

**UID/GID Mapping:**
User ID is mapped to your host user to prevent permission issues while maintaining security.

## Network Security

### Container Networking

**Default Network Security:**
- Containers use Docker's default bridge network
- No exposed ports unless explicitly configured
- Network isolation between containers

**Multi-Service Security:**
```yaml
# docker-compose.yml
networks:
  internal:
    driver: bridge
    internal: true  # No external access
  
 services:
   app:
     networks:
       - internal
       - default  # For external access if needed
```

### Firewall Considerations

- Docker bypasses UFW/iptables by default
- Use Docker's built-in network policies
- Consider host-level firewalls for production

### MCP Server Security

MCP servers have network access - secure their configurations:

```json
{
  "features": {
    "./src/claude-mcp": {
      "servers": "serena,context7",
      "network_isolation": "true"
    }
  }
}
```

## Data Privacy

### Data Classification

**Personal Data in ~/.claude:**
- **Highly Sensitive**: API keys, authentication tokens
- **Sensitive**: Chat history, usage analytics, MCP credentials
- **Personal**: Custom commands, preferences, project settings
- **Non-sensitive**: UI themes, cache files

### GDPR and Privacy Compliance

**Data Processing:**
- Personal data is processed locally in containers
- No data transmitted to third parties via mounting
- Users control what data is shared with containers

**Data Retention:**
- Container data is ephemeral (deleted when container stops)
- Mounted data persists on host system
- Regular cleanup of unused containers recommended

**Data Access:**
- Only processes within container can access mounted data
- Host system retains access control over source directories
- Container processes run as non-root user

### Regulatory Considerations

**For Organizations:**
- Review data handling policies before deployment
- Consider data residency requirements
- Implement appropriate access controls
- Document data flows for compliance

**For Personal Use:**
- Understand what data is being shared
- Regularly audit mounted directories
- Use selective mounting in shared environments

## Incident Response

### Security Incident Procedures

**If you suspect credential compromise:**

1. **Immediate Actions:**
   ```bash
   # Stop all containers
   docker stop $(docker ps -q)
   
   # Remove containers with potential exposure
   docker rm $(docker ps -aq)
   ```

2. **Credential Rotation:**
   ```bash
   # Backup current credentials
   cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)
   
   # Rotate API keys in Claude dashboard
   # Update MCP server credentials
   # Regenerate SSH keys if needed
   ```

3. **Investigation:**
   ```bash
   # Check container logs for data access
   docker logs <container-id> 2>&1 | grep -i "claude\|auth\|token"
   
   # Review Docker events
   docker events --since="24h" --filter="type=container"
   
   # Check file access times
   ls -latu ~/.claude/
   ```

4. **Recovery:**
   - Update all affected credentials
   - Review and update security configurations
   - Implement additional monitoring if needed
   - Document incident for future prevention

### Monitoring and Detection

**File Integrity Monitoring:**
```bash
# Monitor changes to sensitive files
find ~/.claude -name "*key*" -o -name "*token*" -o -name "*credential*" | xargs ls -la
```

**Container Activity Monitoring:**
```bash
# Monitor container resource usage
docker stats

# Monitor network connections
docker exec <container> netstat -an
```

### Preventive Measures

1. **Regular Audits:**
   - Monthly review of mounted directories
   - Quarterly credential rotation
   - Regular security configuration review

2. **Access Logging:**
   - Enable Docker logging
   - Monitor file access patterns
   - Set up alerts for unusual activity

3. **Backup and Recovery:**
   - Regular backups of configuration
   - Tested recovery procedures
   - Secure storage of backup credentials

## Migration and Configuration

### Migrating Existing DevContainers

**Upgrade with security review:**
```bash
# Check current configuration
cdc check

# Preview security changes
cdc migrate --dry-run

# Apply with selective mounting
cdc migrate --security-level=selective
```

### Disabling Personal Data Mounting

**Remove from existing configuration:**
```json
{
  "mounts": [
    // Remove or comment out the .claude mount
    // "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
  ]
}
```

**CLI support for secure migration:**
```bash
# Migrate without personal data mounting
cdc migrate --no-personal-mount

# Initialize new projects without mounting
cdc init --security-level=maximum
```

## Enterprise and Compliance

### Organizational Policies

**Before Deployment:**
- Review data handling and privacy policies
- Assess compliance requirements (GDPR, HIPAA, SOX)
- Implement appropriate access controls
- Document data flows and processing

### Centralized Secret Management

**For Team Environments:**
```yaml
# docker-compose.yml with external secrets
secrets:
  claude_api_key:
    external: true
    name: team_claude_api_key

services:
  app:
    secrets:
      - claude_api_key
    environment:
      CLAUDE_API_KEY_FILE: /run/secrets/claude_api_key
```

### Audit and Compliance

**Documentation Requirements:**
- Data flow diagrams
- Access control matrices
- Incident response procedures
- Regular security assessments

**Compliance Checklists:**
- [ ] Data classification implemented
- [ ] Access controls documented
- [ ] Incident response procedures tested
- [ ] Regular security reviews scheduled
- [ ] Backup and recovery procedures verified

## Getting Security Help

### Reporting Security Issues

**For security vulnerabilities:**
- Create a GitHub issue with `security` label
- **Never include actual credentials in reports**
- Provide sanitized configuration examples
- Include steps to reproduce (without sensitive data)

### Security Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [DevContainer Security Documentation](https://containers.dev/supporting)
- [OWASP Container Security Guide](https://owasp.org/www-project-container-security/)

### Security Configuration Examples

See the `/docs/examples/security/` directory for:
- Selective mounting configurations
- Enterprise deployment patterns
- Compliance-focused setups
- Incident response templates

**Remember**: Security is a shared responsibility. While Claude DevContainer provides secure defaults, proper configuration and usage are essential for maintaining security in your environment.