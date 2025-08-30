# Custom Images for Claude DevContainers

This directory contains practical examples for creating custom Claude DevContainer images tailored for specific development stacks. All examples extend from `claude-base:latest` to ensure compatibility with the Claude Code toolchain.

## Available Examples

### Ruby on Rails Development
**Path**: `ruby-rails/`  
**Use Case**: Full-stack Ruby web development with Rails 7, PostgreSQL, Redis, and modern tooling
- Ruby 3.2 with rbenv version management
- Rails 7.1+ with Hotwire and modern frontend tools
- Database clients (PostgreSQL, Redis, SQLite)
- RuboCop, RSpec, and development tools

### Laravel Development  
**Path**: `laravel/`  
**Use Case**: Modern PHP web development with Laravel 10, Composer, and testing frameworks
- PHP 8.2 with all essential extensions
- Laravel installer and global tools
- Database support (MySQL, PostgreSQL, Redis)
- Xdebug, PHPStan, Laravel Pint for code quality

## Directory Structure

```
docs/custom-images/
├── README.md                           # This file
├── ruby-rails/                         # Ruby on Rails development
│   ├── Dockerfile
│   └── README.md
└── laravel/                            # Laravel PHP development
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

### Building Ruby on Rails Image
```bash
# Build Rails development environment
docker build -f docs/custom-images/ruby-rails/Dockerfile -t claude-rails:latest .

# Test the Rails environment
docker run --rm claude-rails:latest rails-start

# Use with DevContainer
claude-devcontainer init -s custom
# Edit devcontainer.json: "image": "claude-rails:latest"
```

### Building Laravel Image  
```bash
# Build Laravel development environment
docker build -f docs/custom-images/laravel/Dockerfile -t claude-laravel:latest .

# Test the Laravel environment
docker run --rm claude-laravel:latest laravel-start

# Use with DevContainer
claude-devcontainer init -s custom
# Edit devcontainer.json: "image": "claude-laravel:latest"
```

### Team Distribution
```bash
# Push to company registry
docker tag claude-rails:latest registry.company.com/claude-rails:latest
docker push registry.company.com/claude-rails:latest

# Team uses: "image": "registry.company.com/claude-rails:latest"
```

### Public Distribution
```bash
# Push to GitHub Container Registry
docker tag claude-laravel:latest ghcr.io/username/claude-laravel:latest
docker push ghcr.io/username/claude-laravel:latest

# Others use: "image": "ghcr.io/username/claude-laravel:latest"
```

## Testing Custom Images

### Basic Functionality Tests
```bash
# Test Rails image
docker run --rm claude-rails:latest ruby --version
docker run --rm claude-rails:latest rails --version
docker run --rm claude-rails:latest bundle --version

# Test Laravel image  
docker run --rm claude-laravel:latest php --version
docker run --rm claude-laravel:latest composer --version
docker run --rm claude-laravel:latest laravel --version

# Test base Claude functionality
docker run --rm claude-rails:latest claude --version
```

### Integration Tests
```bash
# Test Rails DevContainer workflow
mkdir test-rails-project && cd test-rails-project
claude-devcontainer init -s custom
# Edit devcontainer.json: "image": "claude-rails:latest"
code .
# Use "Dev Containers: Reopen in Container"
# Test: rails new myapp && cd myapp && rails server

# Test Laravel DevContainer workflow  
mkdir test-laravel-project && cd test-laravel-project
claude-devcontainer init -s custom
# Edit devcontainer.json: "image": "claude-laravel:latest"  
code .
# Use "Dev Containers: Reopen in Container"
# Test: laravel new myapp && cd myapp && php artisan serve
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