import { BaseChangeSet } from '../BaseChangeSet.js';
import { ConfigGenerator } from '../../core/config-generator.js';

/**
 * Change set that upgrades old manually-configured devcontainers to the new template inheritance system
 * This migration ensures all devcontainers get universal features while preserving customizations
 */
export class UpdateToTemplateInheritanceChangeSet extends BaseChangeSet {
  constructor() {
    super();
    this.configGenerator = new ConfigGenerator();
  }

  get id() {
    return 'update-to-template-inheritance';
  }

  get name() {
    return 'Update to Template Inheritance';
  }

  get description() {
    return 'Upgrades devcontainer to use template inheritance system with universal features (worktree, MCP, git wrapper) while preserving customizations';
  }

  get version() {
    return '1.0.0';
  }

  get dependencies() {
    return ['add-worktree-detection', 'add-mcp-servers'];
  }

  canApply(config) {
    // Can apply to any devcontainer that has an image or dockerComposeFile
    return config && (config.image || config.dockerComposeFile);
  }

  needsApply(config) {
    // This migration is needed if the config lacks the universal features from our base template
    const missingFeatures = this.identifyMissingUniversalFeatures(config);
    return missingFeatures.length > 0;
  }

  preview(config) {
    const missingFeatures = this.identifyMissingUniversalFeatures(config);
    
    if (missingFeatures.length === 0) {
      return {
        summary: 'No template inheritance updates needed - configuration already has universal features',
        changes: []
      };
    }

    const changes = [];
    
    // Generate what the new config would look like
    const stackId = this.detectStackType(config);
    const templateConfig = this.configGenerator.generateDevContainerConfig(stackId, [], {
      name: config.name || 'Migrated Configuration'
    });

    // Compare current config with template to identify changes
    missingFeatures.forEach(feature => {
      changes.push({
        type: 'add',
        path: feature.path,
        oldValue: feature.currentValue || 'none',
        newValue: feature.templateValue,
        description: feature.description
      });
    });

    return {
      summary: `Will upgrade to template inheritance system with ${changes.length} universal features`,
      changes,
      detectedStack: stackId
    };
  }

  async apply(config, options = {}) {
    const missingFeatures = this.identifyMissingUniversalFeatures(config);
    
    if (missingFeatures.length === 0) {
      return config;
    }

    // Detect the stack type from the current config
    const stackId = this.detectStackType(config);
    
    // Generate the template config
    const templateConfig = this.configGenerator.generateDevContainerConfig(stackId, [], {
      name: config.name || 'Migrated Configuration'
    });

    // Merge the template config with the existing config, preserving user customizations
    const updatedConfig = this.mergeWithTemplate(config, templateConfig);

    return updatedConfig;
  }

  validate(config) {
    const missingFeatures = this.identifyMissingUniversalFeatures(config);
    return missingFeatures.length === 0;
  }

  /**
   * Identify missing universal features that should be present in all devcontainers
   * @param {Object} config - Current devcontainer configuration
   * @returns {Array} - List of missing features with details
   */
  identifyMissingUniversalFeatures(config) {
    const missingFeatures = [];

    // Check for worktree detection
    if (!config.initializeCommand || config.initializeCommand !== '.devcontainer/setup-worktree-mounts.sh') {
      missingFeatures.push({
        path: 'initializeCommand',
        currentValue: config.initializeCommand,
        templateValue: '.devcontainer/setup-worktree-mounts.sh',
        description: 'Universal worktree detection command'
      });
    }

    // Check for git wrapper in postCreateCommand
    if (!config.postCreateCommand || !config.postCreateCommand.includes('configure-git-wrapper.sh')) {
      missingFeatures.push({
        path: 'postCreateCommand',
        currentValue: config.postCreateCommand,
        templateValue: '... && .devcontainer/configure-git-wrapper.sh',
        description: 'Git wrapper configuration in post-create command'
      });
    }

    // Check for Claude mount
    const hasClaudeMount = config.mounts && config.mounts.some(mount => 
      mount.includes('.claude')
    );
    if (!hasClaudeMount) {
      missingFeatures.push({
        path: 'mounts',
        currentValue: config.mounts ? 'partial' : 'none',
        templateValue: 'includes Claude mount',
        description: 'Claude Code configuration mount'
      });
    }

    // Check for MCP servers
    const hasMCPServers = config.features && 
      config.features['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1'];
    if (!hasMCPServers) {
      missingFeatures.push({
        path: 'features.ghcr.io/visheshd/claude-devcontainer/claude-mcp:1',
        currentValue: 'none',
        templateValue: '{ servers: "serena,context7" }',
        description: 'MCP servers for enhanced AI assistance'
      });
    }

    // Check for universal VS Code extensions
    const universalExtensions = [
      'anthropic.claude-code',
      'eamodio.gitlens',
      'github.vscode-pull-request-github'
    ];
    
    const currentExtensions = config.customizations?.vscode?.extensions || [];
    const missingExtensions = universalExtensions.filter(ext => 
      !currentExtensions.includes(ext)
    );
    
    if (missingExtensions.length > 0) {
      missingFeatures.push({
        path: 'customizations.vscode.extensions',
        currentValue: currentExtensions.length ? 'partial' : 'none',
        templateValue: `includes ${missingExtensions.join(', ')}`,
        description: 'Universal VS Code extensions'
      });
    }

    // Check for containerEnv section
    if (!config.containerEnv) {
      missingFeatures.push({
        path: 'containerEnv',
        currentValue: 'none',
        templateValue: '{}',
        description: 'Container environment variables section'
      });
    }

    return missingFeatures;
  }

