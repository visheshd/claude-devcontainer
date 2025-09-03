import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  isGitRepository,
  getAllWorktrees,
  getMergedBranches,
  getDockerArtifacts,
  cleanupDockerArtifacts,
  removeWorktree,
  printStatus,
  printSuccess,
  printWarning,
  printError,
  displayDockerArtifacts,
  checkDocker
} from '../core/cleanup-utils.js';

/**
 * Handle cleanup command with various modes
 */
export async function handleCleanup(worktreeName, options = {}) {
  // Validate git repository
  if (!isGitRepository()) {
    throw new Error('Not in a git repository');
  }
  
  const { list, interactive, merged, all, dryRun, force, verbose } = options;
  
  // Enable debug output if verbose mode
  if (verbose) {
    printStatus('Verbose mode enabled - showing detailed debug information');
  }
  
  try {
    // Handle list mode
    if (list) {
      return await listWorktreesAndArtifacts();
    }
    
    // Get all worktrees
    const allWorktrees = getAllWorktrees();
    
    if (allWorktrees.length === 0) {
      printStatus('No worktrees found in this repository');
      return;
    }
    
    // Filter worktrees based on mode
    let targetWorktrees = [];
    
    if (worktreeName) {
      // Clean specific worktree
      const target = allWorktrees.find(wt => 
        wt.name === worktreeName || 
        wt.path.endsWith(worktreeName) ||
        wt.branch === worktreeName
      );
      
      if (!target) {
        throw new Error(`Worktree '${worktreeName}' not found`);
      }
      
      targetWorktrees = [target];
    } else if (merged) {
      // Clean merged branches only
      if (verbose) {
        printStatus('Getting list of merged branches...');
      }
      
      const mergedBranches = getMergedBranches();
      
      if (verbose) {
        printStatus(`All worktrees found: ${allWorktrees.map(wt => `${wt.name} (${wt.branch || 'main repo'})`).join(', ')}`);
        printStatus(`Merged branches: ${mergedBranches.join(', ') || 'none'}`);
      }
      
      targetWorktrees = allWorktrees.filter(wt => 
        wt.branch && mergedBranches.includes(wt.branch)
      );
      
      if (verbose) {
        printStatus(`Worktrees matching merged branches: ${targetWorktrees.map(wt => wt.name).join(', ') || 'none'}`);
      }
      
      if (targetWorktrees.length === 0) {
        if (verbose) {
          printStatus('Debug: No worktree branches match the merged branches list');
        }
        printStatus('No worktrees found for merged branches');
        return;
      }
      
      printStatus(`Found ${targetWorktrees.length} worktrees for merged branches`);
    } else if (all) {
      // Clean all worktrees (excluding main repo)
      targetWorktrees = allWorktrees.filter(wt => wt.branch); // Exclude bare repo
    } else if (interactive) {
      // Interactive mode
      return await interactiveCleanup(allWorktrees, { dryRun, force });
    } else {
      // No specific mode, show help
      console.log(chalk.blue('🧹 Worktree Cleanup Help\\n'));
      console.log('Usage examples:');
      console.log('  cdc cleanup my-feature           # Clean specific worktree');
      console.log('  cdc cleanup --list               # List all worktrees and artifacts');
      console.log('  cdc cleanup --interactive        # Interactive cleanup');
      console.log('  cdc cleanup --merged             # Clean merged branches only');
      console.log('  cdc cleanup --all                # Clean all worktrees');
      console.log('  cdc cleanup --dry-run --merged   # Preview what would be cleaned');
      console.log('\\nOptions:');
      console.log('  --dry-run     Show what would be cleaned without doing it');
      console.log('  --force       Skip confirmation prompts');
      console.log('\\nFor more help: cdc cleanup --help');
      return;
    }
    
    // Process target worktrees
    await processWorktreeCleanup(targetWorktrees, { dryRun, force });
    
  } catch (error) {
    throw new Error(`Cleanup failed: ${error.message}`);
  }
}

/**
 * List all worktrees and their Docker artifacts
 */
async function listWorktreesAndArtifacts() {
  printStatus('Listing all worktrees and their Docker artifacts...');
  
  const worktrees = getAllWorktrees();
  const dockerAvailable = await checkDocker();
  
  if (worktrees.length === 0) {
    printStatus('No worktrees found');
    return;
  }
  
  console.log('\\n' + chalk.blue('📁 Git Worktrees:'));
  
  for (const worktree of worktrees) {
    const isMain = !worktree.branch; // Main repo doesn't have a branch
    console.log('\\n' + chalk.cyan(`${worktree.name}`) + 
                (isMain ? ' (main repository)' : ` (branch: ${worktree.branch})`));
    console.log(`   Path: ${worktree.path}`);
    
    if (!isMain && dockerAvailable) {
      console.log('   Docker artifacts:');
      const artifacts = await getDockerArtifacts(worktree.name);
      if (artifacts.found) {
        displayDockerArtifacts(artifacts);
      } else {
        console.log('     No Docker artifacts found');
      }
    }
  }
  
  if (!dockerAvailable) {
    console.log('\\n' + chalk.yellow('⚠️  Docker not available - cannot check for Docker artifacts'));
  }
  
  // Summary
  const nonMainWorktrees = worktrees.filter(wt => wt.branch);
  console.log('\\n' + chalk.blue('📊 Summary:'));
  console.log(`   Total worktrees: ${worktrees.length}`);
  console.log(`   Feature branches: ${nonMainWorktrees.length}`);
  
  if (nonMainWorktrees.length > 0) {
    console.log('\\n' + chalk.blue('💡 Next steps:'));
    console.log('   • Use "cdc cleanup --interactive" to selectively clean up');
    console.log('   • Use "cdc cleanup --merged" to clean merged branches');
    console.log('   • Use "cdc cleanup <worktree-name>" to clean a specific worktree');
  }
}

