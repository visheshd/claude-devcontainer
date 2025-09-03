#!/bin/bash
# Migration script to update existing DevContainer configurations
# Converts old ~/.claude mounts to unified ~/.claude-docker/auth mounts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[MIGRATE]${NC} $1"
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

show_usage() {
    cat << EOF
Migrate DevContainer Authentication

This script updates existing DevContainer configurations to use the unified
persistent authentication directory (~/.claude-docker/auth).

USAGE:
    $0 [OPTIONS] [PATH]

OPTIONS:
    --dry-run       Show what would be changed without making changes
    --force         Skip confirmation prompts
    --recursive     Search recursively for devcontainer.json files
    --help          Show this help message

ARGUMENTS:
    PATH           Directory to search for devcontainer.json files (default: current directory)

WHAT IT DOES:
    1. Finds devcontainer.json files
    2. Updates mount paths from ~/.claude to ~/.claude-docker/auth
    3. Preserves all other configuration
    4. Creates backups before making changes

EXAMPLES:
    # Migrate current directory
    $0
    
    # Dry run to see what would change
    $0 --dry-run
    
    # Migrate specific directory recursively
    $0 --recursive ~/projects
    
    # Force migrate without prompts
    $0 --force --recursive

EOF
}

# Configuration
DRY_RUN=false
FORCE=false
RECURSIVE=false
SEARCH_PATH="."
BACKUP_SUFFIX=".backup-$(date +%Y%m%d-%H%M%S)"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --recursive)
            RECURSIVE=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            SEARCH_PATH="$1"
            shift
            ;;
    esac
done

# Function to find devcontainer.json files
find_devcontainer_files() {
    local search_path="$1"
    
    if [ "$RECURSIVE" = true ]; then
        find "$search_path" -name "devcontainer.json" -type f 2>/dev/null
    else
        find "$search_path" -maxdepth 3 -name "devcontainer.json" -type f 2>/dev/null
    fi
}

# Function to check if file needs migration
needs_migration() {
    local file="$1"
    
    if grep -q '\.claude,target=' "$file" 2>/dev/null; then
        if ! grep -q '\.claude-docker/auth,target=' "$file" 2>/dev/null; then
            return 0  # Needs migration
        fi
    fi
    
    return 1  # No migration needed
}

# Function to migrate a single file
migrate_file() {
    local file="$1"
    local backup_file="${file}${BACKUP_SUFFIX}"
    
    if [ "$DRY_RUN" = true ]; then
        print_status "Would update: $file"
        echo "  OLD: source=\${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
        echo "  NEW: source=\${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind"
        return 0
    fi
    
    # Create backup
    cp "$file" "$backup_file"
    print_status "Created backup: $backup_file"
    
    # Perform migration
    sed -i.tmp 's|source=${localEnv:HOME}/\.claude,target=/home/claude-user/\.claude,type=bind|source=${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind|g' "$file"
    rm -f "${file}.tmp"
    
    print_success "Migrated: $file"
    
    # Verify the change worked
    if grep -q '\.claude-docker/auth,target=' "$file"; then
        print_success "✓ Verification passed"
    else
        print_error "✗ Verification failed - restoring backup"
        mv "$backup_file" "$file"
        return 1
    fi
    
    return 0
}

# Function to show summary of changes
show_migration_summary() {
    local files=("$@")
    
    echo
    print_status "Migration Summary:"
    echo "  Files to migrate: ${#files[@]}"
    echo "  Search path: $SEARCH_PATH"
    echo "  Recursive: $RECURSIVE"
    echo "  Dry run: $DRY_RUN"
    echo
    
    if [ ${#files[@]} -eq 0 ]; then
        print_success "No files need migration - all configurations are up to date!"
        return 0
    fi
    
    print_status "Files that will be migrated:"
    for file in "${files[@]}"; do
        echo "  • $file"
    done
    echo
    
    if [ "$DRY_RUN" = true ]; then
        print_status "This was a dry run - no changes were made"
        print_status "Run without --dry-run to perform the migration"
        return 0
    fi
    
    return 1  # Files need migration
}

# Function to confirm migration
confirm_migration() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo -n "Proceed with migration? [y/N] "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            print_status "Migration cancelled"
            return 1
            ;;
    esac
}

# Main execution
main() {
    print_status "DevContainer Authentication Migration Tool"
    echo
    
    # Validate search path
    if [ ! -d "$SEARCH_PATH" ]; then
        print_error "Search path does not exist: $SEARCH_PATH"
        exit 1
    fi
    
    # Find devcontainer.json files
    print_status "Searching for devcontainer.json files..."
    
    mapfile -t devcontainer_files < <(find_devcontainer_files "$SEARCH_PATH")
    
    if [ ${#devcontainer_files[@]} -eq 0 ]; then
        print_warning "No devcontainer.json files found in $SEARCH_PATH"
        exit 0
    fi
    
    print_status "Found ${#devcontainer_files[@]} devcontainer.json files"
    
    # Check which files need migration
    files_to_migrate=()
    for file in "${devcontainer_files[@]}"; do
        if needs_migration "$file"; then
            files_to_migrate+=("$file")
        fi
    done
    
    # Show summary
    show_migration_summary "${files_to_migrate[@]}"
    migration_needed=$?
    
    if [ $migration_needed -eq 0 ]; then
        exit 0  # No migration needed
    fi
    
    # Confirm before proceeding
    if ! confirm_migration; then
        exit 0
    fi
    
    # Perform migration
    print_status "Starting migration..."
    
    failed_migrations=0
    for file in "${files_to_migrate[@]}"; do
        if ! migrate_file "$file"; then
            failed_migrations=$((failed_migrations + 1))
        fi
    done
    
    # Final summary
    echo
    if [ $failed_migrations -eq 0 ]; then
        print_success "Migration completed successfully!"
        echo
        print_status "Next steps:"
        echo "  1. Run: ./scripts/setup-persistent-auth.sh"
        echo "  2. Restart any running DevContainers"
        echo "  3. Authentication will now persist across container restarts"
    else
        print_error "$failed_migrations migration(s) failed"
        print_status "Check the output above for details"
        exit 1
    fi
}

# Run main function
main "$@"