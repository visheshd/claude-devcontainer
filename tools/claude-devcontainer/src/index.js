#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Stack configurations
const STACKS = {
  'python-ml': {
    name: 'Python ML',
    description: 'Python with ML libraries, LangChain, Jupyter',
    image: 'ghcr.io/your-org/claude-python-ml:latest',
    ports: [8888], // Jupyter
    features: ['serena', 'context7', 'langchain-tools', 'vector-db'],
    extensions: [
      'ms-python.python',
      'ms-toolsai.jupyter',
      'ms-python.black-formatter'
    ]
  },
  'rust-tauri': {
    name: 'Rust Tauri',
    description: 'Rust with Tauri v2 for desktop apps',
    image: 'ghcr.io/your-org/claude-rust-tauri:latest',
    ports: [1420], // Tauri dev server
    features: ['serena', 'context7', 'rust-analyzer', 'tauri-tools'],
    extensions: [
      'rust-lang.rust-analyzer',
      'tauri-apps.tauri-vscode',
      'vadimcn.vscode-lldb'
    ],
    hostBuilds: true
  },
  'nextjs': {
    name: 'Next.js',
    description: 'Next.js with modern web development tools',
    image: 'ghcr.io/your-org/claude-nextjs:latest',
    ports: [3000], // Next.js dev server
    features: ['serena', 'context7', 'web-dev-tools', 'nextjs-tools'],
    extensions: [
      'bradlc.vscode-tailwindcss',
      'esbenp.prettier-vscode',
      'ms-vscode.vscode-typescript-next'
    ]
  },
  'custom': {
    name: 'Custom',
    description: 'Base Claude environment for custom configuration',
    image: 'ghcr.io/your-org/claude-base:latest',
    features: ['serena', 'context7'],
    extensions: []
  }
};

class DevContainerGenerator {
  constructor(options = {}) {
    this.options = options;
  }

