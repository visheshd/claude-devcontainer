import fs from 'fs-extra';
import path from 'path';
import { getStack } from './stack-configuration.js';

/**
 * TemplateManager handles validation and management of DevContainer templates
 * for multi-service setups
 */
export class TemplateManager {
  constructor() {
    this.templateBasePath = path.join(process.cwd(), 'templates', 'compose');
  }

  /**
   * Validate that a template exists and has required files
   * @param {string} templateName - Name of the template
   * @throws {Error} If template is invalid or missing
   */
  async validateTemplate(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    // Check for required files
    const requiredFiles = ['docker-compose.yml', 'devcontainer.json'];
    const missingFiles = [];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(templatePath, file))) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Template ${templateName} is missing required files: ${missingFiles.join(', ')}`);
    }
  }

  /**
   * List available templates
   * @returns {string[]} Array of available template names
   */
  async getAvailableTemplates() {
    try {
      if (!fs.existsSync(this.templateBasePath)) {
        return [];
      }

      const entries = await fs.readdir(this.templateBasePath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      console.warn(`Warning: Could not list templates: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a template exists
   * @param {string} templateName - Name of the template
   * @returns {boolean} True if template exists
   */
  templateExists(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    return fs.existsSync(templatePath);
  }

  /**
   * Get template information
   * @param {string} templateName - Name of the template
   * @returns {Object} Template information
   * @throws {Error} If template is not found
   */
  async getTemplateInfo(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found`);
    }

    const info = {
      name: templateName,
      path: templatePath,
      hasDockerCompose: fs.existsSync(path.join(templatePath, 'docker-compose.yml')),
      hasDevContainer: fs.existsSync(path.join(templatePath, 'devcontainer.json')),
      hasEnvExample: fs.existsSync(path.join(templatePath, '.env.example')),
      hasReadme: fs.existsSync(path.join(templatePath, 'README.md')),
      hasDockerDir: fs.existsSync(path.join(templatePath, 'docker'))
    };

    return info;
  }

  /**
   * Copy template files to project root
   * @param {string} templateName - Name of the template
   */
  async copyTemplateFiles(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    const templateFiles = ['docker-compose.yml', '.env.example'];
    
    for (const file of templateFiles) {
      const templateFile = path.join(templatePath, file);
      if (fs.existsSync(templateFile)) {
        await fs.copy(templateFile, file);
      }
    }
  }

  /**
   * Copy docker directory from template
   * @param {string} templateName - Name of the template
   */
  async copyDockerDirectory(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    const dockerDir = path.join(templatePath, 'docker');
    
    if (fs.existsSync(dockerDir)) {
      await fs.copy(dockerDir, 'docker');
    }
  }

  /**
   * Copy template README for reference
   * @param {string} templateName - Name of the template
   */
  async copyTemplateReadme(templateName) {
    const templatePath = path.join(this.templateBasePath, templateName);
    const templateReadme = path.join(templatePath, 'README.md');
    
    if (fs.existsSync(templateReadme)) {
      await fs.copy(templateReadme, '.devcontainer/TEMPLATE-README.md');
    }
  }

  /**
   * Get template stack configuration
   * @param {string} templateName - Name of the template
   * @returns {string|null} Stack ID that uses this template
   */
  async getTemplateStack(templateName) {
    // Find stack that uses this template
    const { STACKS } = await import('./stack-configuration.js');
    
    for (const [stackId, config] of Object.entries(STACKS)) {
      if (config.template === templateName) {
        return stackId;
      }
    }
    
    return null;
  }

  /**
   * Validate template compatibility with stack
   * @param {string} templateName - Name of the template
   * @param {string} stackId - Stack identifier
   * @returns {boolean} True if template is compatible
   */
  async isTemplateCompatibleWithStack(templateName, stackId) {
    try {
      const stackConfig = getStack(stackId);
      
      // If stack doesn't specify a template, it's not compatible
      if (!stackConfig.template) {
        return false;
      }
      
      // Check if template matches stack configuration
      return stackConfig.template === templateName;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the template base path
   * @returns {string} Template base path
   */
  getTemplateBasePath() {
    return this.templateBasePath;
  }

  /**
   * Set a custom template base path (useful for testing)
   * @param {string} basePath - New base path for templates
   */
  setTemplateBasePath(basePath) {
    this.templateBasePath = basePath;
  }

  /**
   * Validate all templates in the template directory
   * @returns {Object} Validation results
   */
  async validateAllTemplates() {
    const templates = await this.getAvailableTemplates();
    const results = {
      valid: [],
      invalid: [],
      errors: {}
    };

    for (const template of templates) {
      try {
        await this.validateTemplate(template);
        results.valid.push(template);
      } catch (error) {
        results.invalid.push(template);
        results.errors[template] = error.message;
      }
    }

    return results;
  }

  /**
   * Create template structure for a new template
   * @param {string} templateName - Name of the new template
   * @param {Object} options - Template creation options
   */
  async createTemplate(templateName, options = {}) {
    const templatePath = path.join(this.templateBasePath, templateName);
    
    if (fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} already exists`);
    }

    await fs.ensureDir(templatePath);

    // Create basic docker-compose.yml
    const dockerCompose = {
      version: '3.8',
      services: {
        app: {
          build: {
            context: '.',
            dockerfile: 'Dockerfile'
          },
          volumes: ['./:/workspace:cached'],
          working_dir: '/workspace',
          command: 'sleep infinity',
          environment: options.environment || {}
        }
      }
    };

    await fs.writeFile(
      path.join(templatePath, 'docker-compose.yml'),
      JSON.stringify(dockerCompose, null, 2)
    );

    // Create basic devcontainer.json
    const devcontainer = {
      name: templateName,
      dockerComposeFile: 'docker-compose.yml',
      service: 'app',
      workspaceFolder: '/workspace'
    };

    await fs.writeFile(
      path.join(templatePath, 'devcontainer.json'),
      JSON.stringify(devcontainer, null, 2)
    );

    // Create README.md
    const readme = [
      `# ${templateName} Template`,
      '',
      'This is a DevContainer template for multi-service development.',
      '',
      '## Services',
      '',
      '- **app**: Main development container',
      '',
      '## Usage',
      '',
      '1. Copy template files to your project',
      '2. Customize docker-compose.yml for your needs',
      '3. Update .env.example with required environment variables',
      ''
    ].join('\n');

    await fs.writeFile(path.join(templatePath, 'README.md'), readme);

    // Create .env.example
    const envExample = [
      '# Environment Variables for Template',
      '# Copy to .env and fill in your values',
      '',
      '# Add your environment variables here',
      ''
    ].join('\n');

    await fs.writeFile(path.join(templatePath, '.env.example'), envExample);
  }
}