/**
 * Interactive cleanup mode
 */
async function interactiveCleanup(allWorktrees, options = {}) {
  const nonMainWorktrees = allWorktrees.filter(wt => wt.branch);
  
  if (nonMainWorktrees.length === 0) {
    printStatus('No feature branch worktrees found to clean up');
    return;
  }
  
  // Show Docker artifacts for each worktree
  const worktreesWithArtifacts = [];
  for (const worktree of nonMainWorktrees) {
    const artifacts = await getDockerArtifacts(worktree.name);
    worktreesWithArtifacts.push({
      ...worktree,
      artifacts,
      displayName: `${worktree.name} (${worktree.branch})${artifacts.found ? ' 🐳' : ''}`
    });
  }
  
  console.log('\\n' + chalk.blue('🧹 Interactive Worktree Cleanup'));
  console.log('Select worktrees to clean up (🐳 = has Docker artifacts):\\n');
  
  const choices = worktreesWithArtifacts.map(wt => ({
    name: wt.displayName,
    value: wt,
    checked: false
  }));
  
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedWorktrees',
      message: 'Which worktrees would you like to clean up?',
      choices,
      pageSize: 10
    }
  ]);
  
  if (answers.selectedWorktrees.length === 0) {
    printStatus('No worktrees selected for cleanup');
    return;
  }
  
  await processWorktreeCleanup(answers.selectedWorktrees, options);
}

/**
 * Process cleanup for selected worktrees
 */
async function processWorktreeCleanup(targetWorktrees, options = {}) {
  const { dryRun, force } = options;
  
  if (targetWorktrees.length === 0) {
    printStatus('No worktrees to clean up');
    return;
  }
  
  console.log('\\n' + chalk.blue(`🧹 ${dryRun ? 'Preview' : 'Processing'} cleanup for ${targetWorktrees.length} worktree(s):`));
  
  let totalCleaned = 0;
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < targetWorktrees.length; i++) {
    const worktree = targetWorktrees[i];
    const isLast = i === targetWorktrees.length - 1;
    
    console.log('\\n' + chalk.cyan(`[${i + 1}/${targetWorktrees.length}] ${worktree.name}`) + 
                ` (branch: ${worktree.branch})`);
    console.log(`   Path: ${worktree.path}`);
    
    // Get Docker artifacts
    const artifacts = await getDockerArtifacts(worktree.name);
    
    if (artifacts.found) {
      console.log('   Docker artifacts to ' + (dryRun ? 'be cleaned' : 'clean') + ':');
      displayDockerArtifacts(artifacts);
    } else {
      console.log('   No Docker artifacts found');
    }
    
    // Confirmation (unless force mode or dry run)
    let shouldProceed = force || dryRun;
    
    if (!shouldProceed) {
      console.log('');
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Remove worktree '${worktree.name}' and its Docker artifacts?`,
          default: false
        }
      ]);
      shouldProceed = answer.proceed;
    }
    
    if (shouldProceed) {
      if (dryRun) {
        printStatus(`Would remove worktree: ${worktree.name}`);
        if (artifacts.found) {
          const summary = [
            artifacts.containers.length && `${artifacts.containers.length} containers`,
            artifacts.images.length && `${artifacts.images.length} images`,
            artifacts.volumes.length && `${artifacts.volumes.length} volumes`,
            artifacts.networks.length && `${artifacts.networks.length} networks`
          ].filter(Boolean).join(', ');
          printStatus(`Would clean Docker artifacts: ${summary}`);
        }
        successCount++;
      } else {
        // Actually perform cleanup
        let worktreeRemoved = false;
        let dockerCleaned = false;
        
        // Remove worktree first
        const worktreeResult = removeWorktree(worktree.path);
        if (worktreeResult.success) {
          printSuccess(`✅ Removed worktree: ${worktree.name}`);
          worktreeRemoved = true;
        } else {
          printError(`Failed to remove worktree: ${worktreeResult.error}`);
        }
        
        // Clean Docker artifacts
        if (artifacts.found) {
          const dockerResult = await cleanupDockerArtifacts(worktree.name);
          if (dockerResult.success && dockerResult.cleaned > 0) {
            totalCleaned += dockerResult.cleaned;
            dockerCleaned = true;
          }
        }
        
        if (worktreeRemoved && (dockerCleaned || !artifacts.found)) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    } else {
      printStatus(`Skipped worktree: ${worktree.name}`);
    }
    
    // Add separator between worktrees (except for last one)
    if (!isLast) {
      console.log(chalk.dim('─'.repeat(60)));
    }
  }
  
  // Final summary
  console.log('\\n' + chalk.blue('📊 Cleanup Summary:'));
  if (dryRun) {
    console.log(`   Would clean: ${successCount} worktrees`);
  } else {
    console.log(`   Successfully cleaned: ${successCount} worktrees`);
    if (failureCount > 0) {
      console.log(`   Failed: ${failureCount} worktrees`);
    }
    if (totalCleaned > 0) {
      console.log(`   Total Docker artifacts removed: ${totalCleaned}`);
    }
  }
  
  if (successCount > 0) {
    const message = dryRun ? 
      'Dry run completed! Use without --dry-run to actually clean up.' :
      'Cleanup completed successfully!';
    printSuccess(message);
  }
}