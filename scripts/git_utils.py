import subprocess
import os
import json
from pathlib import Path

def run_git_command(args, cwd=None, capture_output=True, text=True):
    """
    Run a git command and return the result.
    
    Args:
        args (list): Git command arguments
        cwd (str, optional): Working directory for the command
        capture_output (bool): Whether to capture output
        text (bool): Whether to decode output as text
    
    Returns:
        subprocess.CompletedProcess: Result of the git command
    """
    if cwd is None:
        cwd = os.getcwd()
    
    try:
        return subprocess.run(
            ["/usr/bin/git"] + args,
            cwd=cwd,
            capture_output=capture_output,
            text=text,
            check=False
        )
    except FileNotFoundError:
        return None

def is_git_repo(path=None):
    """
    Check if the given path (or current directory) is inside a git repository.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    
    Returns:
        bool: True if inside a git repository
    """
    if path is None:
        path = os.getcwd()
    
    result = run_git_command(["rev-parse", "--git-dir"], cwd=path)
    return result is not None and result.returncode == 0

def is_git_worktree(path=None):
    """
    Check if the given path (or current directory) is a git worktree.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    
    Returns:
        bool: True if this is a git worktree (not the main repository)
    """
    if path is None:
        path = os.getcwd()
    
    if not is_git_repo(path):
        return False
    
    # Check if .git is a file (worktree) or directory (main repo)
    git_dir_result = run_git_command(["rev-parse", "--git-dir"], cwd=path)
    if git_dir_result is None or git_dir_result.returncode != 0:
        return False
    
    git_dir = git_dir_result.stdout.strip()
    git_path = Path(path) / ".git"
    
    # If .git is a file, this is likely a worktree
    if git_path.exists() and git_path.is_file():
        return True
    
    # Alternative check: see if we're in a worktree using git worktree list
    worktree_result = run_git_command(["worktree", "list", "--porcelain"], cwd=path)
    if worktree_result is None or worktree_result.returncode != 0:
        return False
    
    current_path = Path(path).resolve()
    for line in worktree_result.stdout.splitlines():
        if line.startswith("worktree "):
            worktree_path = Path(line.split(" ", 1)[1]).resolve()
            if worktree_path == current_path:
                return True
    
    return False

def get_git_repo_info(path=None):
    """
    Get comprehensive information about the git repository.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    
    Returns:
        dict: Repository information including:
            - is_repo: bool
            - is_worktree: bool
            - root_path: str (repository root)
            - current_branch: str
            - remote_url: str
            - commit_hash: str
            - worktree_info: dict (if applicable)
    """
    if path is None:
        path = os.getcwd()
    
    info = {
        "is_repo": False,
        "is_worktree": False,
        "root_path": None,
        "current_branch": None,
        "remote_url": None,
        "commit_hash": None,
        "worktree_info": None
    }
    
    # Check if this is a git repository
    if not is_git_repo(path):
        return info
    
    info["is_repo"] = True
    info["is_worktree"] = is_git_worktree(path)
    
    # Get repository root
    root_result = run_git_command(["rev-parse", "--show-toplevel"], cwd=path)
    if root_result and root_result.returncode == 0:
        info["root_path"] = root_result.stdout.strip()
    
    # Get current branch
    branch_result = run_git_command(["branch", "--show-current"], cwd=path)
    if branch_result and branch_result.returncode == 0:
        info["current_branch"] = branch_result.stdout.strip()
    
    # Get remote URL
    remote_result = run_git_command(["remote", "get-url", "origin"], cwd=path)
    if remote_result and remote_result.returncode == 0:
        info["remote_url"] = remote_result.stdout.strip()
    
    # Get current commit hash
    commit_result = run_git_command(["rev-parse", "HEAD"], cwd=path)
    if commit_result and commit_result.returncode == 0:
        info["commit_hash"] = commit_result.stdout.strip()
    
    # Get worktree information if applicable
    if info["is_worktree"]:
        info["worktree_info"] = get_worktree_info(path)
    
    return info

