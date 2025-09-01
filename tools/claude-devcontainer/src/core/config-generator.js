import path from 'path';
import { getStack } from './stack-configuration.js';

/**
 * Configuration builder for creating DevContainer configurations
 * Uses fluent builder pattern for maintainability
 */
class ConfigurationBuilder {
  constructor() {
    this.config = {};
  }

  setName(name) {
    this.config.name = name;
    return this;
  }

  setImage(image) {
    this.config.image = image;
    return this;
  }

  setDockerComposeFile(file) {
    this.config.dockerComposeFile = file;
    return this;
  }

  setService(service) {
    this.config.service = service;
    return this;
  }

  setWorkspaceFolder(folder) {
    this.config.workspaceFolder = folder;
    return this;
  }

  addMounts(mounts) {
    this.config.mounts = [...(this.config.mounts || []), ...mounts];
    return this;
  }

  addFeatures(features) {
    this.config.features = { ...(this.config.features || {}), ...features };
    return this;
  }

  addPorts(ports) {
    if (ports && ports.length > 0) {
      this.config.forwardPorts = [...(this.config.forwardPorts || []), ...ports];
    }
    return this;
  }

  addVSCodeExtensions(extensions) {
    if (!extensions || extensions.length === 0) return this;

    const allExtensions = [
      'anthropic.claude-code',
      ...extensions
    ];

    this.config.customizations = {
      ...(this.config.customizations || {}),
      vscode: {
        ...(this.config.customizations?.vscode || {}),
        extensions: allExtensions
      }
    };
    return this;
  }

  addVSCodeSettings(settings) {
    this.config.customizations = {
      ...(this.config.customizations || {}),
      vscode: {
        ...(this.config.customizations?.vscode || {}),
        settings: { ...(this.config.customizations?.vscode?.settings || {}), ...settings }
      }
    };
    return this;
  }

  addPostCreateCommand(command) {
    this.config.postCreateCommand = command;
    return this;
  }

  addHostRequirements(requirements) {
    this.config.hostRequirements = requirements;
    return this;
  }

  setRemoteUser(user) {
    this.config.remoteUser = user;
    return this;
  }

  build() {
    return { ...this.config };
  }
}

/**
 * ConfigGenerator handles creating DevContainer configurations
 * for both single-container and multi-service setups
 */
export class ConfigGenerator {
  /**
   * Generate DevContainer configuration for single-container setup
   * @param {string} stackId - Stack identifier
   * @param {string[]} features - Array of feature names
   * @param {Object} options - Configuration options
   * @returns {Object} DevContainer configuration
   */
  generateDevContainerConfig(stackId, features = [], options = {}) {
    const stackConfig = getStack(stackId);
    
    const builder = new ConfigurationBuilder()
      .setName(options.name || `Claude ${stackConfig.name} Development`)
      .setImage(stackConfig.image)
      .addMounts(this.getDefaultMounts())
      .addVSCodeExtensions(stackConfig.extensions)
      .addPorts(stackConfig.ports);

    // Add MCP servers feature
    if (features.length > 0) {
      builder.addFeatures({
        'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
          servers: features.join(',')
        }
      });
    }

    // Add host SSH build feature for applicable stacks
    if (options.enableHostBuilds && stackConfig.hostBuilds) {
      builder.addFeatures({
        'ghcr.io/visheshd/claude-devcontainer/host-ssh-build:1': {
          enableMacosBuild: true
        }
      });
    }

    // Add post create command based on stack
    const postCreateCommand = this.getPostCreateCommand(stackId);
    if (postCreateCommand) {
      builder.addPostCreateCommand(postCreateCommand);
    }

