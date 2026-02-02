import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Execute post-creation hooks in the worktree directory
 * @param {string} worktreePath - Path to the newly created worktree
 * @param {Object} hookConfig - Hook configuration object
 */
export function executePostCreationHooks(worktreePath, hookConfig) {
  if (!hookConfig?.enabled) {
    return;
  }

  console.log(chalk.blue('\n🔨 Running post-creation hooks...'));

  const commands = Array.isArray(hookConfig.commands)
    ? hookConfig.commands
    : [hookConfig.commands];

  const continueOnError = hookConfig.continueOnError ?? true;
  const timeout = hookConfig.timeout ?? 300000;
  const env = { ...process.env, ...hookConfig.env };

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(chalk.gray(`  ▶ Running: ${cmd}`));

    try {
      execSync(cmd, {
        cwd: worktreePath,
        stdio: 'inherit',
        timeout: timeout,
        env: env,
        shell: true
      });

      console.log(chalk.green(`  ✅ Success: ${cmd}`));
    } catch (error) {
      console.log(chalk.red(`  ❌ Failed: ${cmd}`));
      console.log(chalk.red(`     Error: ${error.message}`));

      if (!continueOnError) {
        console.log(chalk.yellow('\n⚠️  Stopping hook execution due to error'));
        throw error;
      }
    }
  }

  console.log(chalk.green('✅ Post-creation hooks complete\n'));
}
