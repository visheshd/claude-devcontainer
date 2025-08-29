# Host SSH Build Integration DevContainer Feature

This feature enables SSH-based builds on the host system from within DevContainers, particularly useful for macOS native builds from Linux containers.

## Usage

```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {
      "enableMacosBuild": true,
      "projectTypes": "nodejs,rust,tauri"
    }
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableMacosBuild` | boolean | `true` | Enable macOS native build support via SSH |
| `sshPort` | string | `"22"` | SSH port for host connection |
| `buildCommands` | string | `"npm run build,cargo build,python -m build"` | Supported build commands |
| `projectTypes` | string | `"nodejs,rust,python"` | Project types to detect |
| `enableProjectDetection` | boolean | `true` | Enable automatic project type detection |

## Prerequisites

### SSH Key Setup

The feature requires SSH keys to be available for host connection. Ensure your host SSH keys are accessible:

```bash
# On your host (macOS), ensure SSH keys exist
ls -la ~/.ssh/id_rsa*

# If they don't exist, generate them
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Add your public key to authorized_keys for passwordless login
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### SSH Service (macOS)

Enable Remote Login on macOS:

```bash
# Enable SSH service
sudo systemsetup -setremotelogin on

# Or through System Preferences:
# System Preferences > Sharing > Remote Login
```

## Features

### Automatic Project Detection

The feature automatically detects project types based on configuration files:

- **Node.js**: `package.json` present
- **Rust**: `Cargo.toml` present  
- **Python**: `pyproject.toml` or `setup.py` present
- **Tauri**: `src-tauri/` directory present

### Build Command Integration

Common build commands are automatically configured:

- **Node.js**: `npm run build`, `npm run test`
- **Rust**: `cargo build --release`, `cargo test`
- **Python**: `python -m build`, `python -m pytest`
- **Tauri**: `cargo tauri build`, `cargo tauri dev`

### Usage in Container

After installation, several tools are available:

```bash
# Check macOS build status
python3 ~/scripts/macos_builder.py status

# Test SSH connection
python3 ~/scripts/macos_builder.py test

# Execute command on host
python3 ~/scripts/macos_builder.py execute "npm run build"

# Use convenience wrapper
build-on-host npm run build

# Use aliases (if enabled)
npm-build        # Runs npm run build on host
cargo-build      # Runs cargo build --release on host
python-build     # Runs python -m build on host
```

## Configuration Examples

### Tauri Desktop App

```json
{
  "name": "Tauri Desktop App",
  "image": "ghcr.io/your-org/claude-rust-tauri:latest",
  
  "features": {
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {
      "enableMacosBuild": true,
      "projectTypes": "rust,tauri",
      "buildCommands": "cargo tauri build,cargo tauri dev --no-open"
    }
  },
  
  "forwardPorts": [1420],
  "postCreateCommand": "cargo install tauri-cli"
}
```

### Node.js with Native Dependencies

```json
{
  "name": "Node.js with Native Builds",
  "image": "ghcr.io/your-org/claude-nextjs:latest",
  
  "features": {
    "ghcr.io/your-org/devcontainer-features/host-ssh-build:1": {
      "enableMacosBuild": true,
      "projectTypes": "nodejs",
      "buildCommands": "npm run build,npm run build:native"
    }
  }
}
```

## Troubleshooting

### SSH Connection Issues

1. **Check SSH keys**:
   ```bash
   ls -la ~/.ssh/host_id_rsa*
   ```

2. **Test connection manually**:
   ```bash
   ssh -i ~/.ssh/host_id_rsa -o StrictHostKeyChecking=no user@host.docker.internal "echo test"
   ```

3. **Verify host SSH service**:
   ```bash
   # On macOS host
   sudo systemsetup -getremotelogin
   ```

### Permission Issues

Ensure SSH keys have correct permissions:

```bash
chmod 600 ~/.ssh/host_id_rsa
chmod 644 ~/.ssh/host_id_rsa.pub
```

### Project Not Detected

Check if project files are in the expected locations:

```bash
# Run project detection
python3 ~/scripts/macos_builder.py detect

# Check current directory structure
ls -la /workspace/
```

### Build Command Failures

1. Verify the command works on the host:
   ```bash
   # Test on host directly
   ssh user@host.docker.internal "cd /path/to/project && your-build-command"
   ```

2. Check working directory mapping:
   - Container: `/workspace`
   - Host: Should be your project directory

## Environment Variables

The feature sets several environment variables:

- `ENABLE_MACOS_BUILDS`: Set to `"true"` when enabled
- `SSH_BUILD_ENABLED`: Set to `"true"`
- `PATH`: Updated to include `~/.local/bin`

## Security Considerations

- SSH keys are copied from host `~/.ssh` to container
- Connections use `StrictHostKeyChecking=no` for convenience
- Keys are stored with appropriate permissions (600/644)
- Only localhost/container-to-host connections are supported