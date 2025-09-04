import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { generateWorktreePath, loadWorktreeConfig } from '../core/worktree-config.js';
import { safeGitExec, validateFeatureName, validateWorktreePath } from '../core/secure-shell.js';

/**
 * Handle the wt (worktree) command for creating new worktrees
 * Ports the functionality from /Users/visheshd/Work/shellbox/scripts/wt
 * @param {string} featureName - Name for the new worktree and local branch
 * @param {string} branchRef - Optional branch/tag/commit to base worktree on
 */
export async function handleWt(featureName, branchRef = null) {
  try {
    // Validate feature name
    if (!featureName) {
      console.error(chalk.red('❌ Feature name is required'));
      console.log(chalk.gray('Usage: wt <feature-name> [branch-ref]'));
      console.log(chalk.gray('Creates a new git worktree for the given feature'));
      console.log(chalk.gray('  <feature-name> - Name for the new worktree and local branch'));
      console.log(chalk.gray('  [branch-ref]   - Optional branch/tag/commit to base worktree on'));
      console.log(chalk.gray('                   Examples: origin/main, develop, v1.2.3, abc123'));
      process.exit(1);
    }
    
    // Validate feature name for security
    validateFeatureName(featureName);

    // Check if we're in a git repository using secure execution
    try {
      safeGitExec('rev-parse', ['--git-dir'], { stdio: 'pipe' });
    } catch {
      console.error(chalk.red('❌ Not in a git repository'));
      process.exit(1);
    }

    // Get the main worktree path (first line of git worktree list)
    let mainWorktree;
    try {
      const worktreeList = safeGitExec('worktree', ['list'], { encoding: 'utf8', stdio: 'pipe' });
      mainWorktree = worktreeList.split('\n')[0].split(/\s+/)[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to get worktree list'));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }

    // Load worktree configuration
    const config = loadWorktreeConfig();
    
    // Get the base directory name from the main worktree
    const gitRoot = path.basename(mainWorktree);

    // Generate worktree path using configuration  
    const worktreePath = generateWorktreePath(featureName, gitRoot, config);
    
    // Validate the generated path for security
    validateWorktreePath(worktreePath);

    console.log(chalk.blue(`🚀 Creating worktree: ${worktreePath}`));

    try {
      if (branchRef) {
        // Validate branch reference
        validateFeatureName(branchRef); // Use same validation for branch refs
        
        // Fetch latest changes from remote (in case it's a remote branch)
        console.log(chalk.blue('📥 Fetching latest changes...'));
        safeGitExec('fetch', [], { stdio: 'pipe' });
        
        // Create worktree from the specified branch/tag/commit
        safeGitExec('worktree', ['add', worktreePath, '-b', featureName, branchRef], { stdio: 'pipe' });
        
        console.log(chalk.green(`✅ Created worktree at: ${worktreePath}`));
        console.log(chalk.green(`✅ Created branch: ${featureName} (from ${branchRef})`));
      } else {
        // Create worktree with a new branch from current HEAD
        safeGitExec('worktree', ['add', worktreePath, '-b', featureName], { stdio: 'pipe' });
        
        console.log(chalk.green(`✅ Created worktree at: ${worktreePath}`));
        console.log(chalk.green(`✅ Created branch: ${featureName}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to create worktree'));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }

    // Copy .env file if it exists in the main worktree
    const mainEnvFile = path.join(mainWorktree, '.env');
    const worktreeEnvFile = path.join(worktreePath, '.env');
    
    if (fs.existsSync(mainEnvFile)) {
      try {
        fs.copyFileSync(mainEnvFile, worktreeEnvFile);
        console.log(chalk.blue('📋 Copied .env file from main worktree'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Failed to copy .env file'));
        console.log(chalk.gray(error.message));
      }
    }

    // Update devcontainer.json with containerEnv for worktree
    const devcontainerPath = path.join(worktreePath, '.devcontainer/devcontainer.json');
    if (fs.existsSync(devcontainerPath)) {
      try {
        console.log(chalk.blue('🔧 Configuring devcontainer for worktree...'));
        
        // Read existing devcontainer.json
        const devcontainerConfig = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
        
        // Add/update containerEnv with all required worktree environment variables
        if (!devcontainerConfig.containerEnv) {
          devcontainerConfig.containerEnv = {};
        }
        
        // Set all worktree environment variables needed by git-wrapper.sh
        devcontainerConfig.containerEnv.WORKTREE_DETECTED = "true";
        devcontainerConfig.containerEnv.WORKTREE_HOST_MAIN_REPO = mainWorktree;
        devcontainerConfig.containerEnv.WORKTREE_MOUNT_PATH = "/main-repo";
        devcontainerConfig.containerEnv.WORKTREE_NAME = path.basename(worktreePath);
        
        // Write back the updated configuration
        fs.writeFileSync(devcontainerPath, JSON.stringify(devcontainerConfig, null, 2));
        
        // Mark devcontainer.json as assumed unchanged to prevent dirty worktree
        try {
          safeGitExec('update-index', ['--assume-unchanged', '.devcontainer/devcontainer.json'], { 
            stdio: 'pipe',
            cwd: worktreePath 
          });
          console.log(chalk.green('✅ DevContainer configured with worktree environment'));
          console.log(chalk.gray(`  • WORKTREE_HOST_MAIN_REPO=${mainWorktree}`));
          console.log(chalk.gray(`  • WORKTREE_MOUNT_PATH=/main-repo`));
          console.log(chalk.gray(`  • WORKTREE_NAME=${path.basename(worktreePath)}`));
          console.log(chalk.gray(`  • WORKTREE_DETECTED=true`));
        } catch (gitError) {
          console.log(chalk.yellow('⚠️  DevContainer configured but could not mark as unchanged'));
          console.log(chalk.gray(`  • ${gitError.message}`));
        }
        
      } catch (error) {
        console.log(chalk.yellow('⚠️  Failed to configure devcontainer'));
        console.log(chalk.gray(error.message));
      }
    }

    console.log(chalk.blue(`📁 Switching to worktree: ${worktreePath}`));

    // Output the cd command for shell integration (like original script)
    // This allows users to do: eval $(cdc wt feature-name)
    const absoluteWorktreePath = path.resolve(worktreePath);
    console.log(`cd "${absoluteWorktreePath}"`);

  } catch (error) {
    console.error(chalk.red(`❌ Worktree creation failed: ${error.message}`));
    process.exit(1);
  }
}