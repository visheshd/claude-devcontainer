import chalk from 'chalk';
import inquirer from 'inquirer';
import { TemplateManager } from '../core/template-manager.js';
import { ConfigGenerator } from '../core/config-generator.js';
import { FileWriter } from '../core/file-writer.js';
import { getStacksByType } from '../core/stack-configuration.js';
import { TemplateNotFoundError, TemplateValidationError } from '../core/devcontainer-error.js';

/**
 * Handle the compose template command for initializing with specific multi-service templates
 * @param {string} template - Template name
 * @param {Object} options - Command options
 */
export async function handleComposeTemplate(template, options = {}) {
  const templateManager = new TemplateManager();
  const configGenerator = new ConfigGenerator();
  const fileWriter = new FileWriter();
  
  try {
    console.log(chalk.blue(`🐳 Initializing with template: ${template}\n`));
    
    // Validate template exists
    if (!templateManager.templateExists(template)) {
      const availableTemplates = await templateManager.getAvailableTemplates();
      throw new TemplateNotFoundError(template, `Available templates: ${availableTemplates.join(', ')}`);
    }
    
    // Validate template structure
    await templateManager.validateTemplate(template);
    
    // Get template info
    const templateInfo = await templateManager.getTemplateInfo(template);
    console.log(chalk.green(`✅ Template "${template}" validated successfully`));
    
    // Find associated stack configuration
    const multiStacks = getStacksByType(true);
    let stackId = null;
    let stackConfig = null;
    
    for (const [id, config] of Object.entries(multiStacks)) {
      if (config.template === template) {
        stackId = id;
        stackConfig = config;
        break;
      }
    }
    
    if (!stackId) {
      console.log(chalk.yellow(`⚠️  No stack configuration found for template "${template}"`));
      console.log(chalk.gray('Using generic multi-service configuration'));
    } else {
      console.log(chalk.blue(`📦 Using stack configuration: ${stackConfig.name}`));
    }
    
    // Get project name
    let projectName = options.name;
    if (!projectName && !options.noInteraction) {
      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          default: template.replace('-stack', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
      ]);
      projectName = name;
    }
    
    // Generate configuration
    let config;
    if (stackId) {
      config = configGenerator.generateComposeConfig(stackId, {
        name: projectName || `${template} Development`
      });
    } else {
      // Generic multi-service configuration
      config = {
        name: projectName || `${template} Development`,
        dockerComposeFile: 'docker-compose.yml',
        service: 'app',
        workspaceFolder: '/workspace',
        ...configGenerator.getDefaultMounts(),
        customizations: {
          vscode: {
            extensions: ['anthropic.claude-code']
          }
        }
      };
    }
    
    console.log(chalk.green(`📋 Creating multi-service environment...`));
    
    // Write template files
    await fileWriter.writeComposeFiles(stackId || 'generic', config);
    
    console.log(chalk.green('\n✅ Multi-service template initialized successfully!'));
    
    // Show template details
    if (templateInfo) {
      console.log(chalk.blue('\n📁 Template includes:'));
      if (templateInfo.hasDockerCompose) console.log(chalk.gray('   ✅ docker-compose.yml'));
      if (templateInfo.hasDevContainer) console.log(chalk.gray('   ✅ .devcontainer/devcontainer.json'));
      if (templateInfo.hasEnvExample) console.log(chalk.gray('   ✅ .env.example'));
      if (templateInfo.hasReadme) console.log(chalk.gray('   ✅ .devcontainer/TEMPLATE-README.md'));
      if (templateInfo.hasDockerDir) console.log(chalk.gray('   ✅ docker/ directory'));
    }
    
    // Show services info
    if (stackConfig?.services) {
      console.log(chalk.blue('\n🐳 Services included:'));
      stackConfig.services.forEach(service => {
        console.log(chalk.gray(`   • ${service}`));
      });
      
      if (stackConfig.ports && stackConfig.ports.length > 0) {
        console.log(chalk.blue(`\n🌐 Ports: ${stackConfig.ports.join(', ')}`));
      }
    }
    
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(chalk.gray('   1. Review and customize docker-compose.yml'));
    console.log(chalk.gray('   2. Copy .env.example to .env and configure'));
    console.log(chalk.gray('   3. Open in VS Code Dev Container'));
    console.log(chalk.gray('   4. VS Code will connect to the "app" service by default'));
    
    if (templateInfo.hasReadme) {
      console.log(chalk.blue('\n📖 See .devcontainer/TEMPLATE-README.md for template-specific instructions'));
    }
    
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      console.error(chalk.red(`❌ Template not found: ${error.message}`));
      console.log(chalk.blue('\nAvailable templates:'));
      try {
        const availableTemplates = await templateManager.getAvailableTemplates();
        availableTemplates.forEach(t => console.log(chalk.gray(`   • ${t}`)));
      } catch (listError) {
        console.log(chalk.gray('   Unable to list available templates'));
      }
    } else if (error instanceof TemplateValidationError) {
      console.error(chalk.red(`❌ Template validation failed: ${error.message}`));
      if (error.missingFiles && error.missingFiles.length > 0) {
        console.log(chalk.gray(`Missing files: ${error.missingFiles.join(', ')}`));
      }
    } else {
      console.error(chalk.red(`❌ Template initialization failed: ${error.message}`));
    }
    process.exit(1);
  }
}