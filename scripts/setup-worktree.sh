#!/bin/bash
# Claude Devcontainer Worktree Setup Utility
# Sets up a git worktree with self-contained devcontainer configuration
# Usage: ./setup-worktree.sh [worktree-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$PROJECT_ROOT/templates/devcontainer"

# Default to current directory if no argument provided
WORKTREE_DIR="${1:-$(pwd)}"
DEVCONTAINER_DIR="$WORKTREE_DIR/.devcontainer"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}🚀 Claude Devcontainer Worktree Setup${NC}"
    echo "=================================================="
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Validate that we're in a git worktree
validate_worktree() {
    print_info "Validating git worktree setup..."
    
    if [ ! -f "$WORKTREE_DIR/.git" ]; then
        print_error "No .git file found in $WORKTREE_DIR"
        print_error "This script should be run in a git worktree directory"
        exit 1
    fi
    
    if ! grep -q "gitdir:" "$WORKTREE_DIR/.git" 2>/dev/null; then
        print_error "Directory is not a git worktree"
        print_error "The .git file should contain 'gitdir:' reference"
        exit 1
    fi
    
    # Extract main repo path for validation
    local gitdir_line
    gitdir_line=$(cat "$WORKTREE_DIR/.git")
    local main_repo_path
    main_repo_path=$(echo "$gitdir_line" | sed 's/gitdir: //' | sed 's|/\.git/worktrees/.*|/.git|')
    main_repo_path=$(dirname "$main_repo_path")
    
    if [ ! -d "$main_repo_path" ]; then
        print_error "Main repository not found at: $main_repo_path"
        exit 1
    fi
    
    print_success "Valid git worktree detected"
    print_info "Worktree: $(basename "$WORKTREE_DIR")"
    print_info "Main repo: $main_repo_path"
}

# Create .devcontainer directory
create_devcontainer_dir() {
    print_info "Creating .devcontainer directory..."
    
    if [ -d "$DEVCONTAINER_DIR" ]; then
        print_warning "Existing .devcontainer directory found"
        
        # Create backup if devcontainer.json exists
        if [ -f "$DEVCONTAINER_DIR/devcontainer.json" ]; then
            local backup_file="$DEVCONTAINER_DIR/devcontainer.json.backup.$(date +%s)"
            cp "$DEVCONTAINER_DIR/devcontainer.json" "$backup_file"
            print_info "Backed up existing devcontainer.json to: $(basename "$backup_file")"
        fi
    else
        mkdir -p "$DEVCONTAINER_DIR"
        print_success "Created .devcontainer directory"
    fi
}

# Copy scripts to worktree
copy_scripts() {
    print_info "Copying devcontainer scripts..."
    
    # Copy the setup scripts
    cp "$SCRIPT_DIR/setup-worktree-mounts.sh" "$DEVCONTAINER_DIR/"
    cp "$SCRIPT_DIR/configure-git-wrapper.sh" "$DEVCONTAINER_DIR/"
    chmod +x "$DEVCONTAINER_DIR/setup-worktree-mounts.sh"
    chmod +x "$DEVCONTAINER_DIR/configure-git-wrapper.sh"
    
    print_success "Copied setup-worktree-mounts.sh"
    print_success "Copied configure-git-wrapper.sh"
}

# Copy and customize devcontainer template
copy_devcontainer_template() {
    print_info "Setting up devcontainer configuration..."
    
    # Copy template files
    cp "$TEMPLATES_DIR/devcontainer.json" "$DEVCONTAINER_DIR/"
    cp "$TEMPLATES_DIR/README.md" "$DEVCONTAINER_DIR/"
    
    # Update the devcontainer.json to use local scripts
    if command -v sed >/dev/null 2>&1; then
        # Update initializeCommand to use local script
        sed -i.bak 's|"initializeCommand": ".*setup-worktree-mounts.sh"|"initializeCommand": ".devcontainer/setup-worktree-mounts.sh"|' "$DEVCONTAINER_DIR/devcontainer.json"
        
        # Update postCreateCommand to use local script  
        sed -i.bak2 's|"postCreateCommand": ".*/configure-git-wrapper.sh"|"postCreateCommand": ".devcontainer/configure-git-wrapper.sh"|' "$DEVCONTAINER_DIR/devcontainer.json"
        
        # Clean up backup files
        rm -f "$DEVCONTAINER_DIR/devcontainer.json.bak" "$DEVCONTAINER_DIR/devcontainer.json.bak2"
    fi
    
    print_success "Copied devcontainer.json template"
    print_success "Copied README.md documentation"
}

