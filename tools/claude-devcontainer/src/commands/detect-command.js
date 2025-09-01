import chalk from 'chalk';
import { ProjectDetector } from '../core/project-detector.js';
import { getStack } from '../core/stack-configuration.js';

/**
 * Handle the detect command for analyzing project type
 */
export function handleDetect() {
  const detector = new ProjectDetector();
  
  try {
    console.log(chalk.blue('🔍 Analyzing current directory...\n'));
    
    const detectedStacks = detector.detectProjectType();
    const complexity = detector.getProjectComplexity();
    const shouldUseMultiService = detector.shouldUseMultiService();
    
    if (detectedStacks.length > 0) {
      console.log(chalk.green('✅ Detected project types:'));
      detectedStacks.forEach(stackId => {
        const config = getStack(stackId);
        console.log(chalk.gray(`   • ${config.name} - ${config.description}`));
      });
      
      console.log(chalk.blue(`\n📊 Project complexity: ${complexity}/10`));
      
      if (shouldUseMultiService) {
        console.log(chalk.yellow('⚡ Multi-service setup recommended for this project'));
      } else {
        console.log(chalk.gray('📦 Single-container setup should be sufficient'));
      }
      
      console.log(chalk.blue('\n🎯 Recommended stacks:'));
      const primaryStack = detectedStacks[0];
      const primaryConfig = getStack(primaryStack);
      
      console.log(chalk.green(`   Primary: ${primaryConfig.name}`));
      if (detectedStacks.length > 1) {
        detectedStacks.slice(1).forEach(stackId => {
          const config = getStack(stackId);
          console.log(chalk.gray(`   Alternative: ${config.name}`));
        });
      }
      
      // Show additional insights
      const hasDatabase = detector.detectDatabaseUsage();
      const hasCache = detector.detectCacheUsage();
      const hasBackgroundJobs = detector.detectBackgroundJobs();
      const hasExistingCompose = detector.hasExistingCompose();
      
      if (hasDatabase || hasCache || hasBackgroundJobs || hasExistingCompose) {
        console.log(chalk.blue('\n🔍 Additional findings:'));
        if (hasDatabase) console.log(chalk.gray('   • Database usage detected'));
        if (hasCache) console.log(chalk.gray('   • Cache usage detected'));
        if (hasBackgroundJobs) console.log(chalk.gray('   • Background jobs detected'));
        if (hasExistingCompose) console.log(chalk.gray('   • Existing Docker Compose configuration found'));
      }
      
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray(`   claude-devcontainer init --stack ${primaryStack}`));
      if (shouldUseMultiService) {
        console.log(chalk.gray('   claude-devcontainer services  # View multi-service options'));
      }
      
    } else {
      console.log(chalk.yellow('⚠️  No specific project type detected'));
      console.log(chalk.gray('This appears to be a generic project or mixed technology stack.\n'));
      
      console.log(chalk.blue('💡 Suggestions:'));
      console.log(chalk.gray('   • Use "claude-devcontainer stacks" to see all available options'));
      console.log(chalk.gray('   • Consider the "custom" stack for maximum flexibility'));
      console.log(chalk.gray('   • Initialize with: claude-devcontainer init --stack custom'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Detection failed: ${error.message}`));
    process.exit(1);
  }
}