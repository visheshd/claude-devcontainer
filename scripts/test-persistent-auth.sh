#!/bin/bash
# Test script for persistent Claude authentication
# Validates that authentication persists across container restarts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Configuration
PERSISTENT_AUTH_DIR="$HOME/.claude-docker/auth"
CLAUDE_HOME_DIR="$HOME/.claude-docker/claude-home"
SSH_DIR="$HOME/.claude-docker/ssh"
TEST_CONTAINER_NAME="claude-docker-auth-test"

# Test functions
test_persistent_directories() {
    print_status "Testing persistent directory structure..."
    
    if [ -d "$PERSISTENT_AUTH_DIR" ]; then
        print_success "Persistent auth directory exists: $PERSISTENT_AUTH_DIR"
    else
        print_error "Persistent auth directory missing: $PERSISTENT_AUTH_DIR"
        return 1
    fi
    
    if [ -d "$SSH_DIR" ]; then
        print_success "SSH directory exists: $SSH_DIR"
    else
        print_warning "SSH directory missing: $SSH_DIR (optional)"
    fi
    
    return 0
}

test_authentication_files() {
    print_status "Testing authentication file presence..."
    
    local auth_found=false
    
    if [ -f "$PERSISTENT_AUTH_DIR/.credentials.json" ]; then
        print_success "Found OAuth/API credentials: .credentials.json"
        auth_found=true
    fi
    
    if [ -f "$PERSISTENT_AUTH_DIR/.claude.json" ]; then
        print_success "Found legacy authentication: .claude.json"
        auth_found=true
    fi
    
    if [ "$auth_found" = false ]; then
        print_warning "No authentication files found - setup may be needed"
        print_status "Run: ./scripts/setup-persistent-auth.sh"
        return 1
    fi
    
    return 0
}

test_file_permissions() {
    print_status "Testing file permissions..."
    
    # Check auth directory permissions
    if [ -d "$PERSISTENT_AUTH_DIR" ]; then
        local perm=$(stat -f "%OLp" "$PERSISTENT_AUTH_DIR" 2>/dev/null || stat -c "%a" "$PERSISTENT_AUTH_DIR" 2>/dev/null)
        if [ "$perm" -ge "700" ]; then
            print_success "Auth directory permissions secure: $perm"
        else
            print_warning "Auth directory permissions loose: $perm (recommend 700+)"
        fi
    fi
    
    # Check SSH directory permissions
    if [ -d "$SSH_DIR" ]; then
        local ssh_perm=$(stat -f "%OLp" "$SSH_DIR" 2>/dev/null || stat -c "%a" "$SSH_DIR" 2>/dev/null)
        if [ "$ssh_perm" = "700" ]; then
            print_success "SSH directory permissions correct: $ssh_perm"
        else
            print_warning "SSH directory permissions: $ssh_perm (recommend 700)"
        fi
    fi
    
    return 0
}

test_container_startup() {
    print_status "Testing container startup with persistent auth..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running - cannot test container startup"
        return 1
    fi
    
    # Check if claude-docker image exists
    if ! docker images | grep -q "claude-docker"; then
        print_warning "claude-docker image not found - run build first"
        print_status "Run: ./build-all-images.sh --images claude-base"
        return 1
    fi
    
    print_status "Starting test container with persistent auth volumes..."
    
    # Start container with auth volumes
    docker run --rm --detach \
        --name "$TEST_CONTAINER_NAME" \
        --volume "$PERSISTENT_AUTH_DIR:/home/claude-user/.claude:rw" \
        --volume "$SSH_DIR:/home/claude-user/.ssh:rw" \
        claude-docker:latest \
        sleep 30 >/dev/null
    
    # Check if container started
    if docker ps | grep -q "$TEST_CONTAINER_NAME"; then
        print_success "Test container started successfully"
        
        # Test auth file mounting
        if docker exec "$TEST_CONTAINER_NAME" test -f "/home/claude-user/.claude/.credentials.json"; then
            print_success "Authentication files properly mounted"
        elif docker exec "$TEST_CONTAINER_NAME" test -f "/home/claude-user/.claude.json"; then
            print_success "Legacy authentication files properly mounted"
        else
            print_warning "No authentication files found in container"
        fi
        
        # Clean up
        docker stop "$TEST_CONTAINER_NAME" >/dev/null 2>&1
        print_success "Test container cleaned up"
        
        return 0
    else
        print_error "Test container failed to start"
        return 1
    fi
}

test_startup_script() {
    print_status "Testing startup script authentication detection..."
    
    if [ ! -f "./dockerfiles/claude-base/startup.sh" ]; then
        print_error "Startup script not found: ./dockerfiles/claude-base/startup.sh"
        return 1
    fi
    
    # Test script syntax
    if bash -n "./dockerfiles/claude-base/startup.sh"; then
        print_success "Startup script syntax is valid"
    else
        print_error "Startup script has syntax errors"
        return 1
    fi
    
    return 0
}

# Show usage
show_usage() {
    cat << EOF
Test Persistent Claude Authentication

This script validates that persistent authentication is properly configured
and working as expected.

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --quick         Run quick tests only (skip container startup test)
    --help          Show this help message

TESTS:
    1. Persistent directory structure
    2. Authentication file presence
    3. File permissions
    4. Container startup with volume mounting
    5. Startup script validation

EOF
}

# Parse arguments
QUICK_TEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_TEST=true
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

# Main test execution
main() {
    print_status "Running persistent authentication tests..."
    echo
    
    local failed_tests=0
    
    # Run tests
    test_persistent_directories || failed_tests=$((failed_tests + 1))
    echo
    
    test_authentication_files || failed_tests=$((failed_tests + 1))
    echo
    
    test_file_permissions || failed_tests=$((failed_tests + 1))
    echo
    
    test_startup_script || failed_tests=$((failed_tests + 1))
    echo
    
    # Container test (skip if --quick)
    if [ "$QUICK_TEST" != true ]; then
        test_container_startup || failed_tests=$((failed_tests + 1))
        echo
    fi
    
    # Summary
    if [ $failed_tests -eq 0 ]; then
        print_success "All tests passed! Persistent authentication is ready."
        echo
        print_status "Next steps:"
        echo "  1. Run: ./scripts/claude-docker.sh"
        echo "  2. Your Claude authentication will persist across restarts"
    else
        print_error "$failed_tests test(s) failed"
        echo
        print_status "To fix issues:"
        echo "  1. Run: ./scripts/setup-persistent-auth.sh"
        echo "  2. Ensure Claude Code is authenticated on host"
        echo "  3. Build Docker images if needed"
        exit 1
    fi
}

# Run tests
main "$@"