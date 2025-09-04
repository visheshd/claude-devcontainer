import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that updates .claude mount from old path to persistent auth directory
 * Migrates from ~/.claude to ~/.claude-docker/auth for better authentication persistence
 */
export class UpdateClaudeAuthMountChangeSet extends BaseChangeSet {
  get id() {
    return 'update-claude-auth-mount';
  }

  get name() {
    return 'Update Claude Auth Mount Path';
  }

  get description() {
    return 'Updates Claude mount from ~/.claude to ~/.claude-docker/auth for persistent authentication';
  }

  get version() {
    return '2.0.0';
  }

  get dependencies() {
    // Ensure basic claude mount exists first
    return ['add-claude-mount'];
  }

  canApply(config) {
    // Can apply if there are mounts to check
    return config && config.mounts;
  }

  needsApply(config) {
    if (!config.mounts) {
      return false; // No mounts to update
    }

    // Check if using old mount path (contains .claude but NOT .claude-docker/auth)
    const hasOldClaudeMount = config.mounts.some(mount => {
      return mount.includes('/.claude,target=') && 
             !mount.includes('/.claude-docker/auth,target=');
    });

    // Check if already using new path
    const hasNewClaudeMount = config.mounts.some(mount => {
      return mount.includes('/.claude-docker/auth,target=');
    });

    // Need to apply if we have old mount but not new mount
    return hasOldClaudeMount && !hasNewClaudeMount;
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - Claude auth mount already using persistent path',
        changes: []
      };
    }

    const changes = [];
    const updatedMounts = [];

    config.mounts.forEach((mount, index) => {
      if (mount.includes('/.claude,target=') && !mount.includes('/.claude-docker/auth,target=')) {
        const newMount = mount.replace(
          'source=${localEnv:HOME}/.claude,target=',
          'source=${localEnv:HOME}/.claude-docker/auth,target='
        );
        
        changes.push({
          type: 'update',
          path: `mounts[${index}]`,
          oldValue: mount,
          newValue: newMount,
          description: 'Update Claude mount to use persistent auth directory'
        });
        
        updatedMounts.push(newMount);
      } else {
        updatedMounts.push(mount);
      }
    });

    return {
      summary: `Will update ${changes.length} Claude mount(s) to use persistent authentication path`,
      changes
    };
  }

  async apply(config, options = {}) {
    if (!this.needsApply(config)) {
      return config;
    }

    // Create a deep copy of the config
    const updatedConfig = JSON.parse(JSON.stringify(config));

    // Update mounts array
    updatedConfig.mounts = updatedConfig.mounts.map(mount => {
      // Replace old claude mount with new persistent auth mount
      if (mount.includes('/.claude,target=') && !mount.includes('/.claude-docker/auth,target=')) {
        return mount.replace(
          'source=${localEnv:HOME}/.claude,target=',
          'source=${localEnv:HOME}/.claude-docker/auth,target='
        );
      }
      return mount;
    });

    return updatedConfig;
  }

  validate(config) {
    if (!config.mounts) {
      return false;
    }

    // Validation passes if we have the new persistent auth mount
    const hasNewAuthMount = config.mounts.some(mount => 
      mount.includes('/.claude-docker/auth,target=/home/claude-user/.claude')
    );

    // Also check that we don't have old mounts lingering
    const hasOldAuthMount = config.mounts.some(mount => 
      mount.includes('/.claude,target=') && !mount.includes('/.claude-docker/auth,target=')
    );

    return hasNewAuthMount && !hasOldAuthMount;
  }
}