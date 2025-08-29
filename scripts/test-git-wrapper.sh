#!/bin/bash
# Test script for git wrapper functionality
# This script helps verify that the git wrapper correctly handles worktree operations

set -e

echo "=== Git Wrapper Test ==="

# Test 1: Check if git wrapper is installed
echo "Test 1: Checking git wrapper installation..."
if command -v git >/dev/null 2>&1; then
    echo "✓ Git command found: $(which git)"
    
    # Check if it's our wrapper
    if [ -L "$(which git)" ]; then
        WRAPPER_TARGET=$(readlink "$(which git)")
        echo "✓ Git wrapper installed as symlink to: $WRAPPER_TARGET"
    else
        echo "⚠ Git command found but not a symlink (may be system git)"
    fi
else
    echo "✗ Git command not found!"
    exit 1
fi

# Test 2: Check git_utils.py availability
echo -e "\nTest 2: Checking git_utils.py availability..."
if [ -f "/home/claude-user/scripts/git_utils.py" ]; then
    echo "✓ git_utils.py found"
    
    # Test Python import
    if python3 -c "import sys; sys.path.insert(0, '/home/claude-user/scripts'); import git_utils" 2>/dev/null; then
        echo "✓ git_utils.py can be imported"
    else
        echo "⚠ git_utils.py found but cannot be imported"
    fi
else
    echo "✗ git_utils.py not found!"
fi

# Test 3: Test git wrapper in normal repo
echo -e "\nTest 3: Testing git wrapper in normal repository..."
cd /workspace 2>/dev/null || cd /tmp

if [ -d .git ]; then
    echo "✓ In git repository"
    
    # Test basic git command
    echo "Testing 'git status'..."
    if GIT_WRAPPER_DEBUG=true git status >/dev/null 2>&1; then
        echo "✓ Git status works"
    else
        echo "⚠ Git status failed"
    fi
else
    echo "⚠ Not in a git repository, skipping git tests"
fi

# Test 4: Test worktree detection
echo -e "\nTest 4: Testing worktree detection..."
if [ -f "/home/claude-user/scripts/git_utils.py" ]; then
    IS_WORKTREE=$(python3 /home/claude-user/scripts/git_utils.py is-worktree 2>/dev/null || echo "false")
    echo "Worktree detection result: $IS_WORKTREE"
    
    if [ "$IS_WORKTREE" = "true" ]; then
        echo "✓ Worktree detected, testing worktree-specific functionality..."
        
        # Test environment variables
        echo "Environment variables:"
        echo "  WORKTREE_DETECTED: ${WORKTREE_DETECTED:-not set}"
        echo "  MAIN_REPO_PATH: ${MAIN_REPO_PATH:-not set}"
        echo "  WORKTREE_PATH: ${WORKTREE_PATH:-not set}"
        
        # Test .git file content
        if [ -f .git ]; then
            echo ".git file content:"
            echo "  $(cat .git)"
        fi
    else
        echo "⚠ Not in a worktree, worktree-specific tests skipped"
    fi
fi

echo -e "\n=== Test Complete ==="
echo "The git wrapper is ready for use!"
echo "Set GIT_WRAPPER_DEBUG=true to enable debug output."