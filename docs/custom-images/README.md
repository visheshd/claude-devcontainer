# Custom Images for Claude DevContainers

This directory contains examples and templates for creating custom Claude DevContainer images. All examples extend from `claude-base:latest` to ensure compatibility with the Claude Code toolchain.

## Directory Structure

```
docs/custom-images/
├── README.md                           # This file
├── basic-extension/                    # Simple extension example
│   ├── Dockerfile
│   └── README.md
├── multi-language/                     # Multiple programming languages
│   ├── Dockerfile
│   └── README.md
├── database-development/               # Database tools and clients
│   ├── Dockerfile
│   ├── scripts/
│   │   └── db-connect.sh
│   └── README.md
├── devops-tools/                       # DevOps and infrastructure tools
│   ├── Dockerfile
│   └── README.md
└── scientific-computing/               # Scientific computing beyond ML
    ├── Dockerfile
    └── README.md
```

## Quick Start

1. Choose an example that matches your needs
2. Copy the Dockerfile to your project
3. Modify it for your specific requirements
4. Build your custom image:
   ```bash
   docker build -t my-custom-claude:latest .
   ```
5. Use with claude-devcontainer:
   ```bash
   claude-devcontainer init -s custom
   # Edit .devcontainer/devcontainer.json to use your image
   ```

## Best Practices

### Image Design
- **Always extend `claude-base:latest`** for compatibility
- **Follow the USER pattern**: root for system packages, claude-user for user tools
- **Keep images focused**: Create specific images for specific use cases
- **Use multi-stage builds** for complex installations

### Tool Installation
- **System tools** → Install as root with apt-get
- **User tools** → Install as claude-user with curl/wget
- **Language packages** → Use language-specific managers (pip, npm, cargo, etc.)
- **Clean up** → Remove package caches to keep images lean

### Environment Configuration
- **Preserve existing PATH** and extend it
- **Use absolute paths** for custom tool locations
- **Set appropriate permissions** for installed files
- **Document environment variables** in README

### Registry and Sharing
- **Tag consistently**: Use semantic versioning
- **Document dependencies**: List required external services
- **Provide examples**: Include sample projects or usage
- **Test regularly**: Ensure images work across different environments

## Example Workflows

### Local Development
```bash
# Build and test locally
docker build -t my-custom:latest .
docker run --rm my-custom:latest claude --version

# Use with DevContainer
claude-devcontainer init -s custom
# Edit devcontainer.json to use "my-custom:latest"
```

### Team Distribution
```bash
# Push to company registry
docker tag my-custom:latest registry.company.com/my-custom:latest
docker push registry.company.com/my-custom:latest

# Team uses: "image": "registry.company.com/my-custom:latest"
```

### Public Distribution
```bash
# Push to GitHub Container Registry
docker tag my-custom:latest ghcr.io/username/my-custom:latest
docker push ghcr.io/username/my-custom:latest

# Others use: "image": "ghcr.io/username/my-custom:latest"
```

## Testing Custom Images

### Basic Functionality Tests
```bash
# Test Claude Code works
docker run --rm my-custom:latest claude --version

# Test base tools work
docker run --rm my-custom:latest git --version
docker run --rm my-custom:latest node --version

# Test custom tools work
docker run --rm my-custom:latest your-tool --version
```

### Integration Tests
```bash
# Test full DevContainer workflow
cd test-project
claude-devcontainer init -s custom
# Edit devcontainer.json to use your image
code .
# Use "Dev Containers: Reopen in Container"
# Verify all tools work as expected
```

## Contributing Examples

To add new examples to this collection:

1. Create a new directory with a descriptive name
2. Include a Dockerfile that extends claude-base:latest
3. Add a README.md explaining the use case and tools included
4. Include any supporting scripts or configuration files
5. Test the image with actual DevContainer usage
6. Submit a pull request with your example

## Support

If you need help with custom images:

1. Check the [main README](../../tools/claude-devcontainer/README.md) for general DevContainer guidance
2. Review existing examples in this directory
3. Test with the `claude-base:latest` image first to isolate issues
4. Use `docker run --rm -it your-image:latest bash` to debug interactively

## Image Size Optimization

Keep your custom images lean:

```dockerfile
# Good: Combine operations and clean up
RUN apt-get update && apt-get install -y \
    tool1 \
    tool2 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Good: Use multi-stage builds for complex installs
FROM claude-base:latest as builder
# ... build steps ...

FROM claude-base:latest
COPY --from=builder /app/built-tool /usr/local/bin/
```

```dockerfile
# Avoid: Multiple RUN commands create layers
RUN apt-get update
RUN apt-get install -y tool1
RUN apt-get install -y tool2
RUN rm -rf /var/lib/apt/lists/*
```