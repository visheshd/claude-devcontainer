# Claude Base Image
# Provides the foundational environment for Claude Code with MCP server integration
# This base image contains the core components shared across all tech stacks

FROM node:20-slim

# Install essential system dependencies (removed zsh)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    sudo \
    openssh-client \
    sshpass \
    ca-certificates \
    gnupg \
    lsb-release \
    procps \
    psmisc \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with matching host UID/GID (using bash)
ARG USER_UID=1000
ARG USER_GID=1000
RUN if getent passwd $USER_UID > /dev/null 2>&1; then \
        EXISTING_USER=$(getent passwd $USER_UID | cut -d: -f1); \
        echo "Using existing user: $EXISTING_USER"; \
        usermod -l claude-user -d /home/claude-user -m $EXISTING_USER || true; \
        GROUP_NAME=$(getent group $USER_GID | cut -d: -f1); \
    else \
        if getent group $USER_GID > /dev/null 2>&1; then \
            GROUP_NAME=$(getent group $USER_GID | cut -d: -f1); \
        else \
            groupadd -g $USER_GID claude-user && GROUP_NAME=claude-user; \
        fi && \
        useradd -m -s /bin/bash -u $USER_UID -g $GROUP_NAME claude-user; \
    fi && \
    echo "claude-user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "GROUP_NAME=$GROUP_NAME" > /tmp/group_info

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Ensure npm global bin is in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Create app and configuration directories
WORKDIR /app
RUN mkdir -p /app/.claude /home/claude-user/.claude /home/claude-user/scripts

# Copy git wrapper script, Claude wrapper, and utilities
COPY scripts/git-wrapper.sh /home/claude-user/scripts/
COPY scripts/claude-wrapper.sh /home/claude-user/scripts/
COPY scripts/git_utils.py /home/claude-user/scripts/
RUN chmod +x /home/claude-user/scripts/git-wrapper.sh /home/claude-user/scripts/claude-wrapper.sh

# Install git wrapper at higher precedence than system git
RUN ln -sf /home/claude-user/scripts/git-wrapper.sh /usr/local/bin/git

# Install Claude wrapper at higher precedence than system claude-code
RUN ln -sf /home/claude-user/scripts/claude-wrapper.sh /usr/local/bin/claude

# Create simple bash prompt (no git integration)
RUN echo 'PS1="\u@\h:\w\$ "' > /home/claude-user/.bashrc && \
    echo 'export PATH="/home/claude-user/.local/bin:$PATH"' >> /home/claude-user/.bashrc

# Set proper ownership for directories
RUN GROUP_NAME=$(cat /tmp/group_info | cut -d= -f2) && \
    chown -R claude-user:$GROUP_NAME /app /home/claude-user

# Switch to non-root user for remaining operations
USER claude-user

# Set HOME environment variable
ENV HOME=/home/claude-user

# Install uv (Python package manager) for claude-user
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add local bin and scripts to PATH
ENV PATH="/home/claude-user/.local/bin:${PATH}"
ENV PYTHONPATH="/home/claude-user/scripts:${PYTHONPATH}"

# Configure git-delta for better git diff experience
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        DELTA_ARCH="x86_64-unknown-linux-gnu"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        DELTA_ARCH="aarch64-unknown-linux-gnu"; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    echo "Installing delta for architecture: $DELTA_ARCH" && \
    curl -fsSL https://github.com/dandavison/delta/releases/download/0.16.5/delta-0.16.5-${DELTA_ARCH}.tar.gz | \
    tar -xz -C /tmp && \
    sudo mv /tmp/delta-*/delta /usr/local/bin/

# Configure git for delta
RUN git config --global core.pager "delta" && \
    git config --global interactive.diffFilter "delta --color-only" && \
    git config --global delta.navigate true && \
    git config --global delta.light false && \
    git config --global merge.conflictstyle diff3 && \
    git config --global diff.colorMoved default

# Set up git configuration from build args (if provided)
ARG GIT_USER_NAME=""
ARG GIT_USER_EMAIL=""
RUN if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then \
        echo "Configuring git user from build args: $GIT_USER_NAME <$GIT_USER_EMAIL>" && \
        git config --global user.name "$GIT_USER_NAME" && \
        git config --global user.email "$GIT_USER_EMAIL" && \
        echo "Git configuration complete"; \
    else \
        echo "Warning: No git user configured. Set GIT_USER_NAME and GIT_USER_EMAIL build args"; \
    fi

# Set working directory to workspace mount point
WORKDIR /workspace

# Default environment
ENV NODE_ENV=production

# Base entrypoint - can be overridden by derived images
CMD ["claude"]