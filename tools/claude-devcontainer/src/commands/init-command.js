import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProjectDetector } from '../core/project-detector.js';
import { ConfigGenerator } from '../core/config-generator.js';
import { FileWriter } from '../core/file-writer.js';
import { getStack, getAvailableStacks, getStacksByType } from '../core/stack-configuration.js';
import { StackConfigurationError, ProjectDetectionError } from '../core/devcontainer-error.js';

/**
 * Handle the init command for creating new DevContainer configurations
 * @param {Object} options - Command options
 */
export async function handleInit(options = {}) {
  const detector = new ProjectDetector();
  const configGenerator = new ConfigGenerator();
  const fileWriter = new FileWriter();

  try {
    console.log(chalk.blue('🚀 Initializing Claude DevContainer configuration...\n'));

    let stackId = options.stack;
    let features = options.features ? options.features.split(',') : [];
    let multiService = options.multiService || false;

    // Auto-detect project if no stack specified
    if (!stackId && !options.noInteraction) {
      const detectedStacks = detector.detectProjectType();
      const complexity = detector.getProjectComplexity('.');
      
      if (detectedStacks.length > 0) {
        console.log(chalk.green(`✅ Detected project types: ${detectedStacks.join(', ')}`));
        
        if (complexity >= 4) {
          console.log(chalk.yellow(`⚡ High complexity project (${complexity}/10) - multi-service setup recommended`));
        }
        
        if (!options.noInteraction) {
          // Always show at least 5 popular options, with detected stacks prioritized
          const popularStacks = ['nextjs', 'python-ml', 'rust-tauri', 'fullstack', 'custom'];
          const allAvailable = getAvailableStacks();
          
          // Create choices: detected stacks first, then popular ones not already detected
          const detectedChoices = detectedStacks.map(stack => {
            const config = getStack(stack);
            return {
              name: `✅ ${config.name} - ${config.description} (detected)`,
              value: stack
            };
          });
          
          const additionalChoices = popularStacks
            .filter(stack => !detectedStacks.includes(stack) && allAvailable.includes(stack))
            .slice(0, 5 - detectedStacks.length) // Ensure we have at least 5 total
            .map(stack => {
              const config = getStack(stack);
              return {
                name: `${config.name} - ${config.description}`,
                value: stack
              };
            });
          
          const { selectedStack } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedStack',
              message: 'Select a development stack:',
              choices: [
                ...detectedChoices,
                ...additionalChoices,
                { name: 'Browse all stacks...', value: 'browse' }
              ]
            }
          ]);
          
          if (selectedStack === 'browse') {
            const allStacks = getAvailableStacks();
            const { browsedStack } = await inquirer.prompt([
              {
                type: 'list',
                name: 'browsedStack',
                message: 'Choose from all available stacks:',
                choices: allStacks.map(stack => {
                  const config = getStack(stack);
                  return {
                    name: `${config.name} - ${config.description}`,
                    value: stack
                  };
                })
              }
            ]);
            stackId = browsedStack;
          } else {
            stackId = selectedStack;
          }
        } else {
          stackId = detectedStacks[0]; // Use first detected stack in non-interactive mode
        }
      }
    }

    // Fallback to manual selection if no auto-detection
    if (!stackId && !options.noInteraction) {
      const allStacks = getAvailableStacks();
      const { selectedStack } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedStack',
          message: 'No project type detected. Please select a stack:',
          choices: allStacks.map(stack => {
            const config = getStack(stack);
            return {
              name: `${config.name} - ${config.description}`,
              value: stack
            };
          })
        }
      ]);
      stackId = selectedStack;
    }

    if (!stackId) {
      throw new StackConfigurationError(null, 'No stack selected or detected');
    }

    const stackConfig = getStack(stackId);

    // Ask about multi-service setup for applicable stacks
    if (!options.noInteraction && stackConfig.multiService !== undefined) {
      const { useMultiService } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useMultiService',
          message: `This stack supports multi-service mode with ${stackConfig.services?.join(', ') || 'multiple services'}. Use multi-service setup?`,
          default: detector.shouldUseMultiService('.') || stackConfig.multiService
        }
      ]);
      multiService = useMultiService;
    }

    // Ask about MCP server features
    if (!options.noInteraction && !features.length && stackConfig.features) {
      const { selectedFeatures } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedFeatures',
          message: 'Select MCP server features:',
          choices: stackConfig.features.map(feature => ({
            name: feature,
            value: feature,
            checked: ['serena', 'context7'].includes(feature) // Default essentials
          })),
          validate: (input) => input.length > 0 || 'Please select at least one feature'
        }
      ]);
      features = selectedFeatures;
    }

    // Ask about additional options
    if (!options.noInteraction) {
      const { includeSettings } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeSettings',
          message: 'Create Claude settings configuration?',
          default: true
        }
      ]);
      options.includeSettings = includeSettings;

      // Ask about host builds for applicable stacks
      if (stackConfig.hostBuilds) {
        const { enableHostBuilds } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'enableHostBuilds',
            message: 'Enable host SSH builds (allows building on host machine)?',
            default: false
          }
        ]);
        options.enableHostBuilds = enableHostBuilds;
      }
    }

    // Generate configuration
    let config;
    if (multiService && stackConfig.multiService) {
      config = configGenerator.generateComposeConfig(stackId, {
        name: options.name
      });
      
      console.log(chalk.green(`📦 Creating multi-service configuration for ${stackConfig.name}...`));
      await fileWriter.writeComposeFiles(stackId, config);
    } else {
      config = configGenerator.generateDevContainerConfig(stackId, features, {
        name: options.name,
        enableHostBuilds: options.enableHostBuilds
      });
      
      console.log(chalk.green(`📦 Creating single-container configuration for ${stackConfig.name}...`));
      await fileWriter.writeDevContainerFiles(config, { includeSettings: options.includeSettings });
    }

    console.log(chalk.green('\n✅ DevContainer configuration created successfully!'));
    
    if (multiService) {
      console.log(chalk.blue('📋 Multi-service setup includes:'));
      stackConfig.services?.forEach(service => {
        console.log(chalk.gray(`   • ${service}`));
      });
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray('   1. Review and customize docker-compose.yml'));
      console.log(chalk.gray('   2. Update .env file with your settings'));
      console.log(chalk.gray('   3. Open in VS Code Dev Container'));
    } else {
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray('   1. Open your project in VS Code'));
      console.log(chalk.gray('   2. Install the Dev Containers extension'));
      console.log(chalk.gray('   3. Click "Reopen in Container" when prompted'));
    }

  } catch (error) {
    if (error instanceof StackConfigurationError) {
      console.error(chalk.red(`❌ Stack configuration error: ${error.message}`));
      console.log(chalk.gray('Available stacks: ' + getAvailableStacks().join(', ')));
    } else if (error instanceof ProjectDetectionError) {
      console.error(chalk.red(`❌ Project detection error: ${error.message}`));
    } else {
      console.error(chalk.red(`❌ Initialization failed: ${error.message}`));
    }
    process.exit(1);
  }
}