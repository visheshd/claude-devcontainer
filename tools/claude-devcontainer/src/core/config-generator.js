import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getStack } from './stack-configuration.js';

// Get current file directory for template resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deep merge utility for merging configurations
 * Handles arrays, objects, and primitive values correctly
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (Array.isArray(source[key])) {
        // For arrays, concatenate unique values
        const targetArray = Array.isArray(result[key]) ? result[key] : [];
        result[key] = [...new Set([...targetArray, ...source[key]])];
      } else if (source[key] !== null && typeof source[key] === 'object') {
        // For objects, recursively merge
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        // For primitives, source overwrites target
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * ConfigGenerator handles creating DevContainer configurations
 * using template inheritance system for maintainability
 */
export class ConfigGenerator {
  constructor() {
    // Resolve template directory relative to this file
    this.templateDir = path.resolve(__dirname, '../../../../templates');
  }

  /**
   * Load base template with universal devcontainer features
   * @returns {Object} Base template configuration
   */
  loadBaseTemplate() {
    const baseTemplatePath = path.join(this.templateDir, 'base-devcontainer.json');
    
    try {
      const templateContent = fs.readFileSync(baseTemplatePath, 'utf8');
      // Remove comments from JSON before parsing
      const cleanContent = templateContent.replace(/\/\/.*$/gm, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error(`Failed to load base template: ${error.message}`);
    }
  }

  /**
   * Load stack-specific template
   * @param {string} stackId - Stack identifier
   * @returns {Object} Stack-specific template configuration
   */
  loadStackTemplate(stackId) {
    const stackTemplatePath = path.join(this.templateDir, 'stacks', `${stackId}.json`);
    
    try {
      const templateContent = fs.readFileSync(stackTemplatePath, 'utf8');
      // Remove comments from JSON before parsing
      const cleanContent = templateContent.replace(/\/\/.*$/gm, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error(`Failed to load stack template for ${stackId}: ${error.message}`);
    }
  }

  /**
   * Merge base template with stack-specific template
   * @param {Object} baseTemplate - Base template configuration
   * @param {Object} stackTemplate - Stack-specific configuration
   * @returns {Object} Merged configuration
   */
  mergeTemplates(baseTemplate, stackTemplate) {
    return deepMerge(baseTemplate, stackTemplate);
  }
  /**
   * Generate DevContainer configuration for single-container setup
   * @param {string} stackId - Stack identifier
   * @param {string[]} features - Array of feature names (legacy, now handled by templates)
   * @param {Object} options - Configuration options
   * @returns {Object} DevContainer configuration
   */
  generateDevContainerConfig(stackId, features = [], options = {}) {
    // Load base template with universal features (worktree, git, MCP, etc.)
    const baseTemplate = this.loadBaseTemplate();
    
    // Load stack-specific template
    const stackTemplate = this.loadStackTemplate(stackId);
    
    // Merge templates using deep merge
    let config = this.mergeTemplates(baseTemplate, stackTemplate);
    
    // Apply custom options if provided
    if (options.name) {
      config.name = options.name;
    }
    
    // Add host SSH build feature for applicable stacks
    if (options.enableHostBuilds) {
      config.features = {
        ...config.features,
        'ghcr.io/visheshd/claude-devcontainer/host-ssh-build:1': {
          enableMacosBuild: true
        }
      };
    }
    
    // Override MCP features if explicitly provided (for backward compatibility)
    if (features.length > 0) {
      config.features = {
        ...config.features,
        'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
          servers: features.join(',')
        }
      };
    }
    
    return config;
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

    // For multi-service, we still use the template inheritance system
    // but add compose-specific overrides
    let config = this.generateDevContainerConfig(stackId, [], options);
    
    // Override with compose-specific settings
    config.name = options.name || `${stackConfig.name} Multi-Service Development`;
    config.dockerComposeFile = 'docker-compose.yml';
    config.service = 'app';
    config.workspaceFolder = '/workspace';
    
    // Remove image since we're using compose
    delete config.image;
    
    // Add resource requirements based on service count
    const resources = this.calculateResourceRequirements(stackConfig.services?.length || 1);
    config.hostRequirements = resources;

    return config;
  }

  /**
   * Generate basic configuration (legacy method for backward compatibility)
   * @param {string} stackId - Stack identifier
   * @param {Object} stackConfig - Stack configuration (deprecated, will be fetched internally)
   * @returns {Object} DevContainer configuration
   */
  generateBasicConfig(stackId, stackConfig = null) {
    // Use the new template inheritance system for all configurations
    const config = stackConfig || getStack(stackId);
    
    // Use multi-service config for multi-service stacks
    if (config.multiService) {
      return this.generateComposeConfig(stackId, { 
        name: `${path.basename(process.cwd())} (${config.name})`
      });
    }
    
    // Use template inheritance for single-container
    return this.generateDevContainerConfig(stackId, [], {
      name: `${path.basename(process.cwd())} (${config.name})`
    });
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
   * Get template directory path
   * @returns {string} Template directory path
   */
  getTemplateDir() {
    return this.templateDir;
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