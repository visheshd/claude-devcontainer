import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationEngine } from '../migrations/MigrationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Install post-merge git hook for integrated worktree and Docker cleanup
 */
async function installPostMergeHook() {
  try {
    // Check if we're in a git repository
    const gitDir = '.git';
    try {
      await fs.access(gitDir);
    } catch {
      console.log(chalk.yellow('⚠️  Not in a git repository, skipping post-merge hook installation'));
      return;
    }

    // Ensure hooks directory exists
    const hooksDir = path.join(gitDir, 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });

    // Path to our hook template - adjusted to point to the correct location
    const hookTemplatePath = path.resolve(__dirname, '../../../../templates/hooks/post-merge');
    const hookDestPath = path.join(hooksDir, 'post-merge');

    // Check if hook template exists
    try {
      await fs.access(hookTemplatePath);
    } catch {
      console.log(chalk.yellow('⚠️  Post-merge hook template not found, skipping installation'));
      return;
    }

    // Check if hook already exists
    let hookExists = false;
    try {
      await fs.access(hookDestPath);
      hookExists = true;
    } catch {
      // Hook doesn't exist, which is fine
    }

    if (hookExists) {
      // Read existing hook to check if it's ours
      const existingHook = await fs.readFile(hookDestPath, 'utf8');
      if (existingHook.includes('integrated worktree removal and Docker cleanup')) {
        console.log(chalk.blue('ℹ️  Post-merge hook already installed'));
        return;
      } else {
        console.log(chalk.yellow('⚠️  Existing post-merge hook found, skipping installation to avoid conflicts'));
        console.log(chalk.gray('   Manual installation: cp templates/hooks/post-merge .git/hooks/'));
        return;
      }
    }

    // Copy the hook template
    await fs.copyFile(hookTemplatePath, hookDestPath);
    
    // Make the hook executable
    await fs.chmod(hookDestPath, 0o755);

    console.log(chalk.green('✅ Installed post-merge hook for worktree and Docker cleanup'));
    console.log(chalk.gray('   The hook will prompt to remove worktrees and Docker artifacts after merges'));
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Failed to install post-merge hook: ${error.message}`));
    console.log(chalk.gray('   Manual installation: cp templates/hooks/post-merge .git/hooks/'));
  }
}

/**
 * Load DevContainer configuration from current directory
 * @returns {Promise<Object>} - DevContainer configuration
 */
async function loadDevContainerConfig() {
  const configPath = path.join(process.cwd(), '.devcontainer', 'devcontainer.json');
  
  if (!await fs.pathExists(configPath)) {
    throw new Error('No devcontainer.json found in .devcontainer/ directory. Run this command from a project root with an existing DevContainer configuration.');
  }
  
  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    // Remove JSON comments before parsing
    const cleanContent = configContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return JSON.parse(cleanContent);
  } catch (error) {
    throw new Error(`Failed to parse devcontainer.json: ${error.message}`);
  }
}

/**
 * Handle the migrate command for upgrading existing DevContainer configurations
 * @param {Object} options - Command options
 */
export async function handleMigrate(options = {}) {
  const engine = new MigrationEngine();
  const config = await loadDevContainerConfig();
  
  console.log(chalk.blue('🔄 Analyzing DevContainer configuration...\n'));
  
  const migrateOptions = {
    interactive: !options.auto,
    dryRun: options.dryRun,
    autoApprove: options.auto
  };
  
  const results = await engine.migrate(config, migrateOptions);
  
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Preview Mode - No changes applied\n'));
    if (results.previews && results.previews.length > 0) {
      results.previews.forEach(preview => {
        console.log(chalk.green(`🔧 ${preview.name}`));
        console.log(chalk.gray(`   ${preview.description}`));
        if (preview.preview.summary) {
          console.log(chalk.cyan(`   ${preview.preview.summary}`));
        }
        console.log();
      });
    }
    console.log(chalk.blue('Run without --dry-run to apply these changes.'));
  } else {
    if (results.message) {
      console.log(chalk.green(`✅ ${results.message}`));
      return results;
    }
    
    if (results.applied.length > 0) {
      console.log(chalk.green(`\n✅ Successfully applied ${results.applied.length} migration(s):`));
      results.applied.forEach(change => {
        console.log(chalk.green(`   • ${change.name}`));
      });
    }
    
    if (results.skipped.length > 0) {
      console.log(chalk.yellow(`\n⏭️  Skipped ${results.skipped.length} migration(s):`));
      results.skipped.forEach(change => {
        console.log(chalk.yellow(`   • ${change.name} (${change.reason})`));
      });
    }
    
    if (results.errors.length > 0) {
      console.log(chalk.red(`\n❌ Failed to apply ${results.errors.length} migration(s):`));
      results.errors.forEach(error => {
        console.log(chalk.red(`   • ${error.name}: ${error.error}`));
      });
    }
    
    // Write the updated configuration back to file
    if (results.applied.length > 0) {
      const configPath = path.join(process.cwd(), '.devcontainer', 'devcontainer.json');
      await fs.writeFile(configPath, JSON.stringify(results.config, null, 2));
      console.log(chalk.blue('\n📝 Updated .devcontainer/devcontainer.json'));
    }

    // Install post-merge hook for integrated worktree and Docker cleanup
    await installPostMergeHook();
  }
  
  return results;
}

/**
 * Handle the migrate-specific command for applying specific change sets
 * @param {string[]} changeSetIds - Array of change set IDs to apply
 * @param {Object} options - Command options
 */
export async function handleMigrateSpecific(changeSetIds, options = {}) {
  const engine = new MigrationEngine();
  const config = await loadDevContainerConfig();
  
  console.log(chalk.blue(`🔄 Applying specific change sets: ${changeSetIds.join(', ')}\n`));
  
  const migrateOptions = {
    interactive: !options.auto,
    dryRun: options.dryRun,
    autoApprove: options.auto,
    changeSetIds
  };
  
  const results = await engine.migrate(config, migrateOptions);
  
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Preview Mode - No changes applied\n'));
    if (results.previews && results.previews.length > 0) {
      results.previews.forEach(preview => {
        console.log(chalk.green(`🔧 ${preview.name}`));
        console.log(chalk.gray(`   ${preview.description}`));
        if (preview.preview.summary) {
          console.log(chalk.cyan(`   ${preview.preview.summary}`));
        }
        console.log();
      });
    }
  } else {
    if (results.applied.length > 0) {
      console.log(chalk.green(`\n✅ Successfully applied ${results.applied.length} change set(s):`));
      results.applied.forEach(change => {
        console.log(chalk.green(`   • ${change.name}`));
      });
      
      // Write the updated configuration back to file
      const configPath = path.join(process.cwd(), '.devcontainer', 'devcontainer.json');
      await fs.writeFile(configPath, JSON.stringify(results.config, null, 2));
      console.log(chalk.blue('\n📝 Updated .devcontainer/devcontainer.json'));
    }
    
    if (results.errors.length > 0) {
      console.log(chalk.red(`\n❌ Failed to apply ${results.errors.length} change set(s):`));
      results.errors.forEach(error => {
        console.log(chalk.red(`   • ${error.name}: ${error.error}`));
      });
    }
  }
  
  return results;
}

/**
 * Handle the check command for analyzing existing configurations
 */
export async function handleCheck() {
  const engine = new MigrationEngine();
  const config = await loadDevContainerConfig();
  
  console.log(chalk.blue('🔍 Analyzing DevContainer configuration...\n'));
  
  const analysis = await engine.analyze(config);
  
  console.log(chalk.blue('📊 Configuration Analysis:\n'));
  
  if (analysis.isUpToDate) {
    console.log(chalk.green('✅ Configuration is up to date - no migrations needed!'));
    console.log(chalk.gray(`   Evaluated ${analysis.totalChangeSets} available change sets`));
  } else {
    console.log(chalk.yellow(`⚠️  Found ${analysis.neededChangeSets.length} recommended migration(s):\n`));
    
    analysis.issues.forEach((issue, index) => {
      console.log(chalk.red(`${index + 1}. ${issue.name}`));
      console.log(chalk.gray(`   ${issue.description}`));
      if (issue.preview.summary) {
        console.log(chalk.cyan(`   ${issue.preview.summary}`));
      }
      console.log();
    });
    
    console.log(chalk.blue('💡 To apply these migrations:'));
    console.log(chalk.gray('   claude-devcontainer migrate --dry-run  # Preview changes'));
    console.log(chalk.gray('   claude-devcontainer migrate            # Apply changes'));
  }
  
  return analysis;
}

/**
 * Handle the change-sets command for listing available change sets
 */
export async function handleChangeSets() {
  const engine = new MigrationEngine();
  const changeSets = await engine.registry.getAllChangeSets();
  
  console.log(chalk.blue('📋 Available Change Sets:\n'));
  
  changeSets.forEach(changeSet => {
    console.log(chalk.green(`🔧 ${changeSet.id}`));
    console.log(chalk.gray(`   ${changeSet.description}`));
    
    if (changeSet.version) {
      console.log(chalk.blue(`   Version: ${changeSet.version}`));
    }
    
    if (changeSet.dependencies && changeSet.dependencies.length > 0) {
      console.log(chalk.blue(`   Dependencies: ${changeSet.dependencies.join(', ')}`));
    }
    
    console.log();
  });
  
  console.log(chalk.yellow('💡 Usage examples:'));
  console.log(chalk.gray('   claude-devcontainer migrate-specific update-image'));
  console.log(chalk.gray('   claude-devcontainer migrate-specific update-image add-mcp-servers'));
  console.log(chalk.gray('   claude-devcontainer migrate --dry-run'));
}