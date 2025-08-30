import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that fixes hardcoded paths in worktree configurations to make them dynamic and portable
 */
export class FixWorktreePathsChangeSet extends BaseChangeSet {
  constructor() {
    super();
    
    this.worktreeIndicators = [
      'WORKTREE_DETECTED',
      'WORKTREE_HOST_MAIN_REPO', 
      'WORKTREE_CONTAINER_MAIN_REPO',
      'WORKTREE_NAME'
    ];
  }

  get id() {
    return 'fix-worktree-paths';
  }

  get name() {
    return 'Fix Worktree Paths';
  }

  get description() {
    return 'Makes hardcoded paths in worktree configurations dynamic for portability';
  }

  get version() {
    return '1.0.0';
  }

  canApply(config) {
    // Only applies to configurations that appear to be worktree-related
    return this.isWorktreeConfig(config);
  }

  needsApply(config) {
    if (!this.isWorktreeConfig(config)) {
      return false;
    }

    const hardcodedPaths = this.detectHardcodedPaths(config);
    return hardcodedPaths.length > 0;
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - no hardcoded paths detected',
        changes: []
      };
    }

    const hardcodedPaths = this.detectHardcodedPaths(config);
    const changes = [];

    // Preview workspace folder changes
    if (config.workspaceFolder && config.workspaceFolder.includes('/workspaces/')) {
      changes.push({
        type: 'modify',
        path: 'workspaceFolder',
        oldValue: config.workspaceFolder,
        newValue: '/workspaces/${localWorkspaceFolderBasename}',
        description: 'Make workspace folder dynamic'
      });
    }

    // Preview environment variable changes
    if (config.containerEnv) {
      if (config.containerEnv.WORKTREE_NAME) {
        changes.push({
          type: 'modify',
          path: 'containerEnv.WORKTREE_NAME',
          oldValue: config.containerEnv.WORKTREE_NAME,
          newValue: '${localWorkspaceFolderBasename}',
          description: 'Make worktree name dynamic'
        });
      }

      if (config.containerEnv.WORKTREE_HOST_MAIN_REPO) {
        changes.push({
          type: 'modify',
          path: 'containerEnv.WORKTREE_HOST_MAIN_REPO',
          oldValue: config.containerEnv.WORKTREE_HOST_MAIN_REPO,
          newValue: '${localWorkspaceFolder}/..',
          description: 'Make host main repo path dynamic'
        });
      }
    }

    // Preview mount changes
    if (config.mounts) {
      config.mounts.forEach((mount, index) => {
        if (mount.includes('target=/main-repo') && mount.includes('source=')) {
          changes.push({
            type: 'modify',
            path: `mounts[${index}]`,
            oldValue: mount,
            newValue: 'source=${localWorkspaceFolder}/..,target=/main-repo,type=bind,consistency=cached',
            description: 'Make main repo mount dynamic'
          });
        }
      });
    }

    return {
      summary: `Will fix ${hardcodedPaths.length} hardcoded path(s) to make configuration portable`,
      changes
    };
  }

  async apply(config, options = {}) {
    if (!this.needsApply(config)) {
      return config;
    }

    // Create a deep copy of the config
    const updatedConfig = JSON.parse(JSON.stringify(config));

    // Make workspace folder dynamic
    if (updatedConfig.workspaceFolder && updatedConfig.workspaceFolder.includes('/workspaces/')) {
      updatedConfig.workspaceFolder = '/workspaces/${localWorkspaceFolderBasename}';
    }

    // Make environment variables dynamic
    if (updatedConfig.containerEnv) {
      // Make WORKTREE_NAME dynamic
      if (updatedConfig.containerEnv.WORKTREE_NAME) {
        updatedConfig.containerEnv.WORKTREE_NAME = '${localWorkspaceFolderBasename}';
      }

      // Make main repo paths relative and dynamic
      if (updatedConfig.containerEnv.WORKTREE_HOST_MAIN_REPO) {
        updatedConfig.containerEnv.WORKTREE_HOST_MAIN_REPO = '${localWorkspaceFolder}/..';
      }

      // Keep container main repo consistent
      if (updatedConfig.containerEnv.WORKTREE_CONTAINER_MAIN_REPO) {
        updatedConfig.containerEnv.WORKTREE_CONTAINER_MAIN_REPO = '/main-repo';
      }
    }

    // Make mounts dynamic
    if (updatedConfig.mounts) {
      updatedConfig.mounts = updatedConfig.mounts.map(mount => {
        // Handle main repo mount
        if (mount.includes('target=/main-repo') && mount.includes('source=')) {
          return 'source=${localWorkspaceFolder}/..,target=/main-repo,type=bind,consistency=cached';
        }
        
        // Keep other mounts as-is (like .claude mount)
        return mount;
      });
    }

    return updatedConfig;
  }

  validate(config) {
    // Validation passes if no hardcoded paths are detected
    const hardcodedPaths = this.detectHardcodedPaths(config);
    return hardcodedPaths.length === 0;
  }

  /**
   * Check if this configuration appears to be worktree-related
   * @param {Object} config - DevContainer configuration
   * @returns {boolean}
   */
  isWorktreeConfig(config) {
    if (!config.containerEnv) {
      return false;
    }

    return this.worktreeIndicators.some(indicator => 
      config.containerEnv[indicator] !== undefined
    );
  }

  /**
   * Detect hardcoded paths in the configuration
   * @param {Object} config - DevContainer configuration
   * @returns {Array<string>} - List of hardcoded paths
   */
  detectHardcodedPaths(config) {
    const hardcodedPaths = [];

    // Check environment variables for hardcoded paths
    if (config.containerEnv) {
      Object.entries(config.containerEnv).forEach(([key, value]) => {
        if (typeof value === 'string' && (
            value.includes('/Users/') || 
            value.includes('/home/') ||
            value.match(/^\/[a-zA-Z]/) // Absolute paths
          )) {
          hardcodedPaths.push(`containerEnv.${key}: ${value}`);
        }
      });
    }

    // Check for hardcoded paths in mounts
    if (config.mounts) {
      config.mounts.forEach((mount, index) => {
        if (mount.includes('/Users/') || mount.includes('/home/')) {
          hardcodedPaths.push(`mounts[${index}]: ${mount}`);
        }
      });
    }

    // Check for hardcoded workspace folder
    if (config.workspaceFolder && 
        (config.workspaceFolder.includes('/Users/') || 
         config.workspaceFolder.includes('/home/'))) {
      hardcodedPaths.push(`workspaceFolder: ${config.workspaceFolder}`);
    }

    return hardcodedPaths;
  }
}