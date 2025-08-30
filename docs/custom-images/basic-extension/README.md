# Basic Extension Example

A simple extension of claude-base that adds commonly needed development tools without targeting a specific tech stack.

## What's Added

### System Tools
- **Database Clients**: postgresql-client, mysql-client, sqlite3
- **Network Tools**: httpie for API testing
- **Text Processing**: jq (JSON), yq (YAML)
- **System Monitoring**: htop for process monitoring

### User Tools
- **GitHub CLI**: `gh` for GitHub operations
- **Modern File Tools**: `fd` (find replacement), `rg` (grep replacement)
- **Package Managers**: pnpm and Bun for Node.js projects

## Use Cases

Perfect for:
- **General web development** - Works with any web framework
- **API development and testing** - httpie, database clients, jq
- **DevOps scripting** - Modern CLI tools, system monitoring
- **Polyglot projects** - No specific language assumptions

## Building the Image

```bash
# Build locally
docker build -t claude-basic:latest .

# Test the build
docker run --rm claude-basic:latest basic-start
```

## Using with DevContainer

1. **Initialize DevContainer**:
   ```bash
   claude-devcontainer init -s custom
   ```

2. **Edit `.devcontainer/devcontainer.json`**:
   ```json
   {
     "name": "Basic Development Environment",
     "image": "claude-basic:latest",
     "mounts": [
       "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
     ],
     "features": {
       "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
         "servers": "serena,context7"
       }
     },
     "customizations": {
       "vscode": {
         "extensions": [
           "anthropic.claude-code",
           "ms-vscode.vscode-json",
           "redhat.vscode-yaml"
         ]
       }
     }
   }
   ```

3. **Open in VS Code**:
   - Use "Dev Containers: Reopen in Container"
   - All tools will be available in the integrated terminal

## Example Workflows

### API Development
```bash
# Test API endpoints
http GET https://api.example.com/users

# Process JSON responses
curl -s https://api.example.com/data | jq '.results[0]'

# Query databases
psql -h localhost -U user -d database
```

### GitHub Operations
```bash
# Create and manage pull requests
gh pr create --title "Add new feature"
gh pr status

# Clone repositories
gh repo clone username/repo
```

### File Operations
```bash
# Modern file search
fd "*.json" . 
rg "TODO" --type js

# Traditional alternatives still work
find . -name "*.json"
grep -r "TODO" . --include="*.js"
```

## Customization

This image serves as a starting point. Common modifications:

### Add Language-Specific Tools
```dockerfile
# Add to Dockerfile
USER claude-user
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/claude-user/.cargo/bin:${PATH}"
```

### Add More Database Support
```dockerfile
USER root
RUN apt-get update && apt-get install -y \
    redis-tools \
    mongodb-clients \
    && rm -rf /var/lib/apt/lists/*
```

### Configure Tool Defaults
```dockerfile
USER claude-user
# Configure git defaults
RUN git config --global init.defaultBranch main

# Configure GitHub CLI
RUN mkdir -p ~/.config/gh
COPY gh-config.yml ~/.config/gh/config.yml
```

## Size Information

- **Base**: ~781MB (claude-base)
- **Added layers**: ~150MB
- **Total**: ~931MB

Optimized for development use rather than minimal size.