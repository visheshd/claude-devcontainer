import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

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

    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch {
      console.error(chalk.red('❌ Not in a git repository'));
      process.exit(1);
    }

    // Get the main worktree path (first line of git worktree list)
    let mainWorktree;
    try {
      const worktreeList = execSync('git worktree list', { encoding: 'utf8', stdio: 'pipe' });
      mainWorktree = worktreeList.split('\n')[0].split(/\s+/)[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to get worktree list'));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }

    // Get the base directory name from the main worktree
    const gitRoot = path.basename(mainWorktree);

    // Create the worktree directory path
    const worktreePath = path.join('..', `${gitRoot}-${featureName}`);

    console.log(chalk.blue(`🚀 Creating worktree: ${worktreePath}`));

    try {
      if (branchRef) {
        // Fetch latest changes from remote (in case it's a remote branch)
        console.log(chalk.blue('📥 Fetching latest changes...'));
        execSync('git fetch', { stdio: 'pipe' });
        
        // Create worktree from the specified branch/tag/commit
        execSync(`git worktree add "${worktreePath}" -b "${featureName}" "${branchRef}"`, { stdio: 'pipe' });
        
        console.log(chalk.green(`✅ Created worktree at: ${worktreePath}`));
        console.log(chalk.green(`✅ Created branch: ${featureName} (from ${branchRef})`));
      } else {
        // Create worktree with a new branch from current HEAD
        execSync(`git worktree add "${worktreePath}" -b "${featureName}"`, { stdio: 'pipe' });
        
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