  detectProjectType(projectPath = '.') {
    const detectedStacks = [];
    
    // Check for project indicators
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        detectedStacks.push('nextjs');
      } else {
        detectedStacks.push('nodejs');
      }
    }
    
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      if (fs.existsSync(path.join(projectPath, 'src-tauri'))) {
        detectedStacks.push('rust-tauri');
      } else {
        detectedStacks.push('rust');
      }
    }
    
    if (fs.existsSync(path.join(projectPath, 'pyproject.toml')) || 
        fs.existsSync(path.join(projectPath, 'setup.py')) ||
        fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
      // Check for ML indicators
      const pyFiles = glob.sync('**/*.py', { cwd: projectPath, ignore: ['**/node_modules/**'] });
      const hasMLIndicators = pyFiles.some(file => {
        const content = fs.readFileSync(path.join(projectPath, file), 'utf8');
        return /import (pandas|numpy|sklearn|torch|tensorflow|langchain|openai)/m.test(content);
      });
      
      if (hasMLIndicators) {
        detectedStacks.push('python-ml');
      } else {
        detectedStacks.push('python');
      }
    }
    
    return detectedStacks;
  }

  async promptForStack() {
    const detectedStacks = this.detectProjectType();
    
    console.log(chalk.blue('🔍 Project Detection Results:'));
    if (detectedStacks.length > 0) {
      console.log(chalk.green(`  Detected: ${detectedStacks.join(', ')}`));
    } else {
      console.log(chalk.yellow('  No specific project type detected'));
    }
    console.log();

    const { stack } = await inquirer.prompt([
      {
        type: 'list',
        name: 'stack',
        message: 'Select development stack:',
        choices: [
          ...Object.entries(STACKS).map(([key, config]) => ({
            name: `${config.name} - ${config.description}`,
            value: key,
            short: config.name
          }))
        ],
        default: detectedStacks.length > 0 ? detectedStacks[0] : 'custom'
      }
    ]);

    return stack;
  }

  async promptForFeatures(stackConfig) {
    const allFeatures = [
      'serena', 'context7', 'twilio', 'langchain-tools', 'vector-db',
      'anthropic-api', 'rust-analyzer', 'tauri-tools', 'web-dev-tools', 'nextjs-tools'
    ];

    const { features } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select MCP servers to install:',
        choices: allFeatures.map(feature => ({
          name: feature,
          checked: stackConfig.features.includes(feature)
        }))
      }
    ]);

    return features;
  }

  async promptForOptions() {
    const options = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableHostBuilds',
        message: 'Enable macOS host builds (requires SSH setup)?',
        default: false
      },
      {
        type: 'input',
        name: 'name',
        message: 'Container name:',
        default: path.basename(process.cwd())
      },
      {
        type: 'confirm',
        name: 'includeSettings',
        message: 'Include Claude settings template?',
        default: true
      }
    ]);

    return options;
  }

  generateDevContainerConfig(stack, features, options) {
    const stackConfig = STACKS[stack];
    
    const config = {
      name: options.name || `Claude ${stackConfig.name} Development`,
      image: stackConfig.image
    };

    // Add features
    const featureConfig = {};
    
    // MCP servers feature
    if (features.length > 0) {
      featureConfig['ghcr.io/your-org/devcontainer-features/claude-mcp:1'] = {
        servers: features.join(',')
      };
    }

    // Host SSH build feature
    if (options.enableHostBuilds) {
      featureConfig['ghcr.io/your-org/devcontainer-features/host-ssh-build:1'] = {
        enableMacosBuild: true
      };
    }

    if (Object.keys(featureConfig).length > 0) {
      config.features = featureConfig;
    }

    // Add port forwarding
    if (stackConfig.ports && stackConfig.ports.length > 0) {
      config.forwardPorts = stackConfig.ports;
    }

    // Add VS Code customizations
    if (stackConfig.extensions && stackConfig.extensions.length > 0) {
      config.customizations = {
        vscode: {
          extensions: [
            'anthropic.claude-code',
            ...stackConfig.extensions
          ]
        }
      };
    }

    // Add post create command based on stack
    const postCreateCommands = [];
    if (stack === 'python-ml') {
      postCreateCommands.push('uv sync');
    } else if (stack === 'nextjs') {
      postCreateCommands.push('npm install');
    } else if (stack === 'rust-tauri') {
      postCreateCommands.push('cargo fetch');
    }

    if (postCreateCommands.length > 0) {
      config.postCreateCommand = postCreateCommands.join(' && ');
    }

    return config;
  }

  async createClaudeSettings() {
    const settings = {
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

    return settings;
  }

  async writeFiles(config, options) {
    const spinner = ora('Creating DevContainer configuration...').start();

    try {
      // Create .devcontainer directory
      await fs.ensureDir('.devcontainer');

      // Write devcontainer.json
      await fs.writeJson('.devcontainer/devcontainer.json', config, { spaces: 2 });
      spinner.text = 'Created devcontainer.json';

      // Create Claude settings if requested
      if (options.includeSettings) {
        await fs.ensureDir('.claude');
        
        const settings = await this.createClaudeSettings();
        await fs.writeJson('.claude/settings.json', settings, { spaces: 2 });
        
        // Copy CLAUDE.md template if it doesn't exist
        if (!fs.existsSync('.claude/CLAUDE.md') && fs.existsSync('../.claude/CLAUDE.md')) {
          await fs.copy('../.claude/CLAUDE.md', '.claude/CLAUDE.md');
        }
        
        spinner.text = 'Created Claude configuration';
      }

      // Create .env.example if it doesn't exist
      if (!fs.existsSync('.env.example')) {
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
        spinner.text = 'Created .env.example';
      }

      spinner.succeed('DevContainer configuration created successfully!');
    } catch (error) {
      spinner.fail('Failed to create configuration');
      throw error;
    }
  }

  async migrate() {
    console.log(chalk.blue.bold('🚀 Claude DevContainer Migration Tool\n'));

    try {
      // Detect current setup
      const hasClaudeDocker = fs.existsSync('../claude-docker.sh') || fs.existsSync('../src/claude-docker.sh');
      if (hasClaudeDocker) {
        console.log(chalk.green('✓ Detected existing claude-docker setup'));
      }

      // Select stack
      const stack = await this.promptForStack();
      const stackConfig = STACKS[stack];

      console.log(chalk.cyan(`\n📦 Selected: ${stackConfig.name}`));
      console.log(chalk.gray(`    ${stackConfig.description}\n`));

      // Select features
      const features = await this.promptForFeatures(stackConfig);
      
      // Get additional options
      const options = await this.promptForOptions();

      // Generate configuration
      const config = this.generateDevContainerConfig(stack, features, options);

      console.log(chalk.blue('\n📋 Configuration Preview:'));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Create DevContainer configuration?',
          default: true
        }
      ]);

      if (confirm) {
        await this.writeFiles(config, options);
        
        console.log(chalk.green.bold('\n🎉 DevContainer setup complete!\n'));
        console.log(chalk.blue('Next steps:'));
        console.log(chalk.white('  1. Open project in VS Code or compatible editor'));
        console.log(chalk.white('  2. Use "Dev Containers: Reopen in Container" command'));
        console.log(chalk.white('  3. Wait for container build and feature installation'));
        console.log(chalk.white('  4. Start coding with Claude!\n'));

        if (options.enableHostBuilds) {
          console.log(chalk.yellow('⚠️  Host builds enabled - ensure SSH keys are set up:'));
          console.log(chalk.white('   ssh-keygen -t rsa -b 4096'));
          console.log(chalk.white('   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys\n'));
        }
      }

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      process.exit(1);
    }
  }
}

// CLI Commands
program
  .name('claude-devcontainer')
  .description('CLI tool for Claude DevContainer setup and migration')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new Claude DevContainer configuration')
  .option('-s, --stack <stack>', 'Pre-select development stack')
  .option('--no-interaction', 'Run without interactive prompts')
  .action(async (options) => {
    const generator = new DevContainerGenerator(options);
    await generator.migrate();
  });

program
  .command('detect')
  .description('Detect project type in current directory')
  .action(() => {
    const generator = new DevContainerGenerator();
    const stacks = generator.detectProjectType();
    
    if (stacks.length > 0) {
      console.log(chalk.green('Detected project types:'));
      stacks.forEach(stack => console.log(chalk.blue(`  • ${stack}`)));
    } else {
      console.log(chalk.yellow('No specific project type detected'));
    }
  });

program
  .command('stacks')
  .description('List available development stacks')
  .action(() => {
    console.log(chalk.blue.bold('Available Development Stacks:\n'));
    
    Object.entries(STACKS).forEach(([key, config]) => {
      console.log(chalk.green(`${config.name} (${key})`));
      console.log(chalk.gray(`  ${config.description}`));
      console.log(chalk.white(`  Image: ${config.image}`));
      if (config.features.length > 0) {
        console.log(chalk.white(`  Features: ${config.features.join(', ')}`));
      }
      console.log();
    });
  });

program.parse();