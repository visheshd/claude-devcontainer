import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that ensures essential VS Code extensions are installed
 */
export class AddVSCodeExtensionsChangeSet extends BaseChangeSet {
  constructor() {
    super();
    
    this.requiredExtensions = ['anthropic.claude-code'];
  }

  get id() {
    return 'add-vscode-extensions';
  }

  get name() {
    return 'Add VS Code Extensions';
  }

  get description() {
    return 'Ensures essential VS Code extensions (Claude Code) are configured';
  }

  get version() {
    return '1.0.0';
  }

  canApply(config) {
    // Can always apply this change set
    return true;
  }

  needsApply(config) {
    const currentExtensions = this.getCurrentExtensions(config);
    
    return this.requiredExtensions.some(ext => !currentExtensions.includes(ext));
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - required extensions already configured',
        changes: []
      };
    }

    const currentExtensions = this.getCurrentExtensions(config);
    const missingExtensions = this.requiredExtensions.filter(
      ext => !currentExtensions.includes(ext)
    );

    const finalExtensions = [...new Set([...missingExtensions, ...currentExtensions])];

    return {
      summary: `Will add VS Code extensions: ${missingExtensions.join(', ')}`,
      changes: [
        {
          type: currentExtensions.length > 0 ? 'modify' : 'add',
          path: 'customizations.vscode.extensions',
          oldValue: currentExtensions.length > 0 ? currentExtensions : 'none',
          newValue: finalExtensions,
          description: 'Add required VS Code extensions'
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

    // Ensure the customizations structure exists
    if (!updatedConfig.customizations) {
      updatedConfig.customizations = {};
    }
    if (!updatedConfig.customizations.vscode) {
      updatedConfig.customizations.vscode = {};
    }
    if (!updatedConfig.customizations.vscode.extensions) {
      updatedConfig.customizations.vscode.extensions = [];
    }

    const currentExtensions = updatedConfig.customizations.vscode.extensions;
    const missingExtensions = this.requiredExtensions.filter(
      ext => !currentExtensions.includes(ext)
    );

    // Add missing extensions at the beginning
    for (const ext of missingExtensions.reverse()) {
      currentExtensions.unshift(ext);
    }

    // Remove duplicates while preserving order
    updatedConfig.customizations.vscode.extensions = [...new Set(currentExtensions)];

    return updatedConfig;
  }

  validate(config) {
    const currentExtensions = this.getCurrentExtensions(config);
    
    // Validation passes if all required extensions are present
    return this.requiredExtensions.every(ext => currentExtensions.includes(ext));
  }

  /**
   * Get the list of currently configured VS Code extensions
   * @param {Object} config - DevContainer configuration
   * @returns {Array<string>} - List of current extensions
   */
  getCurrentExtensions(config) {
    if (!config.customizations?.vscode?.extensions) {
      return [];
    }

    return Array.isArray(config.customizations.vscode.extensions) 
      ? config.customizations.vscode.extensions 
      : [];
  }
}