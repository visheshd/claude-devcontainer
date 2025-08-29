# Claude Rust Tauri Stack Image
# Optimized for Rust development with Tauri v2 desktop application framework

ARG BASE_IMAGE=claude-base:latest
FROM ${BASE_IMAGE}

# Switch to root for system package installation
USER root

# Install Rust and Tauri system dependencies
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
    # Development tools
    lldb \
    gdb \
    strace \
    # Cross-compilation support
    gcc-mingw-w64 \
    && rm -rf /var/lib/apt/lists/*

# Switch back to claude-user
USER claude-user

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable

# Add Rust to PATH
ENV PATH="/home/claude-user/.cargo/bin:${PATH}"

# Install Rust components and targets
RUN rustup component add \
    clippy \
    rustfmt \
    rust-src \
    rust-analyzer

# Install additional Rust targets for cross-compilation
RUN rustup target add \
    wasm32-unknown-unknown \
    x86_64-pc-windows-gnu \
    aarch64-apple-darwin \
    x86_64-apple-darwin

# Install Tauri CLI v2
RUN cargo install tauri-cli@^2.0 --locked

# Install additional Rust development tools
RUN cargo install \
    cargo-watch \
    cargo-expand \
    cargo-outdated \
    cargo-audit \
    cargo-update \
    cargo-edit \
    cargo-generate \
    wasm-pack \
    --locked

# Install Bun for modern JavaScript tooling (used by Tauri frontends)
RUN curl -fsSL https://bun.sh/install | bash && \
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc

ENV PATH="/home/claude-user/.bun/bin:${PATH}"

# Create workspace directories
RUN mkdir -p \
    /workspace/src \
    /workspace/src-tauri \
    /workspace/frontend \
    /workspace/assets \
    /workspace/docs

# Create a sample Tauri project configuration
RUN echo '# Tauri Rust Development Environment\n\
\n\
## Quick Start\n\
\n\
Create a new Tauri project:\n\
```bash\n\
cargo tauri init\n\
```\n\
\n\
Or use a template:\n\
```bash\n\
cargo generate --git https://github.com/tauri-apps/tauri.git --name my-app\n\
```\n\
\n\
## Development Commands\n\
\n\
- `cargo tauri dev` - Start development server\n\
- `cargo tauri build` - Build production app\n\
- `cargo test` - Run Rust tests\n\
- `bun run dev` - Start frontend development (if using Bun)\n\
\n\
## Tools Available\n\
\n\
- Rust stable toolchain with clippy, rustfmt\n\
- Tauri CLI v2\n\
- Bun for modern JavaScript tooling\n\
- Cross-compilation targets for Windows and macOS\n\
' > /workspace/README.md

# Create startup script for Rust Tauri environment
RUN echo '#!/bin/bash\n\
echo "🦀 Rust Tauri Environment Ready"\n\
echo "Rust: $(rustc --version)"\n\
echo "Tauri CLI: $(cargo tauri --version)"\n\
echo "Bun: $(bun --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  cargo tauri init     # Initialize Tauri project"\n\
echo "  cargo tauri dev      # Start development"\n\
echo "  cargo tauri build    # Build production app"\n\
echo ""\n\
exec "$@"' > ~/.local/bin/tauri-start && \
    chmod +x ~/.local/bin/tauri-start

# Configure Rust environment
ENV RUST_BACKTRACE=1
ENV CARGO_TERM_COLOR=always

# Default working directory
WORKDIR /workspace

# Entry point optimized for Tauri development
CMD ["tauri-start", "claude-code"]