import chalk from 'chalk';
import { MigrationEngine } from '../migrations/MigrationEngine.js';

/**
 * Handle the migrate command for upgrading existing DevContainer configurations
 * @param {Object} options - Command options
 */
export async function handleMigrate(options = {}) {
  const engine = new MigrationEngine();
  return engine.runMigration(options);
}

/**
 * Handle the migrate-specific command for applying specific change sets
 * @param {string[]} changeSetIds - Array of change set IDs to apply
 * @param {Object} options - Command options
 */
export async function handleMigrateSpecific(changeSetIds, options = {}) {
  const engine = new MigrationEngine();
  return engine.runSpecificChangeSets(changeSetIds, options);
}

/**
 * Handle the check command for analyzing existing configurations
 */
export async function handleCheck() {
  const engine = new MigrationEngine();
  return engine.checkConfiguration();
}

/**
 * Handle the change-sets command for listing available change sets
 */
export async function handleChangeSets() {
  const engine = new MigrationEngine();
  const changeSets = engine.getAllChangeSets();
  
  console.log(chalk.blue('📋 Available Change Sets:\n'));
  
  changeSets.forEach(changeSet => {
    console.log(chalk.green(`🔧 ${changeSet.id}`));
    console.log(chalk.gray(`   ${changeSet.description}`));
    
    if (changeSet.tags && changeSet.tags.length > 0) {
      console.log(chalk.blue(`   Tags: ${changeSet.tags.join(', ')}`));
    }
    
    console.log();
  });
  
  console.log(chalk.yellow('💡 Usage examples:'));
  console.log(chalk.gray('   claude-devcontainer migrate-specific add-claude-mount'));
  console.log(chalk.gray('   claude-devcontainer migrate-specific update-image add-mcp-feature'));
  console.log(chalk.gray('   claude-devcontainer migrate --dry-run'));
}