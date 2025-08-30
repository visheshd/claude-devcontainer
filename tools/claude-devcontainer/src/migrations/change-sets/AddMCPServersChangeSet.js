import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that adds recommended MCP servers for enhanced Claude Code functionality
 */
export class AddMCPServersChangeSet extends BaseChangeSet {
  constructor() {
    super();
    
    this.mcpFeatureKey = 'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1';
    this.recommendedServers = ['serena', 'context7'];
  }

  get id() {
    return 'add-mcp-servers';
  }

  get name() {
    return 'Add MCP Servers';
  }

  get description() {
    return 'Adds recommended MCP servers (serena, context7) for enhanced Claude Code functionality';
  }

  get version() {
    return '1.0.0';
  }

  canApply(config) {
    // Can always apply this change set
    return true;
  }

  needsApply(config) {
    if (!config.features) {
      return true;
    }

    const mcpFeature = config.features[this.mcpFeatureKey];
    if (!mcpFeature || !mcpFeature.servers) {
      return true;
    }

    const currentServers = mcpFeature.servers.split(',').map(s => s.trim());
    
    // Check if any of the recommended servers are missing
    return this.recommendedServers.some(server => !currentServers.includes(server));
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - recommended MCP servers already configured',
        changes: []
      };
    }

    const existingServers = this.getExistingServers(config);
    const missingServers = this.recommendedServers.filter(
      server => !existingServers.includes(server)
    );

    const finalServers = [...new Set([...existingServers, ...missingServers])];

    return {
      summary: `Will add MCP servers: ${missingServers.join(', ')}`,
      changes: [
        {
          type: existingServers.length > 0 ? 'modify' : 'add',
          path: `features.${this.mcpFeatureKey}.servers`,
          oldValue: existingServers.length > 0 ? existingServers.join(',') : 'none',
          newValue: finalServers.join(','),
          description: `Add recommended MCP servers for enhanced functionality`
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

    if (!updatedConfig.features) {
      updatedConfig.features = {};
    }

    const existingServers = this.getExistingServers(updatedConfig);
    const missingServers = this.recommendedServers.filter(
      server => !existingServers.includes(server)
    );

    const finalServers = [...new Set([...existingServers, ...missingServers])];

    updatedConfig.features[this.mcpFeatureKey] = {
      servers: finalServers.join(',')
    };

    return updatedConfig;
  }

  validate(config) {
    if (!config.features) {
      return false;
    }

    const mcpFeature = config.features[this.mcpFeatureKey];
    if (!mcpFeature || !mcpFeature.servers) {
      return false;
    }

    const currentServers = mcpFeature.servers.split(',').map(s => s.trim());
    
    // Validation passes if all recommended servers are present
    return this.recommendedServers.every(server => currentServers.includes(server));
  }

  /**
   * Get the list of currently configured MCP servers
   * @param {Object} config - DevContainer configuration
   * @returns {Array<string>} - List of current servers
   */
  getExistingServers(config) {
    if (!config.features) {
      return [];
    }

    const mcpFeature = config.features[this.mcpFeatureKey];
    if (!mcpFeature || !mcpFeature.servers) {
      return [];
    }

    return mcpFeature.servers.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
}