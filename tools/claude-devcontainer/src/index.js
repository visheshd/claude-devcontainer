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

// Helper function to strip JSON comments (for DevContainer files)
function stripJsonComments(jsonString) {
  return jsonString
    .split('\n')
    .map(line => {
      // Remove line comments but preserve strings
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        // Check if // is inside a string
        const beforeComment = line.substring(0, commentIndex);
        const quotes = (beforeComment.match(/"/g) || []).length;
        if (quotes % 2 === 0) {
          // Even number of quotes means // is not inside a string
          return line.substring(0, commentIndex).trimEnd();
        }
      }
      return line;
    })
    .join('\n');
}

// Stack configurations
const STACKS = {
  'python-ml': {
    name: 'Python ML',
    description: 'Python with ML libraries, LangChain, Jupyter',
    image: 'claude-python-ml:latest',
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
    image: 'claude-rust-tauri:latest',
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
    image: 'claude-nextjs:latest',
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
    image: 'claude-base:latest',
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
      image: stackConfig.image,
      // Mount user's Claude directory for full functionality
      mounts: [
        "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
      ]
    };

    // Add features
    const featureConfig = {};
    
    // MCP servers feature
    if (features.length > 0) {
      featureConfig['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1'] = {
        servers: features.join(',')
      };
    }

    // Host SSH build feature
    if (options.enableHostBuilds) {
      featureConfig['ghcr.io/visheshd/claude-devcontainer/host-ssh-build:1'] = {
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
      postCreateCommands.push('pnpm install');
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

  async init() {
    console.log(chalk.blue.bold('🚀 Claude DevContainer Initialization\n'));

    try {
      // Check if DevContainer already exists
      if (fs.existsSync('.devcontainer/devcontainer.json')) {
        console.log(chalk.yellow('⚠️  DevContainer configuration already exists.'));
        if (!this.options.interaction) {
          console.log(chalk.blue('Use "claude-devcontainer migrate" to update existing configuration.\n'));
          return;
        }
        
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Overwrite existing configuration?',
            default: false
          }
        ]);
        
        if (!overwrite) {
          console.log(chalk.blue('Use "claude-devcontainer migrate" to update existing configuration.\n'));
          return;
        }
      }

      // Detect project type
      const detectedStacks = this.detectProjectType();
      let stack;
      
      if (this.options.stack) {
        stack = this.options.stack;
        if (!STACKS[stack]) {
          console.error(chalk.red(`Unknown stack: ${stack}`));
          console.log(chalk.blue('Available stacks:'), Object.keys(STACKS).join(', '));
          process.exit(1);
        }
      } else if (this.options.interaction === false) {
        // No interaction mode - use detected stack or default
        if (detectedStacks.length > 0) {
          stack = detectedStacks[0];
          console.log(chalk.green(`✓ Auto-detected stack: ${stack}`));
        } else {
          stack = 'custom'; // Default stack
          console.log(chalk.blue(`Using default stack: ${stack}`));
        }
      } else {
        // Interactive mode - prompt for stack
        const choices = Object.entries(STACKS).map(([key, config]) => ({
          name: `${config.name} - ${config.description}`,
          value: key,
          short: config.name
        }));
        
        if (detectedStacks.length > 0) {
          console.log(chalk.green('Detected project types:'), detectedStacks.join(', '));
        }

        const { selectedStack } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedStack',
            message: 'Select development stack:',
            choices,
            default: detectedStacks[0] || 'custom'
          }
        ]);
        stack = selectedStack;
      }

      const stackConfig = STACKS[stack];
      console.log(chalk.cyan(`\n📦 Selected: ${stackConfig.name}`));
      console.log(chalk.gray(`    ${stackConfig.description}\n`));

      // Generate basic configuration
      const config = this.generateBasicConfig(stack, stackConfig);

      if (this.options.interaction !== false) {
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

        if (!confirm) {
          console.log(chalk.yellow('Configuration cancelled.\n'));
          return;
        }
      }

      // Create configuration files
      await this.writeDevContainerFiles(config);
      
      console.log(chalk.green.bold('\n🎉 DevContainer setup complete!\n'));
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.white('  1. Open project in VS Code or compatible editor'));
      console.log(chalk.white('  2. Use "Dev Containers: Reopen in Container" command'));
      console.log(chalk.white('  3. Wait for container build and feature installation'));
      console.log(chalk.white('  4. Start coding with Claude!\n'));

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      process.exit(1);
    }
  }

  generateBasicConfig(stack, stackConfig) {
    const config = {
      name: `${path.basename(process.cwd())} (${stackConfig.name})`,
      image: stackConfig.image,
      mounts: [
        'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind'
      ],
      features: {
        'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
          servers: 'serena,context7'
        }
      },
      customizations: {
        vscode: {
          extensions: ['anthropic.claude-code', ...stackConfig.extensions]
        }
      }
    };

    if (stackConfig.ports && stackConfig.ports.length > 0) {
      config.forwardPorts = stackConfig.ports;
    }

    return config;
  }

  async writeDevContainerFiles(config) {
    await fs.ensureDir('.devcontainer');
    await fs.writeJson('.devcontainer/devcontainer.json', config, { spaces: 2 });
  }

  async migrate(options = {}) {
    console.log(chalk.blue.bold('🔄 Claude DevContainer Migration Tool\n'));

    try {
      // Check for existing devcontainer.json
      const devcontainerPath = '.devcontainer/devcontainer.json';
      const hasExistingConfig = fs.existsSync(devcontainerPath);

      if (!hasExistingConfig) {
        console.log(chalk.yellow('⚠️  No existing DevContainer configuration found.'));
        console.log(chalk.white('Consider using "claude-devcontainer init" to create a new configuration.\n'));
        return;
      }

      // Load and analyze existing configuration
      const spinner = ora('Analyzing existing configuration...').start();
      let existingConfig;
      try {
        const configContent = await fs.readFile(devcontainerPath, 'utf8');
        const strippedContent = stripJsonComments(configContent);
        existingConfig = JSON.parse(strippedContent);
        spinner.succeed('Existing configuration loaded');
      } catch (error) {
        spinner.fail('Failed to parse existing configuration');
        console.error(chalk.red('Error parsing devcontainer.json:'), error.message);
        process.exit(1);
      }

      // Analyze what needs updating
      const analysis = await this.analyzeConfig(existingConfig);
      
      if (analysis.issues.length === 0) {
        console.log(chalk.green('✅ Your DevContainer configuration is already up to date!\n'));
        return;
      }

      // Show analysis results
      console.log(chalk.blue('\n📋 Configuration Analysis:'));
      console.log(chalk.white(`  Current image: ${chalk.cyan(existingConfig.image || 'not specified')}`));
      
      if (analysis.hasClaudeMount) {
        console.log(chalk.green('  ✅ .claude directory mounting: configured'));
      } else {
        console.log(chalk.red('  ❌ .claude directory mounting: missing'));
      }

      if (analysis.mcpFeatures.length > 0) {
        console.log(chalk.green(`  ✅ MCP servers: ${analysis.mcpFeatures.join(', ')}`));
      } else {
        console.log(chalk.yellow('  ⚠️  MCP servers: none configured'));
      }

      console.log(chalk.blue('\n🔧 Issues to fix:'));
      analysis.issues.forEach(issue => {
        console.log(chalk.red(`  • ${issue}`));
      });

      if (options.dryRun) {
        console.log(chalk.blue('\n📋 Proposed changes (dry run):'));
        const updatedConfig = await this.generateMigrationConfig(existingConfig, analysis, { dryRun: true });
        console.log(chalk.gray(JSON.stringify(updatedConfig, null, 2)));
        return;
      }

      // Prompt for migration
      const { shouldMigrate } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldMigrate',
          message: 'Would you like to migrate your configuration?',
          default: true
        }
      ]);

      if (!shouldMigrate) {
        console.log(chalk.yellow('Migration cancelled.\n'));
        return;
      }

      // Create backup
      const backupPath = `${devcontainerPath}.backup.${Date.now()}`;
      await fs.copy(devcontainerPath, backupPath);
      console.log(chalk.green(`✅ Backup created: ${backupPath}`));

      // Generate and apply updated configuration
      const updatedConfig = await this.generateMigrationConfig(existingConfig, analysis, options);
      await fs.writeJson(devcontainerPath, updatedConfig, { spaces: 2 });

      console.log(chalk.green.bold('\n🎉 Migration completed successfully!\n'));
      console.log(chalk.blue('Changes applied:'));
      analysis.issues.forEach(issue => {
        console.log(chalk.green(`  ✅ Fixed: ${issue}`));
      });

      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.white('  1. Rebuild your DevContainer to apply changes'));
      console.log(chalk.white('  2. Use "Dev Containers: Rebuild Container" in VS Code'));
      console.log(chalk.white(`  3. Backup saved to: ${path.basename(backupPath)}\n`));

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Migration Error:'), error.message);
      process.exit(1);
    }
  }

  async analyzeConfig(existingConfig) {
    const analysis = {
      hasClaudeMount: false,
      mcpFeatures: [],
      outdatedImage: null,
      issues: [],
      isWorktree: false,
      hardcodedWorktreePaths: [],
      customizations: {
        mounts: [],
        extensions: [],
        ports: [],
        environment: {}
      }
    };

    // Check for .claude mount
    if (existingConfig.mounts) {
      analysis.hasClaudeMount = existingConfig.mounts.some(mount => 
        mount.includes('.claude') && mount.includes('/home/claude-user/.claude')
      );
      
      // Preserve custom mounts (non-.claude mounts)
      analysis.customizations.mounts = existingConfig.mounts.filter(mount => 
        !mount.includes('.claude')
      );
    }

    if (!analysis.hasClaudeMount) {
      analysis.issues.push('Missing .claude directory mount for user customizations');
    }

    // Check for MCP features
    if (existingConfig.features) {
      const mcpFeature = existingConfig.features['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1'];
      if (mcpFeature && mcpFeature.servers) {
        analysis.mcpFeatures = mcpFeature.servers.split(',').map(s => s.trim());
      }
    }

    // Check for outdated images
    const imageMapping = {
      'claude-docker:latest': 'claude-base:latest',
      'claude-docker': 'claude-base:latest'
    };

    if (existingConfig.image && imageMapping[existingConfig.image]) {
      analysis.outdatedImage = {
        current: existingConfig.image,
        recommended: imageMapping[existingConfig.image]
      };
      analysis.issues.push(`Outdated image reference: ${existingConfig.image} → ${imageMapping[existingConfig.image]}`);
    }

    // Preserve custom VS Code extensions
    if (existingConfig.customizations?.vscode?.extensions) {
      const standardExtensions = ['anthropic.claude-code'];
      analysis.customizations.extensions = existingConfig.customizations.vscode.extensions.filter(ext => 
        !standardExtensions.includes(ext)
      );
    }

    // Preserve custom ports
    if (existingConfig.forwardPorts) {
      analysis.customizations.ports = existingConfig.forwardPorts;
    }

    // Check if MCP servers are missing or could be improved
    if (analysis.mcpFeatures.length === 0) {
      analysis.issues.push('No MCP servers configured - consider adding serena and context7');
    }

    // Check for worktree-specific configurations that need to be made dynamic
    this.detectWorktreeConfiguration(existingConfig, analysis);

    return analysis;
  }

  detectWorktreeConfiguration(existingConfig, analysis) {
    const worktreeIndicators = [
      'WORKTREE_DETECTED',
      'WORKTREE_HOST_MAIN_REPO', 
      'WORKTREE_CONTAINER_MAIN_REPO',
      'WORKTREE_NAME'
    ];

    // Check for worktree environment variables
    if (existingConfig.containerEnv) {
      const hasWorktreeEnv = worktreeIndicators.some(indicator => 
        existingConfig.containerEnv[indicator] !== undefined
      );
      
      if (hasWorktreeEnv) {
        analysis.isWorktree = true;
        
        // Detect hardcoded paths in environment variables
        Object.entries(existingConfig.containerEnv).forEach(([key, value]) => {
          if (typeof value === 'string' && (
              value.includes('/Users/') || 
              value.includes('/home/') ||
              value.match(/^\/[a-zA-Z]/) // Absolute paths
            )) {
            analysis.hardcodedWorktreePaths.push(`containerEnv.${key}: ${value}`);
          }
        });
      }
    }

    // Check for hardcoded paths in mounts
    if (existingConfig.mounts) {
      existingConfig.mounts.forEach((mount, index) => {
        if (mount.includes('/Users/') || mount.includes('/home/')) {
          analysis.hardcodedWorktreePaths.push(`mounts[${index}]: ${mount}`);
        }
      });
    }

    // Check for hardcoded workspace folder
    if (existingConfig.workspaceFolder && 
        (existingConfig.workspaceFolder.includes('/Users/') || 
         existingConfig.workspaceFolder.includes('/home/'))) {
      analysis.hardcodedWorktreePaths.push(`workspaceFolder: ${existingConfig.workspaceFolder}`);
    }

    // Add issues for hardcoded paths
    if (analysis.hardcodedWorktreePaths.length > 0) {
      analysis.issues.push('Hardcoded paths detected - configuration needs to be made dynamic for portability');
    }
  }

  async generateMigrationConfig(existingConfig, analysis, options = {}) {
    // Start with existing config to preserve user customizations
    const updatedConfig = { ...existingConfig };

    // Fix image reference if needed
    if (analysis.outdatedImage) {
      updatedConfig.image = analysis.outdatedImage.recommended;
    }

    // Add or fix .claude mount
    if (!analysis.hasClaudeMount) {
      const claudeMount = "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind";
      
      if (!updatedConfig.mounts) {
        updatedConfig.mounts = [];
      }
      
      // Add .claude mount first, then preserve custom mounts
      updatedConfig.mounts = [claudeMount, ...analysis.customizations.mounts];
    }

    // Add MCP features if missing
    if (analysis.mcpFeatures.length === 0) {
      let addMCP = true; // Default to true for dry-run mode
      
      if (!options.dryRun) {
        const response = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'addMCP',
            message: 'Add recommended MCP servers (serena, context7)?',
            default: true
          }
        ]);
        addMCP = response.addMCP;
      }

      if (addMCP) {
        if (!updatedConfig.features) {
          updatedConfig.features = {};
        }
        
        updatedConfig.features['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1'] = {
          servers: 'serena,context7'
        };
      }
    }

    // Ensure Claude Code extension is present
    if (!updatedConfig.customizations) {
      updatedConfig.customizations = {};
    }
    if (!updatedConfig.customizations.vscode) {
      updatedConfig.customizations.vscode = {};
    }
    if (!updatedConfig.customizations.vscode.extensions) {
      updatedConfig.customizations.vscode.extensions = [];
    }

    const extensions = updatedConfig.customizations.vscode.extensions;
    if (!extensions.includes('anthropic.claude-code')) {
      extensions.unshift('anthropic.claude-code');
    }

    // Remove duplicates while preserving order
    updatedConfig.customizations.vscode.extensions = [...new Set(extensions)];

    // Fix worktree configurations to be dynamic
    if (analysis.isWorktree && analysis.hardcodedWorktreePaths.length > 0) {
      this.makeWorktreeConfigDynamic(updatedConfig);
    }

    return updatedConfig;
  }

  makeWorktreeConfigDynamic(config) {
    // Make workspace folder dynamic
    if (config.workspaceFolder && config.workspaceFolder.includes('/workspaces/')) {
      config.workspaceFolder = '/workspaces/${localWorkspaceFolderBasename}';
    }

    // Make environment variables dynamic
    if (config.containerEnv) {
      // Make WORKTREE_NAME dynamic
      if (config.containerEnv.WORKTREE_NAME) {
        config.containerEnv.WORKTREE_NAME = '${localWorkspaceFolderBasename}';
      }

      // Make main repo paths relative and dynamic
      if (config.containerEnv.WORKTREE_HOST_MAIN_REPO) {
        // Extract the parent directory path and make it relative
        config.containerEnv.WORKTREE_HOST_MAIN_REPO = '${localWorkspaceFolder}/..';
      }

      // Keep container main repo consistent
      if (config.containerEnv.WORKTREE_CONTAINER_MAIN_REPO) {
        config.containerEnv.WORKTREE_CONTAINER_MAIN_REPO = '/main-repo';
      }
    }

    // Make mounts dynamic
    if (config.mounts) {
      config.mounts = config.mounts.map(mount => {
        // Handle main repo mount
        if (mount.includes('target=/main-repo') && mount.includes('source=')) {
          return 'source=${localWorkspaceFolder}/..,target=/main-repo,type=bind,consistency=cached';
        }
        
        // Keep other mounts as-is (like .claude mount)
        return mount;
      });
    }
  }
}

