# Basic Extension Example
# Extends claude-base with common development tools
FROM claude-base:latest

# Switch to root for system package installation
USER root

# Install additional system tools
RUN apt-get update && apt-get install -y \
    # Database clients
    postgresql-client \
    mysql-client \
    sqlite3 \
    # Network tools
    curl \
    wget \
    httpie \
    # Text processing
    jq \
    yq \
    # System monitoring
    htop \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user for user-level installations
USER claude-user

# Install modern CLI tools as user
RUN curl -sS https://webinstall.dev/gh | bash
RUN curl -sS https://webinstall.dev/fd | bash
RUN curl -sS https://webinstall.dev/rg | bash

# Install Node.js package managers
RUN curl -fsSL https://get.pnpm.io/install.sh | sh
RUN curl -fsSL https://bun.sh/install | bash

# Add installed tools to PATH
ENV PATH="/home/claude-user/.local/bin:/home/claude-user/.bun/bin:${PATH}"

# Create common workspace directories
RUN mkdir -p /workspace/{src,docs,scripts,config}

# Set working directory
WORKDIR /workspace

# Document installed tools in startup message
RUN echo '#!/bin/bash\n\
echo "🔧 Basic Extension Environment Ready"\n\
echo "Base: Claude Code + Git + Build tools"\n\
echo "Added: Database clients, modern CLI tools, package managers"\n\
echo "Tools: gh, fd, rg, pnpm, bun, httpie, jq"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/basic-start && \
    chmod +x ~/.local/bin/basic-start

# Use custom startup script
CMD ["basic-start"]