  /**
   * Detect the stack type from the current configuration
   * @param {Object} config - Current devcontainer configuration  
   * @returns {string} - Detected stack ID
   */
  detectStackType(config) {
    // Detect by image name
    if (config.image) {
      if (config.image.includes('python-ml')) return 'python-ml';
      if (config.image.includes('rust-tauri')) return 'rust-tauri';
      if (config.image.includes('nextjs')) return 'nextjs';
      if (config.image.includes('claude-base')) return 'custom';
    }

    // Detect by extensions
    const extensions = config.customizations?.vscode?.extensions || [];
    if (extensions.includes('ms-python.python') && extensions.includes('ms-toolsai.jupyter')) {
      return 'python-ml';
    }
    if (extensions.includes('rust-lang.rust-analyzer')) {
      return 'rust-tauri';
    }
    if (extensions.includes('ms-vscode.vscode-typescript-next')) {
      return 'nextjs';
    }

    // Detect by ports
    const ports = config.forwardPorts || [];
    if (ports.includes(8888)) return 'python-ml';
    if (ports.includes(1420)) return 'rust-tauri';
    if (ports.includes(3000)) return 'nextjs';

    // Default to custom
    return 'custom';
  }

  /**
   * Merge the existing config with the template config, preserving user customizations
   * @param {Object} existingConfig - User's current configuration
   * @param {Object} templateConfig - Generated template configuration
   * @returns {Object} - Merged configuration
   */
  mergeWithTemplate(existingConfig, templateConfig) {
    // Start with the template as the base
    const mergedConfig = JSON.parse(JSON.stringify(templateConfig));

    // Preserve user customizations that don't conflict with universal features
    
    // Preserve custom name if it exists
    if (existingConfig.name && existingConfig.name !== templateConfig.name) {
      mergedConfig.name = existingConfig.name;
    }

    // Preserve custom workspace folder
    if (existingConfig.workspaceFolder && existingConfig.workspaceFolder !== templateConfig.workspaceFolder) {
      mergedConfig.workspaceFolder = existingConfig.workspaceFolder;
    }

    // Merge custom mounts (while keeping universal ones)
    if (existingConfig.mounts) {
      const customMounts = existingConfig.mounts.filter(mount => 
        !mount.includes('.claude') // Don't duplicate Claude mount
      );
      mergedConfig.mounts = [...mergedConfig.mounts, ...customMounts];
    }

    // Merge custom environment variables
    if (existingConfig.containerEnv) {
      mergedConfig.containerEnv = {
        ...mergedConfig.containerEnv,
        ...existingConfig.containerEnv
      };
    }

    // Merge custom VS Code settings (user settings override template)
    if (existingConfig.customizations?.vscode?.settings) {
      mergedConfig.customizations.vscode.settings = {
        ...mergedConfig.customizations.vscode.settings,
        ...existingConfig.customizations.vscode.settings
      };
    }

    // Merge features while preserving custom ones
    if (existingConfig.features) {
      mergedConfig.features = {
        ...mergedConfig.features,
        ...existingConfig.features
      };
    }

    // Preserve custom port attributes
    if (existingConfig.portsAttributes) {
      mergedConfig.portsAttributes = {
        ...mergedConfig.portsAttributes,
        ...existingConfig.portsAttributes
      };
    }

    // Preserve host requirements if they're higher than template
    if (existingConfig.hostRequirements) {
      const templateReq = mergedConfig.hostRequirements || {};
      const existingReq = existingConfig.hostRequirements;
      
      mergedConfig.hostRequirements = {
        cpus: Math.max(templateReq.cpus || 2, existingReq.cpus || 2),
        memory: this.compareMemory(templateReq.memory, existingReq.memory)
      };
    }

    return mergedConfig;
  }

  /**
   * Compare memory requirements and return the higher one
   * @param {string} templateMemory - Template memory requirement
   * @param {string} existingMemory - Existing memory requirement
   * @returns {string} - Higher memory requirement
   */
  compareMemory(templateMemory = '4gb', existingMemory = '4gb') {
    const parseMemory = (mem) => {
      const num = parseFloat(mem);
      const unit = mem.toLowerCase().includes('gb') ? 1024 : 1;
      return num * unit;
    };

    const templateMB = parseMemory(templateMemory);
    const existingMB = parseMemory(existingMemory);

    return existingMB > templateMB ? existingMemory : templateMemory;
  }
}