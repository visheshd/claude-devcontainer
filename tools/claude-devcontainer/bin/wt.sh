#!/bin/bash

# Shell wrapper for wt command that changes directory directly
# Source this file or add it to your PATH and source it in your shell

wt() {
    local script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local wt_output
    
    # Execute the wt command and capture output
    wt_output=$("$script_dir/wt" "$@")
    local exit_code=$?
    
    # If command succeeded and output contains a cd command
    if [[ $exit_code -eq 0 && $wt_output =~ cd\ \"([^\"]+)\" ]]; then
        # Extract the directory path
        local target_dir="${BASH_REMATCH[1]}"
        
        # Print all output except the cd command
        echo "$wt_output" | head -n -1
        
        # Actually change directory
        cd "$target_dir" || {
            echo "Failed to change directory to: $target_dir"
            return 1
        }
        
        echo "✅ Changed to worktree directory: $target_dir"
    else
        # Just print the output if no cd command or if command failed
        echo "$wt_output"
        return $exit_code
    fi
}

# If script is being sourced, the function is now available
# If script is being executed directly, show usage
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "This script should be sourced, not executed directly."
    echo "Add this to your ~/.bashrc or ~/.zshrc:"
    echo "source $(realpath "${BASH_SOURCE[0]}")"
    echo ""
    echo "Or create an alias:"
    echo "alias wt='source $(realpath "${BASH_SOURCE[0]}") && wt'"
fi