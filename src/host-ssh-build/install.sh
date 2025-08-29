#!/bin/bash
# Host SSH Build DevContainer Feature Installation Script

set -e

# Feature options
ENABLE_MACOS_BUILD="${ENABLEMACOSBUILD:-"true"}"
SSH_PORT="${SSHPORT:-"22"}"
BUILD_COMMANDS="${BUILDCOMMANDS:-"npm run build,cargo build,python -m build"}"
PROJECT_TYPES="${PROJECTTYPES:-"nodejs,rust,python"}"
ENABLE_PROJECT_DETECTION="${ENABLEPROJECTDETECTION:-"true"}"

echo "Installing Host SSH Build feature..."
echo "macOS builds enabled: $ENABLE_MACOS_BUILD"
echo "SSH port: $SSH_PORT"
echo "Project types: $PROJECT_TYPES"

# Determine user
if [ "$(id -u)" = "0" ]; then
    CURRENT_USER="root"
    USER_HOME="/root"
else
    CURRENT_USER="$(whoami)"
    USER_HOME="$HOME"
fi

# Create scripts directory
SCRIPTS_DIR="$USER_HOME/scripts"
mkdir -p "$SCRIPTS_DIR"

# Copy SSH keys from host if available
if [ -d "$USER_HOME/.ssh-host" ] && [ "$ENABLE_MACOS_BUILD" = "true" ]; then
    echo "Setting up SSH keys for host builds..."
    
    # Create SSH directory
    mkdir -p "$USER_HOME/.ssh"
    
    # Copy host SSH keys
    if [ -f "$USER_HOME/.ssh-host/id_rsa" ]; then
        cp "$USER_HOME/.ssh-host/id_rsa" "$USER_HOME/.ssh/host_id_rsa"
        chmod 600 "$USER_HOME/.ssh/host_id_rsa"
        echo "✓ Copied SSH private key for host builds"
    fi
    
    if [ -f "$USER_HOME/.ssh-host/id_rsa.pub" ]; then
        cp "$USER_HOME/.ssh-host/id_rsa.pub" "$USER_HOME/.ssh/host_id_rsa.pub"
        chmod 644 "$USER_HOME/.ssh/host_id_rsa.pub"
        echo "✓ Copied SSH public key for host builds"
    fi
else
    echo "SSH host keys not found - macOS builds will not be available"
fi

# Create enhanced macOS builder script
cat > "$SCRIPTS_DIR/macos_builder.py" << 'EOF'
#!/usr/bin/env python3
"""
Enhanced macOS Builder for DevContainer environments.
Enables SSH-based builds on the host system from within containers.
"""

import subprocess
import os
import sys
import json
import shlex
from pathlib import Path

class MacOSBuilder:
    def __init__(self, 
                 host="host.docker.internal", 
                 username=None, 
                 ssh_key_path="~/.ssh/host_id_rsa",
                 port=22):
        self.host = host
        self.username = username or os.environ.get('USER', 'vscode')
        self.ssh_key_path = os.path.expanduser(ssh_key_path)
        self.port = port
        self.enabled = os.environ.get('ENABLE_MACOS_BUILDS', 'true').lower() == 'true'
        
        self.ssh_options = [
            "-p", str(self.port),
            "-o", "ConnectTimeout=10",
            "-o", "BatchMode=yes", 
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "LogLevel=ERROR"
        ]
    
    def is_available(self):
        """Check if macOS native builds are available."""
        if not self.enabled:
            return False
        if not os.path.exists(self.ssh_key_path):
            return False
        return self.test_connection()
    
    def test_connection(self):
        """Test SSH connection to macOS host."""
        try:
            cmd = ["ssh", "-i", self.ssh_key_path] + self.ssh_options + \
                  [f"{self.username}@{self.host}", "echo", "connection_test"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            return result.returncode == 0 and "connection_test" in result.stdout
        except:
            return False
    
    def detect_project_type(self, directory="/workspace"):
        """Detect project type from files in directory."""
        dir_path = Path(directory)
        project_types = []
        
        if (dir_path / "package.json").exists():
            project_types.append("nodejs")
        if (dir_path / "Cargo.toml").exists():
            project_types.append("rust")
        if (dir_path / "pyproject.toml").exists() or (dir_path / "setup.py").exists():
            project_types.append("python")
        if (dir_path / "src-tauri").exists():
            project_types.append("tauri")
        
        return project_types
    
    def get_build_commands(self, project_types):
        """Get appropriate build commands for project types."""
        command_map = {
            "nodejs": ["npm run build", "npm run test"],
            "rust": ["cargo build --release", "cargo test"],
            "python": ["python -m build", "python -m pytest"],
            "tauri": ["cargo tauri build", "cargo tauri dev --no-open"]
        }
        
        commands = []
        for ptype in project_types:
            if ptype in command_map:
                commands.extend(command_map[ptype])
        
        return commands
    
    def execute_command(self, command, directory="/workspace"):
        """Execute command on macOS host."""
        if not self.is_available():
            return {"success": False, "error": "macOS builds not available"}
        
        # Map container workspace to host directory
        host_dir = directory.replace("/workspace", "$(pwd)")
        
        # Build SSH command
        ssh_cmd = ["ssh", "-i", self.ssh_key_path] + self.ssh_options + \
                 [f"{self.username}@{self.host}", f"cd {host_dir} && {command}"]
        
        try:
            result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=300)
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def status(self):
        """Get status information."""
        project_types = self.detect_project_type()
        build_commands = self.get_build_commands(project_types)
        
        return {
            "enabled": self.enabled,
            "available": self.is_available(),
            "connection": self.test_connection(),
            "ssh_key_exists": os.path.exists(self.ssh_key_path),
            "project_types": project_types,
            "build_commands": build_commands,
            "host": self.host,
            "username": self.username,
            "port": self.port
        }

