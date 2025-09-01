import chalk from 'chalk';
import { getAvailableStacks, getStack, getStacksByType } from '../core/stack-configuration.js';

/**
 * Handle the stacks command for listing available development stacks
 */
export function handleStacks() {
  try {
    console.log(chalk.blue('📚 Available Development Stacks:\n'));
    
    // Get single-container stacks
    const singleStacks = getStacksByType(false);
    const multiStacks = getStacksByType(true);
    
    if (Object.keys(singleStacks).length > 0) {
      console.log(chalk.green('🔹 Single-Container Stacks:'));
      Object.entries(singleStacks).forEach(([id, config]) => {
        console.log(chalk.cyan(`   ${id}`));
        console.log(chalk.gray(`   ${config.description}`));
        
        if (config.ports && config.ports.length > 0) {
          console.log(chalk.blue(`   Ports: ${config.ports.join(', ')}`));
        }
        
        if (config.features && config.features.length > 0) {
          console.log(chalk.yellow(`   Features: ${config.features.join(', ')}`));
        }
        
        if (config.hostBuilds) {
          console.log(chalk.magenta('   ⚡ Supports host builds'));
        }
        
        console.log();
      });
    }
    
    if (Object.keys(multiStacks).length > 0) {
      console.log(chalk.green('🔹 Multi-Service Stacks:'));
      Object.entries(multiStacks).forEach(([id, config]) => {
        console.log(chalk.cyan(`   ${id}`));
        console.log(chalk.gray(`   ${config.description}`));
        
        if (config.services && config.services.length > 0) {
          console.log(chalk.blue(`   Services: ${config.services.join(', ')}`));
        }
        
        if (config.ports && config.ports.length > 0) {
          console.log(chalk.blue(`   Ports: ${config.ports.join(', ')}`));
        }
        
        if (config.features && config.features.length > 0) {
          console.log(chalk.yellow(`   Features: ${config.features.join(', ')}`));
        }
        
        console.log();
      });
    }
    
    console.log(chalk.yellow('💡 Usage examples:'));
    console.log(chalk.gray('   claude-devcontainer init --stack python-ml'));
    console.log(chalk.gray('   claude-devcontainer init --stack nextjs --features serena,context7'));
    console.log(chalk.gray('   claude-devcontainer detect  # Auto-detect best stack'));
    
    console.log(chalk.blue('\n🎯 Stack Selection Guide:'));
    console.log(chalk.gray('   • Single-container: Best for simple projects, faster startup'));
    console.log(chalk.gray('   • Multi-service: Best for complex apps with databases/services'));
    console.log(chalk.gray('   • Use "detect" command for automatic recommendations'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Failed to list stacks: ${error.message}`));
    process.exit(1);
  }
}