    return builder.build();
  }

  /**
   * Generate DevContainer configuration for multi-service setup
   * @param {string} stackId - Stack identifier
   * @param {Object} options - Configuration options
   * @returns {Object} DevContainer configuration
   */
  generateComposeConfig(stackId, options = {}) {
    const stackConfig = getStack(stackId);
    
    if (!stackConfig.multiService) {
      throw new Error(`Stack ${stackId} is not configured for multi-service mode`);
    }

    const builder = new ConfigurationBuilder()
      .setName(options.name || `${stackConfig.name} Multi-Service Development`)
      .setDockerComposeFile('docker-compose.yml')
      .setService('app')
      .setWorkspaceFolder('/workspace')
      .addMounts(this.getDefaultMounts())
      .addVSCodeExtensions(stackConfig.extensions)
      .addVSCodeSettings(this.getDefaultVSCodeSettings())
      .addPorts(stackConfig.ports)
      .setRemoteUser('claude-user');

    // Add MCP servers feature
    if (stackConfig.features && stackConfig.features.length > 0) {
      builder.addFeatures({
        'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
          servers: stackConfig.features.join(',')
        }
      });
    }

    // Add resource requirements based on service count
    const resources = this.calculateResourceRequirements(stackConfig.services?.length || 1);
    builder.addHostRequirements(resources);

    return builder.build();
  }

  /**
   * Generate basic configuration (legacy method for backward compatibility)
   * @param {string} stackId - Stack identifier
   * @param {Object} stackConfig - Stack configuration (deprecated, will be fetched internally)
   * @returns {Object} DevContainer configuration
   */
  generateBasicConfig(stackId, stackConfig = null) {
    // For backward compatibility, accept stackConfig but prefer fetching it
    const config = stackConfig || getStack(stackId);
    
    // Use multi-service config for multi-service stacks
    if (config.multiService) {
      return this.generateComposeConfig(stackId, { 
        name: `${path.basename(process.cwd())} (${config.name})`
      });
    }
    
    // Single-container configuration
    return new ConfigurationBuilder()
      .setName(`${path.basename(process.cwd())} (${config.name})`)
      .setImage(config.image)
      .addMounts(this.getDefaultMounts())
      .addFeatures({
        'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
          servers: 'serena,context7'
        }
      })
      .addVSCodeExtensions(config.extensions)
      .addPorts(config.ports)
      .build();
  }

  /**
   * Create Claude settings configuration
   * @returns {Object} Claude settings object
   */
  createClaudeSettings() {
    return {
      includeCoAuthoredBy: false,
      permissions: {
        allow: [
          "Read(~/.zshrc)",
          "Bash(ls:*)",
          "Bash(find:*)",
          "Bash(grep:*)",
          "Bash(awk:*)",
          "Bash(sed:*)",
          "Bash(git:*)"
        ]
      },
      model: "sonnet"
    };
  }

  /**
   * Get default mount configurations
   * @returns {string[]} Array of mount configurations
   */
  getDefaultMounts() {
    return [
      'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind'
    ];
  }

  /**
   * Get default VS Code settings for multi-service setups
   * @returns {Object} VS Code settings object
   */
  getDefaultVSCodeSettings() {
    return {
      'editor.formatOnSave': true,
      'git.enableSmartCommit': true,
      'git.confirmSync': false,
      'git.autofetch': true,
      'terminal.integrated.defaultProfile.linux': 'zsh'
    };
  }

  /**
   * Get post create command for a specific stack
   * @param {string} stackId - Stack identifier
   * @returns {string|null} Post create command or null
   */
  getPostCreateCommand(stackId) {
    const commands = {
      'python-ml': 'uv sync || pip install -r requirements.txt || echo "No requirements found"',
      'nextjs': 'pnpm install || npm install || echo "No package.json found"',
      'rust-tauri': 'cargo fetch'
    };

    return commands[stackId] || null;
  }

  /**
   * Calculate resource requirements based on service count
   * @param {number} serviceCount - Number of services
   * @returns {Object} Resource requirements object
   */
  calculateResourceRequirements(serviceCount) {
    if (serviceCount <= 2) {
      return { cpus: 2, memory: '4gb' };
    } else if (serviceCount <= 4) {
      return { cpus: 4, memory: '6gb' };
    } else {
      return { cpus: 6, memory: '8gb' };
    }
  }

  /**
   * Validate generated configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if valid
   * @throws {Error} If configuration is invalid
   */
  validateConfiguration(config) {
    if (!config.name) {
      throw new Error('Configuration must have a name');
    }

    // Validate single-container setup
    if (!config.dockerComposeFile && !config.image) {
      throw new Error('Single-container configuration must have an image');
    }

    // Validate multi-service setup
    if (config.dockerComposeFile && !config.service) {
      throw new Error('Multi-service configuration must specify a service');
    }

    return true;
  }
}