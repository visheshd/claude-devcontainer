# Claude Rust Tauri Stack Image
# Optimized for Rust development with Tauri v2 desktop application framework

ARG BASE_IMAGE=claude-base:latest
FROM ${BASE_IMAGE}

# Switch to root for system package installation
USER root

# Install Rust and Tauri system dependencies (optimized)
RUN apt-get update && apt-get install -y \
    # Core build tools
    pkg-config \
    libssl-dev \
    # Tauri v2 system dependencies
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libglib2.0-dev \
    libgdk-pixbuf2.0-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libatk1.0-dev \
    libsoup2.4-dev \
    libjavascriptcoregtk-4.0-dev \
    # Additional GUI dependencies
    libayatana-appindicator3-dev \
    librsvg2-dev \
    # Audio support
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Install Rust toolchain (minimal profile to save disk space)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# Add Rust to PATH
ENV PATH="/home/claude-user/.cargo/bin:${PATH}"

# Install Rust components and targets
RUN rustup component add \
    clippy \
    rustfmt \
    rust-src \
    rust-analyzer

# Install essential WASM target (others can be added on-demand)
RUN rustup target add wasm32-unknown-unknown

# Install Tauri CLI v2
RUN cargo install tauri-cli@^2.0 --locked

# Install essential Rust development tools (optimized list)
RUN cargo install \
    cargo-watch \
    cargo-edit \
    wasm-pack \
    --locked

# Install Bun for modern JavaScript tooling (used by Tauri frontends)
RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/home/claude-user/.bun/bin:${PATH}"

# Create workspace directories
RUN mkdir -p \
    /workspace/src \
    /workspace/src-tauri \
    /workspace/frontend \
    /workspace/assets \
    /workspace/docs


# Create startup script for Rust Tauri environment (optimized)
RUN echo '#!/bin/bash\n\
echo "🦀 Rust Tauri Environment Ready"\n\
echo "Rust: $(rustc --version)"\n\
echo "Tauri CLI: $(cargo tauri --version)"\n\
echo "Bun: $(bun --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  cargo tauri init                     # Initialize project"\n\
echo "  cargo tauri dev                      # Start development"\n\
echo "  rustup target add <target>          # Add cross-compilation targets"\n\
echo "  cargo install cargo-<tool> --locked # Install additional tools"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/tauri-start && \
    chmod +x ~/.local/bin/tauri-start

# Configure Rust environment
ENV RUST_BACKTRACE=1
ENV CARGO_TERM_COLOR=always

# Default working directory
WORKDIR /workspace

# Entry point optimized for Tauri development
CMD ["tauri-start", "claude-code"]