#!/bin/bash

# Shell wrapper for wt command that changes directory directly
# Source this file or add it to your PATH and source it in your shell

wt() {
    local script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local first_arg="${1:-}"

    # `wt status` / `wt ls` — interactive command: display goes to stderr (terminal),
    # stdout only carries a `cd /path` line when the user picks "Switch to directory".
    if [[ "$first_arg" == "status" || "$first_arg" == "ls" ]]; then
        local cd_path
        cd_path=$("$script_dir/wt" "$@" 2>/dev/tty)
        local exit_code=$?
        if [[ $exit_code -eq 0 && -n "$cd_path" && "$cd_path" =~ ^cd\ (.+)$ ]]; then
            cd "${BASH_REMATCH[1]}" || {
                echo "Failed to change directory to: ${BASH_REMATCH[1]}"
                return 1
            }
            echo "✅ Changed to: ${BASH_REMATCH[1]}"
        fi
        return $exit_code
    fi

    # Default: worktree creation — capture stdout for the `cd "..."` line
    local wt_output
    wt_output=$("$script_dir/wt" "$@")
    local exit_code=$?

    if [[ $exit_code -eq 0 && $wt_output =~ cd\ \"([^\"]+)\" ]]; then
        local target_dir="${BASH_REMATCH[1]}"
        echo "$wt_output" | head -n -1
        cd "$target_dir" || {
            echo "Failed to change directory to: $target_dir"
            return 1
        }
        echo "✅ Changed to worktree directory: $target_dir"
    else
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