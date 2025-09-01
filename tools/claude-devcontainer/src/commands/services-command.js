import chalk from 'chalk';
import { TemplateManager } from '../core/template-manager.js';
import { getStacksByType } from '../core/stack-configuration.js';

/**
 * Handle the services command for listing available multi-service templates
 */
export async function handleServices() {
  const templateManager = new TemplateManager();
  
  try {
    console.log(chalk.blue('🐳 Multi-Service Templates:\n'));
    
    // Get multi-service stacks from configuration
    const multiStacks = getStacksByType(true);
    
    if (Object.keys(multiStacks).length > 0) {
      console.log(chalk.green('📋 Available Templates:'));
      
      for (const [stackId, config] of Object.entries(multiStacks)) {
        console.log(chalk.cyan(`   ${config.template || stackId}`));
        console.log(chalk.gray(`   ${config.description}`));
        
        if (config.services && config.services.length > 0) {
          console.log(chalk.blue(`   Services: ${config.services.join(', ')}`));
        }
        
        if (config.ports && config.ports.length > 0) {
          console.log(chalk.yellow(`   Ports: ${config.ports.join(', ')}`));
        }
        
        // Check if template exists and get additional info
        if (config.template && templateManager.templateExists(config.template)) {
          try {
            const templateInfo = await templateManager.getTemplateInfo(config.template);
            const features = [];
            if (templateInfo.hasEnvExample) features.push('.env.example');
            if (templateInfo.hasReadme) features.push('README');
            if (templateInfo.hasDockerDir) features.push('docker/');
            
            if (features.length > 0) {
              console.log(chalk.green(`   Includes: ${features.join(', ')}`));
            }
          } catch (error) {
            // Template info error - continue without additional details
          }
        }
        
        console.log();
      }
    }
    
    // List physical templates available
    console.log(chalk.green('📁 Available Template Files:'));
    const availableTemplates = await templateManager.getAvailableTemplates();
    
    if (availableTemplates.length > 0) {
      for (const templateName of availableTemplates) {
        try {
          const info = await templateManager.getTemplateInfo(templateName);
          console.log(chalk.cyan(`   ${templateName}`));
          
          const status = [];
          if (info.hasDockerCompose) status.push('✅ docker-compose.yml');
          if (info.hasDevContainer) status.push('✅ devcontainer.json');
          if (info.hasEnvExample) status.push('📝 .env.example');
          if (info.hasReadme) status.push('📖 README.md');
          if (info.hasDockerDir) status.push('🐳 docker/');
          
          if (status.length > 0) {
            console.log(chalk.gray(`      ${status.join(', ')}`));
          }
          
        } catch (error) {
          console.log(chalk.red(`   ${templateName} (⚠️  validation failed)`));
        }
        
        console.log();
      }
    } else {
      console.log(chalk.yellow('   No template files found in templates/compose/ directory'));
    }
    
    // Validate all templates
    console.log(chalk.blue('🔍 Template Validation:'));
    const validationResults = await templateManager.validateAllTemplates();
    
    if (validationResults.valid.length > 0) {
      console.log(chalk.green(`   ✅ Valid templates: ${validationResults.valid.join(', ')}`));
    }
    
    if (validationResults.invalid.length > 0) {
      console.log(chalk.red(`   ❌ Invalid templates: ${validationResults.invalid.join(', ')}`));
      console.log(chalk.gray('   Check template structure and required files'));
    }
    
    console.log(chalk.yellow('\n💡 Usage examples:'));
    console.log(chalk.gray('   claude-devcontainer compose web-db-stack'));
    console.log(chalk.gray('   claude-devcontainer init --stack web-db  # Uses associated template'));
    console.log(chalk.gray('   claude-devcontainer detect  # Auto-recommend templates'));
    
    console.log(chalk.blue('\n🎯 Template Guide:'));
    console.log(chalk.gray('   • Templates provide complete multi-service environments'));
    console.log(chalk.gray('   • Each includes docker-compose.yml, devcontainer.json, and docs'));
    console.log(chalk.gray('   • Customize by editing copied files in your project'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Failed to list services: ${error.message}`));
    process.exit(1);
  }
}