// CLI Command Handlers (extracted for testability)
export async function handleInit(options = {}) {
  const generator = new DevContainerGenerator(options);
  await generator.init();
}

export async function handleMigrate(options = {}) {
  const generator = new DevContainerGenerator();
  await generator.migrate(options);
}

export async function handleCheck() {
  const generator = new DevContainerGenerator();
  await generator.migrate({ dryRun: true });
}

export function handleDetect() {
  const generator = new DevContainerGenerator();
  const stacks = generator.detectProjectType();
  
  if (stacks.length > 0) {
    console.log(chalk.green('Detected project types:'));
    stacks.forEach(stack => console.log(chalk.blue(`  • ${stack}`)));
  } else {
    console.log(chalk.yellow('No specific project type detected'));
  }
}

export function handleStacks() {
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
}

// CLI Setup function (extracted for testability)
export function setupCLI() {
  program
    .name('claude-devcontainer')
    .description('CLI tool for Claude DevContainer setup and migration')
    .version('1.0.0');

  program
    .command('init')
    .description('Initialize a new Claude DevContainer configuration')
    .option('-s, --stack <stack>', 'Pre-select development stack')
    .option('--no-interaction', 'Run without interactive prompts')
    .action(handleInit);

  program
    .command('migrate')
    .description('Migrate existing DevContainer configuration to latest Claude setup')
    .option('--dry-run', 'Show proposed changes without applying them')
    .option('--auto', 'Apply safe changes automatically without prompting')
    .action(handleMigrate);

  program
    .command('check')
    .description('Analyze existing DevContainer configuration for issues')
    .action(handleCheck);

  program
    .command('detect')
    .description('Detect project type in current directory')
    .action(handleDetect);

  program
    .command('stacks')
    .description('List available development stacks')
    .action(handleStacks);
    
  return program;
}

// Only run CLI when this file is executed (directly or through bin wrapper)
// Check if we're being run as a script (not imported for testing)
const isMainModule = process.argv[1].endsWith('src/index.js') || process.argv[1].endsWith('claude-devcontainer');

if (isMainModule) {
  setupCLI();
  program.parse();
}

// Export for testing
export { DevContainerGenerator };