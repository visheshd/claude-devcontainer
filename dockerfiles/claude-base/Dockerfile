# Claude Base Image
# Provides the foundational environment for Claude Code with MCP server integration
# This base image contains the core components shared across all tech stacks

FROM node:20-slim

# Install essential system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    sudo \
    openssh-client \
    sshpass \
    zsh \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install oh-my-zsh for better shell experience
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Create a non-root user with matching host UID/GID
ARG USER_UID=1000
ARG USER_GID=1000
RUN if getent group $USER_GID > /dev/null 2>&1; then \
        GROUP_NAME=$(getent group $USER_GID | cut -d: -f1); \
    else \
        groupadd -g $USER_GID claude-user && GROUP_NAME=claude-user; \
    fi && \
    useradd -m -s /bin/zsh -u $USER_UID -g $GROUP_NAME claude-user && \
    echo "claude-user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Ensure npm global bin is in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Create app and configuration directories
WORKDIR /app
RUN mkdir -p /app/.claude /home/claude-user/.claude

# Set proper ownership for directories
RUN chown -R claude-user:claude-user /app /home/claude-user

# Switch to non-root user for remaining operations
USER claude-user

# Set HOME environment variable
ENV HOME=/home/claude-user

# Configure oh-my-zsh for claude-user
RUN cp /root/.oh-my-zsh /home/claude-user/.oh-my-zsh -r && \
    cp /root/.zshrc /home/claude-user/.zshrc

# Install uv (Python package manager) for claude-user
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add local bin and scripts to PATH
ENV PATH="/home/claude-user/.local/bin:${PATH}"

# Configure git-delta for better git diff experience
RUN curl -fsSL https://github.com/dandavison/delta/releases/download/0.16.5/delta-0.16.5-x86_64-unknown-linux-gnu.tar.gz | \
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
CMD ["claude-code"]