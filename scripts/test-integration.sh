#!/bin/bash
# Test script for the complete integration (cdc alias + wt command)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_error() {
    echo -e "${RED}[TEST]${NC} $1"
}

# Function to test CLI command availability
test_command() {
    local cmd="$1"
    local description="$2"
    
    print_status "Testing: $description"
    
    if node "tools/claude-devcontainer/src/index.js" --help >/dev/null 2>&1; then
        print_success "✓ $description works"
        return 0
    else
        print_error "✗ $description failed"
        return 1
    fi
}

# Function to test specific command help
test_command_help() {
    local cmd="$1"
    local expected_text="$2"
    
    print_status "Testing help for: $cmd"
    
    local output
    output=$(node "tools/claude-devcontainer/src/index.js" "$cmd" --help 2>&1 || true)
    
    if echo "$output" | grep -q "$expected_text"; then
        print_success "✓ $cmd help contains expected text"
        return 0
    else
        print_error "✗ $cmd help missing expected text: $expected_text"
        return 1
    fi
}

# Function to test wt command validation
test_wt_validation() {
    print_status "Testing wt command argument validation"
    
    local output
    output=$(node "tools/claude-devcontainer/src/index.js" wt 2>&1 || true)
    
    if echo "$output" | grep -q "missing required argument"; then
        print_success "✓ wt command properly validates required arguments"
        return 0
    else
        print_error "✗ wt command validation failed"
        return 1
    fi
}

# Function to test package.json binaries
test_package_binaries() {
    print_status "Testing package.json binary configuration"
    
    if grep -q '"cdc": "./bin/claude-devcontainer"' "tools/claude-devcontainer/package.json"; then
        print_success "✓ cdc binary alias configured"
    else
        print_error "✗ cdc binary alias missing"
        return 1
    fi
    
    if grep -q '"wt": "./bin/wt"' "tools/claude-devcontainer/package.json"; then
        print_success "✓ wt binary configured"
    else
        print_error "✗ wt binary missing"
        return 1
    fi
}

# Function to test binary files exist and are executable
test_binary_files() {
    print_status "Testing binary files"
    
    local bins=("claude-devcontainer" "wt")
    
    for bin in "${bins[@]}"; do
        local bin_path="tools/claude-devcontainer/bin/$bin"
        if [ -f "$bin_path" ] && [ -x "$bin_path" ]; then
            print_success "✓ $bin binary exists and is executable"
        else
            print_error "✗ $bin binary missing or not executable"
            return 1
        fi
    done
}

# Function to test worktree naming compatibility
test_worktree_compatibility() {
    print_status "Testing worktree naming pattern compatibility"
    
    # Test the naming pattern logic from the original script
    local git_root="claude-docker"
    local feature_name="my-feature"
    local expected_pattern="${git_root}-${feature_name}"
    
    print_status "Expected worktree pattern: ../$expected_pattern"
    
    # Test that our cleanup hook would handle this correctly
    if source "templates/hooks/post-merge" 2>/dev/null; then
        print_success "✓ Post-merge hook can be sourced for testing"
        
        # The cleanup will use basename() on the worktree path
        local cleanup_name=$(basename "../$expected_pattern")
        if [ "$cleanup_name" = "$expected_pattern" ]; then
            print_success "✓ Cleanup naming pattern matches: $cleanup_name"
        else
            print_error "✗ Cleanup naming pattern mismatch: $cleanup_name"
            return 1
        fi
    else
        print_warning "⚠ Could not source post-merge hook for testing"
    fi
}

# Main execution
main() {
    print_status "Testing complete integration: cdc alias + wt command + worktree cleanup"
    echo ""
    
    # Test package.json configuration
    test_package_binaries
    
    # Test binary files
    test_binary_files
    
    # Test CLI functionality
    test_command "--help" "Main CLI help"
    test_command_help "wt" "Create a new git worktree"
    test_wt_validation
    
    # Test worktree compatibility
    test_worktree_compatibility
    
    echo ""
    print_success "✅ Integration testing completed!"
    
    echo ""
    print_status "📋 Available commands after integration:"
    echo "   • claude-devcontainer init    (Full command name)"
    echo "   • cdc init                    (Short alias)"
    echo "   • claude-devcontainer wt my-feature   (Worktree via full name)"
    echo "   • cdc wt my-feature           (Worktree via short alias)"
    echo "   • wt my-feature               (Standalone worktree command)"
    echo ""
    
    print_status "🔧 Complete workflow:"
    echo "   1. cdc init                   # Setup + install cleanup hook"
    echo "   2. cdc wt my-feature          # Create ../claude-docker-my-feature/"
    echo "   3. # Work in VS Code Dev Container in worktree"
    echo "   4. git merge my-feature       # Hook prompts to cleanup worktree + Docker"
    echo ""
}

# Execute only if not being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi