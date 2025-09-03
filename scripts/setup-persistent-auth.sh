#!/bin/bash
# Setup script for persistent Claude authentication
# Migrates existing authentication to persistent storage for Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PERSISTENT_AUTH_DIR="$HOME/.claude-docker/auth"
CLAUDE_HOME_DIR="$HOME/.claude-docker/claude-home"
SSH_DIR="$HOME/.claude-docker/ssh"

show_usage() {
    cat << EOF
Setup Persistent Claude Authentication

This script helps you migrate your existing Claude Code authentication
to persistent storage that works across Docker container restarts.

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --force         Force overwrite existing persistent authentication
    --backup        Create backup of existing persistent auth before migration
    --help          Show this help message

WHAT THIS DOES:
    1. Creates persistent storage directories in ~/.claude-docker/
    2. Copies your existing Claude authentication from ~/.claude/
    3. Copies SSH keys from ~/.ssh/ for git operations
    4. Sets proper permissions

AFTER SETUP:
    Run ./scripts/claude-docker.sh and you won't need to re-login!

EOF
}

# Parse arguments
FORCE=false
BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --backup)
            BACKUP=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if Claude authentication exists
check_claude_auth() {
    if [ ! -d "$HOME/.claude" ]; then
        print_error "No Claude directory found at $HOME/.claude"
        print_error "Please run 'claude' and authenticate first, then run this script"
        exit 1
    fi
    
    if [ ! -f "$HOME/.claude/.credentials.json" ] && [ ! -f "$HOME/.claude.json" ]; then
        print_warning "No authentication files found in $HOME/.claude"
        print_warning "You may need to authenticate Claude Code first"
    else
        print_success "Found existing Claude authentication"
    fi
}

# Create backup if requested
create_backup() {
    if [ "$BACKUP" = true ] && [ -d "$PERSISTENT_AUTH_DIR" ]; then
        local backup_dir="$HOME/.claude-docker/backup-$(date +%Y%m%d-%H%M%S)"
        print_status "Creating backup at $backup_dir"
        mkdir -p "$backup_dir"
        cp -r "$PERSISTENT_AUTH_DIR" "$backup_dir/auth" 2>/dev/null || true
        cp -r "$CLAUDE_HOME_DIR" "$backup_dir/claude-home" 2>/dev/null || true
        cp -r "$SSH_DIR" "$backup_dir/ssh" 2>/dev/null || true
        print_success "Backup created at $backup_dir"
    fi
}

# Setup persistent directories
setup_directories() {
    print_status "Setting up persistent directories..."
    
    # Create base directory
    mkdir -p "$HOME/.claude-docker"
    
    # Create authentication directory
    if [ -d "$PERSISTENT_AUTH_DIR" ] && [ "$FORCE" != true ]; then
        print_warning "Persistent auth directory already exists: $PERSISTENT_AUTH_DIR"
        print_warning "Use --force to overwrite or --backup to backup first"
    else
        mkdir -p "$PERSISTENT_AUTH_DIR"
        print_success "Created persistent auth directory: $PERSISTENT_AUTH_DIR"
    fi
    
    # Create Claude home directory
    mkdir -p "$CLAUDE_HOME_DIR"
    
    # Create SSH directory
    mkdir -p "$SSH_DIR"
}

# Migrate Claude authentication
migrate_claude_auth() {
    print_status "Migrating Claude authentication..."
    
    local copied_files=0
    
    # Copy .credentials.json if it exists
    if [ -f "$HOME/.claude/.credentials.json" ]; then
        if [ "$FORCE" = true ] || [ ! -f "$PERSISTENT_AUTH_DIR/.credentials.json" ]; then
            cp "$HOME/.claude/.credentials.json" "$PERSISTENT_AUTH_DIR/"
            print_success "Copied .credentials.json"
            copied_files=$((copied_files + 1))
        else
            print_warning "Persistent .credentials.json already exists (use --force to overwrite)"
        fi
    fi
    
    # Copy legacy .claude.json if it exists
    if [ -f "$HOME/.claude.json" ]; then
        if [ "$FORCE" = true ] || [ ! -f "$PERSISTENT_AUTH_DIR/.claude.json" ]; then
            cp "$HOME/.claude.json" "$PERSISTENT_AUTH_DIR/"
            print_success "Copied legacy .claude.json"
            copied_files=$((copied_files + 1))
        fi
    fi
    
    # Copy other Claude files
    if [ -d "$HOME/.claude" ]; then
        for file in "$HOME/.claude"/*; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                if [[ "$filename" != ".credentials.json" ]]; then
                    if [ "$FORCE" = true ] || [ ! -f "$PERSISTENT_AUTH_DIR/$filename" ]; then
                        cp "$file" "$PERSISTENT_AUTH_DIR/"
                        copied_files=$((copied_files + 1))
                    fi
                fi
            fi
        done
        
        # Copy directories
        for dir in "$HOME/.claude"/*; do
            if [ -d "$dir" ]; then
                local dirname=$(basename "$dir")
                if [ "$FORCE" = true ] || [ ! -d "$PERSISTENT_AUTH_DIR/$dirname" ]; then
                    cp -r "$dir" "$PERSISTENT_AUTH_DIR/"
                    copied_files=$((copied_files + 1))
                fi
            fi
        done
    fi
    
    if [ $copied_files -gt 0 ]; then
        print_success "Migrated $copied_files Claude authentication items"
    else
        print_warning "No new authentication files to migrate"
    fi
}

# Migrate SSH keys
migrate_ssh_keys() {
    print_status "Migrating SSH keys..."
    
    if [ ! -d "$HOME/.ssh" ]; then
        print_warning "No SSH directory found at $HOME/.ssh"
        return
    fi
    
    local copied_files=0
    
    # Copy SSH files
    for file in "$HOME/.ssh"/*; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            if [ "$FORCE" = true ] || [ ! -f "$SSH_DIR/$filename" ]; then
                cp "$file" "$SSH_DIR/"
                copied_files=$((copied_files + 1))
            fi
        fi
    done
    
    if [ $copied_files -gt 0 ]; then
        # Set proper permissions
        chmod 700 "$SSH_DIR"
        chmod 600 "$SSH_DIR"/* 2>/dev/null || true
        print_success "Migrated $copied_files SSH key files"
    else
        print_warning "No new SSH files to migrate"
    fi
}

# Show final status
show_status() {
    print_success "Setup complete! Persistent authentication ready."
    echo
    print_status "Persistent directories created:"
    echo "  • Auth:  $PERSISTENT_AUTH_DIR"
    echo "  • Home:  $CLAUDE_HOME_DIR" 
    echo "  • SSH:   $SSH_DIR"
    echo
    print_status "Next steps:"
    echo "  1. Run: ./scripts/claude-docker.sh"
    echo "  2. Your authentication will persist across container restarts"
    echo "  3. No more re-login required!"
    echo
    if [ -f "$PERSISTENT_AUTH_DIR/.credentials.json" ]; then
        print_success "✓ OAuth/API authentication ready"
    fi
    if [ -f "$SSH_DIR/id_rsa" ] || [ -f "$SSH_DIR/id_ed25519" ]; then
        print_success "✓ SSH keys ready for git operations"
    fi
}

# Main execution
main() {
    print_status "Claude Docker - Setting up persistent authentication"
    echo
    
    check_claude_auth
    create_backup
    setup_directories
    migrate_claude_auth
    migrate_ssh_keys
    show_status
}

# Run main
main "$@"