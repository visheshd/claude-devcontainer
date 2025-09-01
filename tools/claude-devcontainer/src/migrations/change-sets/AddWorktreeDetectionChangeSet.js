import { BaseChangeSet } from '../BaseChangeSet.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Change set that adds worktree detection and git wrapper support to devcontainers
 * This upgrades old "dumb" devcontainers to support automatic worktree detection
 */
export class AddWorktreeDetectionChangeSet extends BaseChangeSet {
  constructor() {
    super();
    
    this.scriptsDir = path.resolve(__dirname, '../../../../../scripts');
    this.requiredScripts = ['setup-worktree-mounts.sh', 'configure-git-wrapper.sh'];
  }

  get id() {
    return 'add-worktree-detection';
  }

  get name() {
    return 'Add Worktree Detection';
  }

  get description() {
    return 'Adds universal worktree detection, git wrapper, and required scripts to support both main repos and git worktrees';
  }

  get version() {
    return '1.0.0';
  }

  get dependencies() {
    return []; // No dependencies - can run independently
  }

  canApply(config) {
    // Can apply to any devcontainer configuration
    return config && typeof config === 'object';
  }

  needsApply(config) {
    // Check if worktree detection is missing
    const hasInitCommand = config.initializeCommand === '.devcontainer/setup-worktree-mounts.sh';
    const hasPostCommand = config.postCreateCommand && config.postCreateCommand.includes('configure-git-wrapper.sh');
    const hasWorktreeEnvSection = config.containerEnv && Object.keys(config.containerEnv).length === 0;
    
    // Need to apply if any of the worktree features are missing
    return !hasInitCommand || !hasPostCommand || !hasWorktreeEnvSection;
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - worktree detection already configured',
        changes: []
      };
    }

    const changes = [];
    
    if (!config.initializeCommand || config.initializeCommand !== '.devcontainer/setup-worktree-mounts.sh') {
      changes.push({
        type: config.initializeCommand ? 'modify' : 'add',
        path: 'initializeCommand',
        oldValue: config.initializeCommand || 'none',
        newValue: '.devcontainer/setup-worktree-mounts.sh',
        description: 'Add worktree detection script to run before container starts'
      });
    }

    if (!config.postCreateCommand || !config.postCreateCommand.includes('configure-git-wrapper.sh')) {
      const newPostCommand = this.buildPostCreateCommand(config.postCreateCommand);
      changes.push({
        type: config.postCreateCommand ? 'modify' : 'add',
        path: 'postCreateCommand',
        oldValue: config.postCreateCommand || 'none',
        newValue: newPostCommand,
        description: 'Add git wrapper configuration to post-create command'
      });
    }

    if (!config.containerEnv || typeof config.containerEnv !== 'object') {
      changes.push({
        type: 'add',
        path: 'containerEnv',
        oldValue: 'none',
        newValue: '{}',
        description: 'Add containerEnv section for worktree environment variables (populated dynamically)'
      });
    }

    changes.push({
      type: 'add',
      path: '.devcontainer/setup-worktree-mounts.sh',
      oldValue: 'missing',
      newValue: 'copied',
      description: 'Copy worktree setup script to .devcontainer directory'
    });

    changes.push({
      type: 'add',
      path: '.devcontainer/configure-git-wrapper.sh',
      oldValue: 'missing',
      newValue: 'copied',
      description: 'Copy git wrapper configuration script to .devcontainer directory'
    });

    return {
      summary: `Will add worktree detection with ${changes.length} changes`,
      changes
    };
  }

  async apply(config, options = {}) {
    if (!this.needsApply(config)) {
      return config;
    }

    // Create a deep copy of the config
    const updatedConfig = JSON.parse(JSON.stringify(config));

    // Add initializeCommand for worktree detection
    updatedConfig.initializeCommand = '.devcontainer/setup-worktree-mounts.sh';

    // Update postCreateCommand to include git wrapper setup
    updatedConfig.postCreateCommand = this.buildPostCreateCommand(config.postCreateCommand);

    // Add containerEnv section for worktree environment variables
    if (!updatedConfig.containerEnv) {
      updatedConfig.containerEnv = {};
    }

    // Copy required scripts to .devcontainer directory (if not in dry-run mode)
    if (!options.preview && !options.dryRun) {
      await this.copyWorktreeScripts();
    }

    return updatedConfig;
  }

  validate(config) {
    const hasInitCommand = config.initializeCommand === '.devcontainer/setup-worktree-mounts.sh';
    const hasPostCommand = config.postCreateCommand && config.postCreateCommand.includes('configure-git-wrapper.sh');
    const hasContainerEnv = config.containerEnv && typeof config.containerEnv === 'object';
    
    return hasInitCommand && hasPostCommand && hasContainerEnv;
  }

  /**
   * Build the post-create command that includes git wrapper setup
   * @param {string|Object} existingCommand - Existing post-create command
   * @returns {string} - Updated post-create command
   */
  buildPostCreateCommand(existingCommand) {
    const gitWrapperCommand = '.devcontainer/configure-git-wrapper.sh';
    
    if (!existingCommand) {
      return gitWrapperCommand;
    }
    
    // If existing command is a string and doesn't already include git wrapper
    if (typeof existingCommand === 'string') {
      if (existingCommand.includes('configure-git-wrapper.sh')) {
        return existingCommand;
      }
      return `${existingCommand} && ${gitWrapperCommand}`;
    }
    
    // If existing command is an object (multiple commands), add git wrapper
    if (typeof existingCommand === 'object') {
      // For now, convert to string format and add git wrapper
      // This is a simplified approach - in reality we might want to preserve the object structure
      const commandString = Object.values(existingCommand).join(' && ');
      return `${commandString} && ${gitWrapperCommand}`;
    }
    
    return gitWrapperCommand;
  }

  /**
   * Copy worktree setup scripts to .devcontainer directory
   */
  async copyWorktreeScripts() {
    // Ensure .devcontainer directory exists
    await fs.ensureDir('.devcontainer');

    for (const scriptName of this.requiredScripts) {
      const sourcePath = path.join(this.scriptsDir, scriptName);
      const targetPath = path.join('.devcontainer', scriptName);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
        // Make script executable
        await fs.chmod(targetPath, 0o755);
      } else {
        console.warn(`Warning: Required worktree script not found: ${sourcePath}`);
      }
    }
  }
}