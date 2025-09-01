import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { getStack } from './stack-configuration.js';
import { TemplateManager } from './template-manager.js';

/**
 * FileWriter handles creating and managing DevContainer files
 * for both single-container and multi-service setups
 */
export class FileWriter {
  constructor() {
    this.templateManager = new TemplateManager();
  }

  /**
   * Write DevContainer files for single-container setup
   * @param {Object} config - DevContainer configuration
   * @param {Object} options - Write options
   */
  async writeDevContainerFiles(config, options = {}) {
    const spinner = ora('Creating DevContainer configuration...').start();

    try {
      // Create .devcontainer directory
      await fs.ensureDir('.devcontainer');

      // Write devcontainer.json
      await fs.writeJson('.devcontainer/devcontainer.json', config, { spaces: 2 });
      spinner.text = 'Created devcontainer.json';

      // Create Claude settings if requested
      if (options.includeSettings) {
        await this.writeClaudeSettings();
        spinner.text = 'Created Claude configuration';
      }

      // Create .env.example if it doesn't exist
      if (!fs.existsSync('.env.example')) {
        await this.writeDefaultEnvExample();
        spinner.text = 'Created .env.example';
      }

      spinner.succeed('DevContainer configuration created successfully!');
    } catch (error) {
      spinner.fail('Failed to create configuration');
      throw error;
    }
  }

  /**
   * Write files for multi-service Docker Compose setup
   * @param {string} stackId - Stack identifier
   * @param {Object} config - DevContainer configuration
   */
  async writeComposeFiles(stackId, config) {
    const stackConfig = getStack(stackId);
    const spinner = ora('Creating multi-service DevContainer configuration...').start();

    try {
      // Validate template exists
      await this.templateManager.validateTemplate(stackConfig.template);

      // Create .devcontainer directory
      await fs.ensureDir('.devcontainer');
      spinner.text = 'Created directories';

      // Copy template files to project root
      await this.templateManager.copyTemplateFiles(stackConfig.template);
      spinner.text = 'Copied template files';

      // Copy docker directory if it exists
      await this.templateManager.copyDockerDirectory(stackConfig.template);
      spinner.text = 'Copied docker configuration';

      // Write devcontainer.json
      await fs.writeJson('.devcontainer/devcontainer.json', config, { spaces: 2 });
      spinner.text = 'Created devcontainer.json';

      // Copy template README for reference
      await this.templateManager.copyTemplateReadme(stackConfig.template);
      spinner.text = 'Added documentation';

      spinner.succeed('Multi-service DevContainer setup complete!');
    } catch (error) {
      spinner.fail('Failed to create multi-service configuration');
      throw error;
    }
  }

  /**
   * Write files for legacy setup (backward compatibility)
   * @param {Object} config - DevContainer configuration
   * @param {Object} options - Write options
   */
  async writeFiles(config, options = {}) {
    return this.writeDevContainerFiles(config, options);
  }

  /**
   * Create Claude settings directory and files
   */
  async writeClaudeSettings() {
    await fs.ensureDir('.claude');
    
    const settings = this.createClaudeSettings();
    await fs.writeJson('.claude/settings.json', settings, { spaces: 2 });
    
    // Copy CLAUDE.md template if it doesn't exist and a parent one exists
    if (!fs.existsSync('.claude/CLAUDE.md') && fs.existsSync('../.claude/CLAUDE.md')) {
      await fs.copy('../.claude/CLAUDE.md', '.claude/CLAUDE.md');
    }
  }

  /**
   * Create default .env.example file
   */
  async writeDefaultEnvExample() {
    const envExample = [
      '# Environment Variables for Claude DevContainer',
      '# Copy to .env and fill in your values',
      '',
      '# Twilio SMS (optional)',
      '# TWILIO_ACCOUNT_SID=your_account_sid',
      '# TWILIO_AUTH_TOKEN=your_auth_token', 
      '# TWILIO_FROM_NUMBER=your_from_number',
      '',
      '# Add other environment variables as needed',
      ''
    ].join('\n');
    
    await fs.writeFile('.env.example', envExample);
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
   * Get access to the template manager
   * @returns {TemplateManager} The template manager instance
   */
  getTemplateManager() {
    return this.templateManager;
  }
}