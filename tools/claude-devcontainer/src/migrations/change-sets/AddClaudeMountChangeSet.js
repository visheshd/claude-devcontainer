import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that adds the .claude directory mount for user customizations
 * Uses persistent auth directory for better authentication persistence across container restarts
 */
export class AddClaudeMountChangeSet extends BaseChangeSet {
  get id() {
    return 'add-claude-mount';
  }

  get name() {
    return 'Add .claude Directory Mount';
  }

  get description() {
    return 'Adds mount for persistent Claude authentication and customizations';
  }

  get version() {
    return '1.1.0';
  }

  canApply(config) {
    // Can always apply this change set as it's a basic requirement
    return true;
  }

  needsApply(config) {
    if (!config.mounts) {
      return true;
    }

    // Check if .claude mount already exists
    const hasClaudeMount = config.mounts.some(mount => 
      mount.includes('.claude') && mount.includes('/home/claude-user/.claude')
    );

    return !hasClaudeMount;
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - .claude mount already exists',
        changes: []
      };
    }

    const claudeMount = "source=${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind";
    
    return {
      summary: 'Will add persistent Claude authentication mount',
      changes: [
        {
          type: 'add',
          path: 'mounts',
          value: claudeMount,
          description: 'Add mount for persistent Claude authentication and customizations'
        }
      ]
    };
  }

  async apply(config, options = {}) {
    if (!this.needsApply(config)) {
      return config;
    }

    // Create a deep copy of the config
    const updatedConfig = JSON.parse(JSON.stringify(config));

    const claudeMount = "source=${localEnv:HOME}/.claude-docker/auth,target=/home/claude-user/.claude,type=bind";

    if (!updatedConfig.mounts) {
      updatedConfig.mounts = [];
    }

    // Get existing custom mounts (non-.claude mounts)
    const customMounts = updatedConfig.mounts.filter(mount => 
      !mount.includes('.claude')
    );

    // Add .claude mount first, then preserve custom mounts
    updatedConfig.mounts = [claudeMount, ...customMounts];

    return updatedConfig;
  }

  validate(config) {
    if (!config.mounts) {
      return false;
    }

    return config.mounts.some(mount => 
      mount.includes('.claude') && mount.includes('/home/claude-user/.claude')
    );
  }
}