# Create .gitignore entry for devcontainer if needed
update_gitignore() {
    local gitignore_file="$WORKTREE_DIR/.gitignore"
    
    print_info "Checking .gitignore configuration..."
    
    if [ ! -f "$gitignore_file" ]; then
        print_info "No .gitignore found, creating one..."
        touch "$gitignore_file"
    fi
    
    # Check if .devcontainer is already ignored
    if ! grep -q "^\.devcontainer" "$gitignore_file" 2>/dev/null; then
        cat >> "$gitignore_file" << 'EOF'

# Claude Devcontainer (optional - remove if you want to commit devcontainer config)
# .devcontainer/
EOF
        print_success "Added .devcontainer section to .gitignore (commented out)"
        print_info "Uncomment the .devcontainer/ line if you don't want to commit devcontainer config"
    else
        print_success ".devcontainer already configured in .gitignore"
    fi
}

# Display setup summary and next steps
display_summary() {
    echo ""
    print_header
    print_success "Worktree devcontainer setup complete!"
    echo ""
    
    echo -e "${BLUE}📁 Files created:${NC}"
    echo "  .devcontainer/devcontainer.json       # Main configuration"
    echo "  .devcontainer/setup-worktree-mounts.sh # Host-side setup script"
    echo "  .devcontainer/configure-git-wrapper.sh # Container setup script"  
    echo "  .devcontainer/README.md               # Documentation"
    echo ""
    
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "  1. Open this worktree in VS Code or Cursor"
    echo "  2. Click 'Reopen in Container' when prompted"
    echo "  3. The setup will automatically configure git worktree support"
    echo ""
    
    echo -e "${BLUE}🔧 Configuration:${NC}"
    echo "  - Main repository will be mounted at /main-repo inside container"
    echo "  - Git operations will work seamlessly between host and container"
    echo "  - Debug mode: Set GIT_WRAPPER_DEBUG=true in containerEnv"
    echo ""
    
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo "  - See .devcontainer/README.md for detailed information"
    echo "  - Troubleshooting guide included"
    echo ""
    
    print_success "Ready for development! 🎉"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v git >/dev/null 2>&1; then
        print_error "git is required but not installed"
        exit 1
    fi
    
    if [ ! -d "$TEMPLATES_DIR" ]; then
        print_error "Template directory not found: $TEMPLATES_DIR"
        print_error "Make sure you're running this script from the claude-devcontainer project"
        exit 1
    fi
    
    if [ ! -f "$SCRIPT_DIR/setup-worktree-mounts.sh" ]; then
        print_error "Required script not found: setup-worktree-mounts.sh"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Main execution
main() {
    print_header
    echo "Setting up worktree: $WORKTREE_DIR"
    echo ""
    
    # Run setup steps
    check_prerequisites
    validate_worktree
    create_devcontainer_dir
    copy_scripts
    copy_devcontainer_template
    update_gitignore
    display_summary
}

# Handle command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Claude Devcontainer Worktree Setup"
    echo ""
    echo "Usage: $0 [worktree-directory]"
    echo ""
    echo "Arguments:"
    echo "  worktree-directory    Path to git worktree (default: current directory)"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "This script sets up a git worktree with self-contained devcontainer"
    echo "configuration for Claude development environment."
    exit 0
fi

# Run main function
main "$@"