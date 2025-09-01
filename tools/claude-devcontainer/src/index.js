#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

// Import command handlers
import { handleInit } from './commands/init-command.js';
import { handleMigrate, handleMigrateSpecific, handleCheck, handleChangeSets } from './commands/migrate-command.js';
import { handleDetect } from './commands/detect-command.js';
import { handleStacks } from './commands/stacks-command.js';
import { handleServices } from './commands/services-command.js';
import { handleComposeTemplate } from './commands/compose-command.js';

// Import error handling
import { formatErrorForCLI } from './core/devcontainer-error.js';

/**
 * Create and configure the CLI program
 * @returns {Command} Configured commander program
 */
function createProgram() {
  const program = new Command();
  
  program
    .name('claude-devcontainer')
    .description('Claude DevContainer CLI - Create and manage DevContainer configurations')
    .version('1.0.0');

  // Global error handler
  program.exitOverride();

  // Init command
  program
    .command('init')
    .description('Initialize a new Claude DevContainer configuration')
    .option('-s, --stack <stack>', 'Pre-select development stack')
    .option('-f, --features <features>', 'Comma-separated list of MCP features')
    .option('-n, --name <name>', 'Project name for DevContainer')
    .option('--multi-service', 'Force multi-service setup')
    .option('--no-interaction', 'Run without interactive prompts')
    .action(async (options) => {
      try {
        await handleInit(options);
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  // Migration commands
  program
    .command('migrate')
    .description('Migrate existing DevContainer configuration to latest Claude setup')
    .option('--dry-run', 'Show proposed changes without applying them')
    .option('--auto', 'Apply safe changes automatically without prompting')
    .action(async (options) => {
      try {
        await handleMigrate(options);
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  program
    .command('migrate-specific <changesets...>')
    .description('Apply specific change sets (e.g., add-claude-mount update-image)')
    .option('--dry-run', 'Show proposed changes without applying them')
    .option('--auto', 'Apply changes automatically without prompting')
    .action(async (changesets, options) => {
      try {
        await handleMigrateSpecific(changesets, options);
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  program
    .command('check')
    .description('Analyze existing DevContainer configuration for issues')
    .action(async () => {
      try {
        await handleCheck();
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  program
    .command('change-sets')
    .description('List all available change sets')
    .action(async () => {
      try {
        await handleChangeSets();
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  // Detection and information commands
  program
    .command('detect')
    .description('Detect project type in current directory')
    .action(() => {
      try {
        handleDetect();
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  program
    .command('stacks')
    .description('List available development stacks')
    .action(() => {
      try {
        handleStacks();
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  program
    .command('services')
    .description('List available multi-service templates')
    .action(async () => {
      try {
        await handleServices();
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  // Multi-service template command
  program
    .command('compose <template>')
    .description('Initialize with specific multi-service template')
    .option('-n, --name <name>', 'Project name')
    .option('--no-interaction', 'Run without interactive prompts')
    .action(async (template, options) => {
      try {
        await handleComposeTemplate(template, options);
      } catch (error) {
        console.error(chalk.red(formatErrorForCLI(error)));
        process.exit(1);
      }
    });

  return program;
}

/**
 * Main entry point
 */
async function main() {
  const program = createProgram();
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error.code === 'commander.version') {
      // Version command, exit normally
      return;
    }
    
    if (error.code === 'commander.help') {
      // Help command, exit normally
      return;
    }
    
    // Handle other command errors
    console.error(chalk.red(`CLI Error: ${error.message}`));
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProgram };
export default main;