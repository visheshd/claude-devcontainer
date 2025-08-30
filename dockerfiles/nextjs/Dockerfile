# Claude Next.js Stack Image
# Optimized for modern web development with Next.js, React, and TypeScript

ARG BASE_IMAGE=claude-base:latest
FROM ${BASE_IMAGE}

# Switch to root for system package installation
USER root

# Install additional system dependencies for web development
RUN apt-get update && apt-get install -y \
    # Image optimization dependencies
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    # Sharp dependencies for Next.js image optimization
    libvips-dev \
    # Python for native module builds
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Install Bun (modern JavaScript runtime and package manager)
RUN curl -fsSL https://bun.sh/install | bash

# Install essential global tools with Bun (faster than npm)
RUN ~/.bun/bin/bun install -g \
    typescript \
    @types/node \
    eslint \
    prettier \
    vercel

# Switch back to claude-user
USER claude-user

# Add Bun to PATH
ENV PATH="/home/claude-user/.bun/bin:${PATH}"

# Note: Additional tools can be installed as needed
# RUN bun install -g wrangler @cloudflare/next-on-pages

# Create workspace directories
RUN mkdir -p /workspace


# Create startup script for Next.js environment
RUN echo '#!/bin/bash\n\
echo "⚡ Next.js Development Environment Ready"\n\
echo "Node.js: $(node --version)"\n\
echo "Bun: $(bun --version)"\n\
echo "TypeScript: $(tsc --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  bun create next my-app               # Create new Next.js app"\n\
echo "  cd my-app && bun dev                 # Start development"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/nextjs-start && \
    chmod +x ~/.local/bin/nextjs-start

# Configure development environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

# Default working directory
WORKDIR /workspace

# Entry point optimized for Next.js development
CMD ["nextjs-start", "claude-code"]