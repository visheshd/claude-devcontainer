# Contributing Guide

Welcome to Claude DevContainer! This guide will help you contribute to the project effectively.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing Changes](#testing-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Development Setup

### Prerequisites

- Docker Desktop or Docker Engine
- Node.js 16+
- Git
- VS Code with DevContainer extension (recommended)

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/claude-devcontainer.git
cd claude-docker

# 2. Install CLI tool in development mode
cd tools/claude-devcontainer
npm install
npm link

# 3. Build all images for testing
cd ../..
./build-all-images.sh --rebuild

# 4. Verify setup
cdc --version
docker images | grep claude
```

### Development Environment

You can develop Claude DevContainer using itself:

```bash
# Initialize DevContainer for the project
cdc init --stack nextjs

# Open in VS Code
code .
# Command Palette: "Dev Containers: Reopen in Container"
```

## Project Structure

```
claude-docker/
├── dockerfiles/           # Docker image definitions
│   ├── claude-base/       # Base image with Claude Code
│   ├── python-ml/         # Python ML stack
│   ├── nextjs/           # Next.js web development stack
│   └── rust-tauri/       # Rust Tauri desktop stack
├── src/                  # DevContainer features
│   ├── claude-mcp/       # MCP server configuration
│   ├── git-wrapper/      # Git worktree support
│   └── host-ssh-build/   # SSH host build support
├── tools/
│   └── claude-devcontainer/ # CLI tool source code
├── docs/                 # Additional documentation
└── templates/           # DevContainer templates
```

### Key Components

**Docker Images**:
- `claude-base`: Foundation with Claude Code and essential tools
- Stack images: Specialized environments extending the base

**DevContainer Features**:
- Modular features that can be added to any DevContainer
- Install scripts and configuration in `src/*/`

**CLI Tool**:
- ES modules in `tools/claude-devcontainer/src/`
- Handles DevContainer generation, worktree management, cleanup

## Making Changes

### Types of Changes

**1. Docker Images**
- Modify `dockerfiles/*/Dockerfile` 
- Update package versions, add tools, change configuration
- Test with individual `./build.sh` scripts

**2. DevContainer Features**
- Edit `src/*/install.sh` for feature logic
- Update `devcontainer-feature.json` for metadata
- Features should be idempotent and well-documented

**3. CLI Tool**
- Modify `tools/claude-devcontainer/src/index.js`
- Add new commands, improve existing functionality
- Follow ES module patterns

**4. Documentation**
- Update relevant `.md` files
- Keep examples current with code changes
- Maintain consistency across docs

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# Edit files as needed

# 3. Test your changes (see Testing section)

# 4. Commit with clear messages
git add .
git commit -m "feat: add new feature description"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Format

Use conventional commits:

```bash
# Feature additions
git commit -m "feat: add support for custom MCP servers"

# Bug fixes  
git commit -m "fix: resolve worktree mount path issue"

# Documentation
git commit -m "docs: update setup guide with new requirements"

# Refactoring
git commit -m "refactor: improve CLI error handling"

# Breaking changes
git commit -m "feat!: change default stack to nextjs"
```

## Testing Changes

### Testing Docker Images

```bash
# Test specific image build
cd dockerfiles/claude-base
./build.sh

# Test image functionality
docker run -it claude-base:latest
# Inside container: test Claude Code, tools, etc.

# Test with DevContainer
cd test-project
cdc init --stack custom
# Edit devcontainer.json to use your test image
code . # "Dev Containers: Reopen in Container"
```

### Testing CLI Tool

```bash
# Test CLI changes
cd test-project

# Test various commands
cdc init
cdc detect
cdc stacks
cdc check
cdc wt test-feature

# Test error conditions
cdc init --stack nonexistent
cdc wt invalid/name
```

### Testing DevContainer Features

```bash
# Create test DevContainer with feature
cat << EOF > .devcontainer/devcontainer.json
{
  "image": "claude-base:latest",
  "features": {
    "./src/your-feature": {
      "option": "value"
    }
  }
}
EOF

# Test in VS Code
code .
# "Dev Containers: Reopen in Container"
```

### Integration Testing

```bash
# Test complete workflow
mkdir integration-test
cd integration-test

# Test init
cdc init --stack python-ml

# Test worktree
cdc wt test-branch

# Test cleanup
cd ../integration-test-test-branch
# Develop, merge
cdc cleanup test-branch
```

### Manual Testing Checklist

Before submitting PR, verify:

- [ ] CLI tool installs without errors
- [ ] All build scripts execute successfully  
- [ ] DevContainers start properly in VS Code
- [ ] Claude Code works inside containers
- [ ] Worktree creation and cleanup function
- [ ] MCP servers are accessible
- [ ] Documentation is accurate

## Pull Request Process

### Before Submitting

1. **Test thoroughly** using the testing guidelines above
2. **Update documentation** for any user-facing changes
3. **Follow coding standards** (see below)
4. **Rebase on latest main** to avoid merge conflicts

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality) 
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Tested Docker image builds
- [ ] Tested CLI functionality
- [ ] Tested DevContainer integration
- [ ] Updated documentation

## Screenshots/Logs
Include relevant screenshots or logs if applicable
```

### Review Process

1. **Automated checks** must pass (builds, basic tests)
2. **Maintainer review** for code quality and design
3. **Manual testing** of key functionality
4. **Documentation review** for clarity and accuracy

## Coding Standards

### Docker Images

```dockerfile
# Use specific base image versions
FROM node:20-bullseye

# Follow user pattern
USER root
RUN apt-get update && apt-get install -y package \
    && rm -rf /var/lib/apt/lists/*

USER claude-user
RUN npm install -g tool

# Set consistent working directory
WORKDIR /workspace
```

### Shell Scripts

```bash
#!/bin/bash
set -euo pipefail  # Fail fast and safe

# Use consistent error handling
if ! command -v docker >&2; then
    echo "Error: Docker is required" >&2
    exit 1
fi

# Use descriptive variable names
readonly IMAGE_NAME="${1:-claude-base}"
readonly BUILD_CONTEXT="$(dirname "$0")"
```

### JavaScript (CLI Tool)

```javascript
// Use ES modules
import { readFile } from 'fs/promises';
import path from 'path';

// Use descriptive function names
export async function detectProjectType(projectPath) {
    // Clear error messages
    if (!projectPath) {
        throw new Error('Project path is required');
    }
    
    // Consistent error handling
    try {
        const packageJson = await readFile(
            path.join(projectPath, 'package.json'), 
            'utf8'
        );
        return JSON.parse(packageJson);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // No package.json found
        }
        throw error; // Re-throw unexpected errors
    }
}
```

### Documentation

- Use clear, concise language
- Include code examples for complex concepts
- Maintain consistent formatting and structure
- Update examples when code changes
- Cross-reference related sections

### Error Messages

```bash
# Good: Specific and actionable
echo "Error: Docker image 'claude-base:latest' not found. Run './build-all-images.sh --images claude-base' to build it." >&2

# Bad: Vague and unhelpful  
echo "Error: Something went wrong" >&2
```

## Getting Help

### Communication

- **GitHub Issues**: Report bugs, request features
- **GitHub Discussions**: Ask questions, share ideas
- **Pull Requests**: Code reviews and feedback

### Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [DevContainer Specification](https://containers.dev/implementors/spec/)
- [Conventional Commits](https://www.conventionalcommits.org/)

### Common Development Issues

**Build failures**:
```bash
# Clean Docker cache
docker builder prune -f

# Rebuild without cache
./build-all-images.sh --no-cache --rebuild
```

**CLI tool not updating**:
```bash
# Reinstall CLI tool
cd tools/claude-devcontainer
npm unlink && npm link
```

**Permission issues**:
```bash
# Fix script permissions
chmod +x build-all-images.sh
chmod +x dockerfiles/*/build.sh
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR`: Breaking changes
- `MINOR`: New features, backward compatible  
- `PATCH`: Bug fixes, backward compatible

### Release Checklist

1. Update version in `tools/claude-devcontainer/package.json`
2. Update CHANGELOG.md with new features and fixes
3. Test all functionality with new version
4. Create release tag and GitHub release
5. Update documentation as needed

## Thank You!

Your contributions make Claude DevContainer better for everyone. Whether you're fixing bugs, adding features, or improving documentation, your help is greatly appreciated! 🎉