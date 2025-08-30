# Claude Devcontainer Template for Git Worktrees

This template provides automated devcontainer configuration for git worktrees with the Claude development environment.

## Features

- **Automatic Worktree Detection**: Detects git worktrees and configures container mounts automatically
- **Main Repository Access**: Mounts your main repository inside the container for full git functionality
- **Git Wrapper Integration**: Seamlessly handles git operations between host and container paths
- **VS Code Integration**: Pre-configured extensions and settings for optimal development experience
- **Port Forwarding**: Common development ports pre-configured and labeled

## Quick Setup

1. **Run the setup script in your worktree**:
   ```bash
   cd /path/to/your-worktree
   /path/to/claude-devcontainer/scripts/setup-worktree.sh
   ```
   
   This will automatically copy all necessary files to your worktree's `.devcontainer/` directory.

2. **Open in VS Code/Cursor**:
   - Open your worktree directory in VS Code/Cursor
   - Click "Reopen in Container" when prompted
   - The setup will automatically detect your worktree and configure everything

**That's it!** Everything is now self-contained in your worktree.

## How It Works

### Automatic Configuration

1. **Host-side Setup** (`initializeCommand`):
   - Runs `setup-worktree-mounts.sh` on your host machine
   - Analyzes your `.git` file to detect the main repository location
   - Automatically updates `devcontainer.json` with the correct mount configuration
   - Sets environment variables for the git wrapper

2. **Container-side Setup** (`postCreateCommand`):
   - Runs `configure-git-wrapper.sh` inside the container
   - Configures git settings and safe directories
   - Validates the worktree setup
   - Tests git wrapper functionality

3. **Git Wrapper Operation**:
   - Intercepts git commands inside the container
   - Temporarily transforms `.git` file paths from host to container paths
   - Executes git commands with correct path references
   - Restores original paths after operation

### Directory Structure

```
Your Worktree/
├── .devcontainer/
│   ├── devcontainer.json          # Main configuration (auto-updated)
│   └── README.md                  # This file
├── .git                          # Points to main repo's worktree
└── [your project files]

Inside Container:
├── /workspaces/your-worktree/     # Your worktree (mounted from host)
├── /main-repo/                   # Main repository (mounted from host)
│   └── .git/
│       └── worktrees/
│           └── your-worktree/    # Worktree metadata
└── /home/claude-user/scripts/    # Git wrapper scripts
```

## Environment Variables

The following environment variables are automatically set:

- `WORKTREE_DETECTED`: Set to "true" when in a worktree
- `WORKTREE_HOST_MAIN_REPO`: Host path to main repository
- `WORKTREE_CONTAINER_MAIN_REPO`: Container path to main repository (`/main-repo`)
- `WORKTREE_NAME`: Name of the current worktree

## Troubleshooting

### Debug Mode

Enable debug output by setting environment variables:

```json
"containerEnv": {
  "GIT_WRAPPER_DEBUG": "true",
  "WORKTREE_SETUP_DEBUG": "true"
}
```

### Common Issues

1. **Main repository not found**:
   - Ensure your `.git` file contains the correct `gitdir:` path
   - Check that the main repository exists on the host

2. **Git operations fail**:
   - Run `git status` with debug mode to see path transformations
   - Verify `/main-repo` is mounted and contains `.git/worktrees/`

3. **Container won't start**:
   - Check the `initializeCommand` path in `devcontainer.json`
   - Ensure `setup-worktree-mounts.sh` is executable

### Manual Configuration

If automatic setup fails, you can manually configure:

```json
{
  "mounts": [
    "source=/Users/you/Work/main-repo,target=/main-repo,type=bind,consistency=cached"
  ],
  "containerEnv": {
    "WORKTREE_DETECTED": "true",
    "WORKTREE_HOST_MAIN_REPO": "/Users/you/Work/main-repo",
    "WORKTREE_CONTAINER_MAIN_REPO": "/main-repo",
    "WORKTREE_NAME": "your-worktree-name"
  }
}
```

## Customization

### Adding Extensions

Add VS Code extensions to the `extensions` array:

```json
"customizations": {
  "vscode": {
    "extensions": [
      "your.extension-id"
    ]
  }
}
```

### Port Configuration

Add or modify forwarded ports:

```json
"forwardPorts": [3000, 8080, 9000],
"portsAttributes": {
  "9000": {
    "label": "Custom Server",
    "onAutoForward": "notify"
  }
}
```

### Resource Limits

Adjust container resources:

```json
"hostRequirements": {
  "cpus": 4,
  "memory": "8gb"
}
```

## Integration with Claude Code

This devcontainer is designed to work seamlessly with Claude Code's development workflow:

- Pre-configured with development tools and extensions
- Optimized for Next.js, React, and TypeScript projects
- Git wrapper ensures Claude can run git commands correctly
- Port forwarding for development servers and debugging

## Support

For issues and questions:

1. Check the debug output with `GIT_WRAPPER_DEBUG=true`
2. Verify your git worktree setup with `git worktree list`
3. Ensure the claude-docker scripts are accessible and executable