def get_worktree_info(path=None):
    """
    Get detailed information about git worktrees.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    
    Returns:
        dict: Worktree information including:
            - main_worktree: str (path to main worktree)
            - all_worktrees: list (all worktrees)
            - current_worktree: dict (current worktree info)
    """
    if path is None:
        path = os.getcwd()
    
    worktree_info = {
        "main_worktree": None,
        "all_worktrees": [],
        "current_worktree": None
    }
    
    # Get worktree list
    worktree_result = run_git_command(["worktree", "list", "--porcelain"], cwd=path)
    if worktree_result is None or worktree_result.returncode != 0:
        return worktree_info
    
    current_path = Path(path).resolve()
    worktrees = []
    current_worktree = {}
    
    # Parse worktree list output
    for line in worktree_result.stdout.splitlines():
        if line.startswith("worktree "):
            if current_worktree:
                worktrees.append(current_worktree)
            current_worktree = {"path": line.split(" ", 1)[1]}
        elif line.startswith("HEAD "):
            current_worktree["commit"] = line.split(" ", 1)[1]
        elif line.startswith("branch "):
            current_worktree["branch"] = line.split(" ", 1)[1].replace("refs/heads/", "")
        elif line.startswith("bare"):
            current_worktree["bare"] = True
        elif line.startswith("detached"):
            current_worktree["detached"] = True
    
    # Add the last worktree
    if current_worktree:
        worktrees.append(current_worktree)
    
    worktree_info["all_worktrees"] = worktrees
    
    # Find main worktree and current worktree
    for wt in worktrees:
        wt_path = Path(wt["path"]).resolve()
        
        # Main worktree is typically the first one or the one without a separate .git file
        if worktree_info["main_worktree"] is None:
            worktree_info["main_worktree"] = wt["path"]
        
        # Check if this is the current worktree
        if wt_path == current_path:
            worktree_info["current_worktree"] = wt
    
    return worktree_info

def get_git_status_env_vars(path=None):
    """
    Get git repository information formatted as environment variables.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    
    Returns:
        dict: Environment variables for git status
    """
    info = get_git_repo_info(path)
    
    env_vars = {
        "CLAUDE_GIT_IS_REPO": "true" if info["is_repo"] else "false",
        "CLAUDE_GIT_IS_WORKTREE": "true" if info["is_worktree"] else "false",
        "CLAUDE_GIT_ROOT_PATH": info["root_path"] or "",
        "CLAUDE_GIT_CURRENT_BRANCH": info["current_branch"] or "",
        "CLAUDE_GIT_REMOTE_URL": info["remote_url"] or "",
        "CLAUDE_GIT_COMMIT_HASH": info["commit_hash"] or ""
    }
    
    # Add worktree-specific environment variables
    if info["is_worktree"] and info["worktree_info"]:
        wt_info = info["worktree_info"]
        env_vars.update({
            "CLAUDE_GIT_MAIN_WORKTREE": wt_info["main_worktree"] or "",
            "CLAUDE_GIT_WORKTREE_COUNT": str(len(wt_info["all_worktrees"])),
            "CLAUDE_GIT_CURRENT_WORKTREE_BRANCH": wt_info["current_worktree"].get("branch", "") if wt_info["current_worktree"] else ""
        })
    
    return env_vars

def export_git_env_vars(path=None):
    """
    Export git repository information as environment variables.
    Prints export statements that can be sourced by shell.
    
    Args:
        path (str, optional): Path to check. Defaults to current directory.
    """
    env_vars = get_git_status_env_vars(path)
    
    for key, value in env_vars.items():
        print(f'export {key}="{value}"')

if __name__ == "__main__":
    # Command line interface for testing
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        path = sys.argv[2] if len(sys.argv) > 2 else None
        
        if command == "info":
            info = get_git_repo_info(path)
            print(json.dumps(info, indent=2))
        elif command == "json":
            info = get_git_repo_info(path)
            print(json.dumps(info))
        elif command == "env":
            export_git_env_vars(path)
        elif command == "is-repo":
            print("true" if is_git_repo(path) else "false")
        elif command == "is-worktree":
            print("true" if is_git_worktree(path) else "false")
        else:
            print(f"Unknown command: {command}")
            print("Usage: git_utils.py [info|json|env|is-repo|is-worktree] [path]")
    else:
        # Default: export environment variables
        export_git_env_vars()