def main():
    builder = MacOSBuilder()
    
    if len(sys.argv) < 2:
        print("Usage: macos_builder.py <command> [args...]")
        print("Commands: status, test, execute, detect")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "status":
        status = builder.status()
        if len(sys.argv) > 2 and sys.argv[2] == "json":
            print(json.dumps(status, indent=2))
        else:
            print(f"macOS Builds: {'Enabled' if status['enabled'] else 'Disabled'}")
            print(f"Connection Available: {status['available']}")
            print(f"SSH Key Exists: {status['ssh_key_exists']}")
            print(f"Project Types: {', '.join(status['project_types']) if status['project_types'] else 'None detected'}")
            print(f"Build Commands: {', '.join(status['build_commands']) if status['build_commands'] else 'None'}")
            
    elif command == "test":
        if builder.test_connection():
            print("✓ SSH connection successful")
            sys.exit(0)
        else:
            print("✗ SSH connection failed")
            sys.exit(1)
            
    elif command == "execute":
        if len(sys.argv) < 3:
            print("Usage: macos_builder.py execute <command>")
            sys.exit(1)
        
        cmd = " ".join(sys.argv[2:])
        result = builder.execute_command(cmd)
        
        if result["success"]:
            print(result["stdout"], end="")
            if result["stderr"]:
                print(result["stderr"], file=sys.stderr, end="")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}", file=sys.stderr)
            if "stderr" in result:
                print(result["stderr"], file=sys.stderr, end="")
            sys.exit(1)
            
    elif command == "detect":
        project_types = builder.detect_project_type()
        print(" ".join(project_types))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

chmod +x "$SCRIPTS_DIR/macos_builder.py"

# Create build wrapper script
cat > "$USER_HOME/.local/bin/build-on-host" << 'EOF'
#!/bin/bash
# Wrapper script to execute builds on macOS host

SCRIPTS_DIR="$HOME/scripts"

if [ ! -f "$SCRIPTS_DIR/macos_builder.py" ]; then
    echo "Error: macOS builder not available" >&2
    exit 1
fi

# Check if macOS builds are available
if ! python3 "$SCRIPTS_DIR/macos_builder.py" test >/dev/null 2>&1; then
    echo "Warning: macOS builds not available, falling back to container build" >&2
    exec "$@"
fi

# Execute command on host
python3 "$SCRIPTS_DIR/macos_builder.py" execute "$@"
EOF

chmod +x "$USER_HOME/.local/bin/build-on-host"

# Add environment variables
cat >> "$USER_HOME/.zshrc" << EOF

# Host SSH Build Integration
export ENABLE_MACOS_BUILDS="${ENABLE_MACOS_BUILD}"
export SSH_BUILD_ENABLED="true"
export PATH="\$HOME/.local/bin:\$PATH"

# Aliases for common build commands
if [ "\$ENABLE_MACOS_BUILDS" = "true" ]; then
    alias npm-build="build-on-host npm run build"
    alias cargo-build="build-on-host cargo build --release"
    alias python-build="build-on-host python -m build"
fi
EOF

echo "✓ Host SSH Build feature installation completed"

# Test connection if enabled
if [ "$ENABLE_MACOS_BUILD" = "true" ]; then
    echo "Testing macOS build connection..."
    if python3 "$SCRIPTS_DIR/macos_builder.py" test; then
        echo "✓ macOS native builds are available"
    else
        echo "⚠ macOS builds configured but connection test failed"
        echo "  Check SSH key setup and host connectivity"
    fi
fi