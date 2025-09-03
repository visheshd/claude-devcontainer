import { execSync, spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import { generateDockerArtifactNames, loadWorktreeConfig } from './worktree-config.js';
import { safeGitExec } from './secure-shell.js';
import { 
  safeDockerPs, 
  safeDockerImages, 
  safeDockerVolumeList, 
  safeDockerNetworkList,
  safeDockerRemove,
  checkDockerSafely
} from './docker-safe.js';
import { cleanupLogger, dockerLogger, gitLogger } from './shared-logging.js';

/**
 * Utility functions for worktree and Docker cleanup
 * Shared between CLI cleanup command and git post-merge hook
 */

// Re-export logging functions for backward compatibility
export function printStatus(message) {
  cleanupLogger.info(message);
}

export function printSuccess(message) {
  cleanupLogger.success(message);
}

export function printWarning(message) {
  cleanupLogger.warning(message);
}

export function printError(message) {
  cleanupLogger.error(message);
}

/**
 * Check if Docker is available and accessible
 */
export async function checkDocker() {
  return checkDockerSafely();
}

/**
 * Get all git worktrees with their branch information
 * Uses Git's worktree list order as single source of truth:
 * - First worktree is ALWAYS the main repository
 * - Subsequent worktrees are additional worktrees created with `git worktree add`
 */
export function getAllWorktrees() {
  try {
    const output = safeGitExec('worktree', ['list', '--porcelain'], { encoding: 'utf8' });
    const worktrees = [];
    let currentWorktree = {};
    
    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('worktree ')) {
        // Save previous worktree if exists
        if (currentWorktree.path) {
          worktrees.push(currentWorktree);
        }
        // Start new worktree
        currentWorktree = {
          path: trimmed.replace('worktree ', ''),
          name: null,
          branch: null,
          head: null,
          isMainRepo: false // Will be set to true for first worktree
        };
      } else if (trimmed.startsWith('branch ')) {
        currentWorktree.branch = trimmed.replace('branch refs/heads/', '');
      } else if (trimmed.startsWith('HEAD ')) {
        currentWorktree.head = trimmed.replace('HEAD ', '');
      }
    }
    
    // Add the last worktree
    if (currentWorktree.path) {
      worktrees.push(currentWorktree);
    }
    
    // Mark the first worktree as the main repository (single source of truth)
    if (worktrees.length > 0) {
      worktrees[0].isMainRepo = true;
      gitLogger.info(`Main repository identified: ${worktrees[0].path}`);
    }
    
    // Add worktree names (basename of path) and log additional worktrees
    worktrees.forEach((wt, index) => {
      wt.name = wt.path.split('/').pop();
      if (!wt.isMainRepo) {
        gitLogger.info(`Additional worktree found: ${wt.name} at ${wt.path} (branch: ${wt.branch || 'unknown'})`);
      }
    });
    
    const additionalWorktrees = worktrees.filter(wt => !wt.isMainRepo);
    gitLogger.info(`Total: ${worktrees.length} worktrees (1 main repo + ${additionalWorktrees.length} additional)`);
    
    return worktrees;
  } catch (error) {
    throw new Error(`Failed to get worktrees: ${error.message}`);
  }
}

/**
 * Get merged branches (branches that are merged into main/master)
 */
export function getMergedBranches() {
  try {
    // Get the default branch name with multiple fallback strategies
    let defaultBranch;
    
    // Strategy 1: Try git symbolic-ref for remote HEAD
    try {
      defaultBranch = safeGitExec('symbolic-ref', ['refs/remotes/origin/HEAD'], { encoding: 'utf8' })
        .replace('refs/remotes/origin/', '').trim();
      printStatus(`Found default branch from remote HEAD: ${defaultBranch}`);
    } catch {
      // Strategy 2: Try current branch if we're on main/master
      try {
        const currentBranch = safeGitExec('rev-parse', ['--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
        if (currentBranch === 'main' || currentBranch === 'master') {
          defaultBranch = currentBranch;
          printStatus(`Using current branch as default: ${defaultBranch}`);
        }
      } catch {
        // Ignore and continue to next strategy
      }
    }
    
    // Strategy 3: Check for 'main' branch existence
    if (!defaultBranch) {
      try {
        safeGitExec('show-ref', ['--verify', '--quiet', 'refs/heads/main'], { stdio: 'ignore' });
        defaultBranch = 'main';
        printStatus(`Found 'main' branch, using as default`);
      } catch {
        // Strategy 4: Check for 'master' branch existence  
        try {
          safeGitExec('show-ref', ['--verify', '--quiet', 'refs/heads/master'], { stdio: 'ignore' });
          defaultBranch = 'master';
          printStatus(`Found 'master' branch, using as default`);
        } catch {
          // Strategy 5: Use the first branch we can find
          try {
            const branches = safeGitExec('branch', [], { encoding: 'utf8' })
              .split('\n')
              .map(line => line.trim().replace(/^\* /, ''))
              .filter(line => line && line !== '(no branch)');
            
            if (branches.length > 0) {
              defaultBranch = branches[0];
              printWarning(`No main/master branch found, using first available: ${defaultBranch}`);
            }
          } catch {
            throw new Error('Unable to determine default branch - no branches found in repository');
          }
        }
      }
    }
    
    if (!defaultBranch) {
      throw new Error('Unable to determine default branch for merge detection');
    }
    
    // Get merged branches
    try {
      const output = safeGitExec('branch', ['--merged', defaultBranch], { encoding: 'utf8' });
      const branches = output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('*') && line !== defaultBranch)
        .map(line => line.replace(/^[*\+]\s*/, '')); // Clean up *, +, and whitespace prefixes
      
      printStatus(`Found ${branches.length} branches merged into ${defaultBranch}: ${branches.join(', ') || 'none'}`);
      return branches;
    } catch (error) {
      printWarning(`Failed to get merged branches for ${defaultBranch}: ${error.message}`);
      return []; // Return empty array instead of throwing
    }
    
  } catch (error) {
    printError(`Failed to get merged branches: ${error.message}`);
    return []; // Return empty array instead of throwing to allow cleanup to continue
  }
}

/**
 * Get Docker artifacts for a specific worktree name
 */
export async function getDockerArtifacts(worktreeName) {
  if (!await checkDocker()) {
    return { found: false, containers: [], images: [], volumes: [], networks: [] };
  }
  
  // Load configuration for artifact naming patterns
  const config = loadWorktreeConfig();
  const patterns = generateDockerArtifactNames(worktreeName, config);
  
  const artifacts = {
    found: false,
    containers: [],
    images: [],
    volumes: [],
    networks: []
  };
  
  try {
    // Check for containers
    const containers = safeDockerPs(
      [{ key: 'name', value: patterns.containerPattern }],
      '{{.Names}}'
    ).trim();
    if (containers) {
      artifacts.containers = containers.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for images
    const images = safeDockerImages(
      [{ key: 'reference', value: patterns.imagePattern }],
      '{{.Repository}}:{{.Tag}}'
    ).trim();
    if (images) {
      artifacts.images = images.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for volumes
    const volumes = safeDockerVolumeList(
      [{ key: 'name', value: patterns.volumePattern }],
      '{{.Name}}'
    ).trim();
    if (volumes) {
      artifacts.volumes = volumes.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for networks
    const networks = safeDockerNetworkList(
      [{ key: 'name', value: patterns.networkPattern }],
      '{{.Name}}'
    ).trim();
    if (networks) {
      artifacts.networks = networks.split('\n').filter(n => 
        n && !['bridge', 'host', 'none'].includes(n)
      );
      if (artifacts.networks.length > 0) {
        artifacts.found = true;
      }
    }
  } catch (error) {
    // Docker command failed, but we'll continue
    printWarning(`Failed to check Docker artifacts: ${error.message}`);
  }
  
  return artifacts;
}

/**
 * Clean up Docker artifacts for a specific worktree
 */
export async function cleanupDockerArtifacts(worktreeName, dryRun = false) {
  if (!await checkDocker(true)) {
    printWarning('Docker not available, skipping Docker cleanup');
    return { success: false, cleaned: 0 };
  }
  
  // Load configuration for artifact naming patterns
  const config = loadWorktreeConfig();
  const patterns = generateDockerArtifactNames(worktreeName, config);
  
  let totalCleaned = 0;
  const results = {
    containers: 0,
    images: 0,
    volumes: 0,
    networks: 0
  };
  
  try {
    // Remove containers
    const containers = safeDockerPs(
      [{ key: 'name', value: patterns.containerPattern }],
      '{{.ID}}'
    ).trim();
    
    if (containers) {
      const containerIds = containers.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${containerIds.length} containers`);
      } else {
        safeDockerRemove('rm', containerIds, { stdio: 'ignore' });
        results.containers = containerIds.length;
        totalCleaned += containerIds.length;
        printSuccess(`✓ Removed ${containerIds.length} containers`);
      }
    }
    
    // Remove images
    const images = safeDockerImages(
      [{ key: 'reference', value: patterns.imagePattern }],
      '{{.ID}}'
    ).trim();
    
    if (images) {
      const imageIds = images.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${imageIds.length} images`);
      } else {
        safeDockerRemove('rmi', imageIds, { stdio: 'ignore' });
        results.images = imageIds.length;
        totalCleaned += imageIds.length;
        printSuccess(`✓ Removed ${imageIds.length} images`);
      }
    }
    
    // Remove volumes
    const volumes = safeDockerVolumeList(
      [{ key: 'name', value: patterns.volumePattern }],
      '{{.Name}}'
    ).trim();
    
    if (volumes) {
      const volumeNames = volumes.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${volumeNames.length} volumes`);
      } else {
        safeDockerRemove('volume', volumeNames, { stdio: 'ignore' });
        results.volumes = volumeNames.length;
        totalCleaned += volumeNames.length;
        printSuccess(`✓ Removed ${volumeNames.length} volumes`);
      }
    }
    
    // Remove networks
    const networks = safeDockerNetworkList(
      [{ key: 'name', value: patterns.networkPattern }],
      '{{.Name}}'
    ).trim();
    
    if (networks) {
      const networkNames = networks.split('\n').filter(n => 
        n && !['bridge', 'host', 'none'].includes(n)
      );
      if (networkNames.length > 0) {
        if (dryRun) {
          printStatus(`Would remove ${networkNames.length} networks`);
        } else {
          safeDockerRemove('network', networkNames, { stdio: 'ignore' });
          results.networks = networkNames.length;
          totalCleaned += networkNames.length;
          printSuccess(`✓ Removed ${networkNames.length} networks`);
        }
      }
    }
    
    if (!dryRun && totalCleaned > 0) {
      printSuccess(`Cleaned up ${totalCleaned} Docker artifacts`);
    } else if (!dryRun) {
      printStatus('No Docker artifacts found to clean up');
    }
    
    return { success: true, cleaned: totalCleaned, details: results };
    
  } catch (error) {
    printError(`Failed to clean Docker artifacts: ${error.message}`);
    return { success: false, cleaned: totalCleaned, details: results };
  }
}

/**
 * Remove a git worktree
 * @param {string} worktreePath - Path to the worktree to remove
 * @param {boolean} dryRun - Whether this is a dry run
 * @param {string} gitRoot - Optional git repository root (will be auto-detected if not provided)
 * @param {boolean} force - Whether to force removal even if worktree has changes
 * @returns {Object} Result object with success status and details
 */
export function removeWorktree(worktreePath, dryRun = false, gitRoot = null, force = false) {
  try {
    if (dryRun) {
      printStatus(`Would remove worktree: ${worktreePath}`);
      return { success: true };
    }
    
    // Additional safety check: Verify this is not the main repository by checking all worktrees
    const allWorktrees = getAllWorktrees();
    const mainRepo = allWorktrees.find(wt => wt.isMainRepo);
    if (mainRepo && worktreePath === mainRepo.path) {
      throw new Error(`CRITICAL SAFETY ERROR: Attempted to remove main repository at ${worktreePath}! This operation is forbidden.`);
    }
    
    gitLogger.info(`Removing worktree: ${worktreePath}`);
    
    // Use provided gitRoot or try to detect it
    if (!gitRoot) {
      try {
        gitRoot = getGitRepositoryRoot();
        gitLogger.info(`Auto-detected git repository root: ${gitRoot}`);
      } catch (error) {
        gitLogger.error(`Cannot determine git repository root: ${error.message}`);
        throw error;
      }
    } else {
      gitLogger.info(`Using provided git repository root: ${gitRoot}`);
    }
    
    // Build command arguments
    const args = ['remove'];
    if (force) {
      args.push('--force');
      gitLogger.info(`Force removal enabled for worktree: ${worktreePath}`);
    }
    args.push(worktreePath);
    
    // Execute the git worktree remove command from the repository root
    const result = safeGitExec('worktree', args, { 
      encoding: 'utf8',
      cwd: gitRoot,
      timeout: 60000 // Increase timeout to 60 seconds for worktree operations
    });
    
    gitLogger.info(`Worktree removal completed: ${worktreePath}`);
    return { success: true, output: result };
  } catch (error) {
    gitLogger.error(`Failed to remove worktree ${worktreePath}: ${error.message}`);
    
    // Check if the error is due to dirty worktree
    if (error.message.includes('contains modified or untracked files')) {
      return { 
        success: false, 
        error: error.message,
        requiresForce: true,
        isDirty: true
      };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Check if we're in a git repository
 */
export function isGitRepository() {
  try {
    safeGitExec('rev-parse', ['--git-dir'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if we're in the main repository directory (not a worktree)
 * Uses Git's official path resolution to compare git-dir and git-common-dir
 * Main repository: --git-dir === --git-common-dir
 * Worktree: --git-dir !== --git-common-dir
 */
export function isInMainRepository() {
  try {
    const gitDir = safeGitExec('rev-parse', ['--git-dir'], { encoding: 'utf8' }).trim();
    const commonDir = safeGitExec('rev-parse', ['--git-common-dir'], { encoding: 'utf8' }).trim();
    
    const isMainRepo = gitDir === commonDir;
    
    gitLogger.info(`Git path comparison: git-dir='${gitDir}', common-dir='${commonDir}' - ${isMainRepo ? 'main repository' : 'worktree'}`);
    return isMainRepo;
    
  } catch (error) {
    gitLogger.error(`Failed to check repository structure: ${error.message}`);
    return false;
  }
}

/**
 * Get the main repository path using Git's official path resolution
 * Uses --git-common-dir to find the shared Git directory, then gets its parent
 */
export function getMainRepositoryPath() {
  try {
    const commonDir = safeGitExec('rev-parse', ['--git-common-dir'], { encoding: 'utf8' }).trim();
    
    // Convert relative path to absolute if needed
    const absoluteCommonDir = path.resolve(commonDir);
    
    // The main repository directory is the parent of the .git directory
    const mainRepoPath = path.dirname(absoluteCommonDir);
    
    gitLogger.info(`Main repository path determined: ${mainRepoPath} (from git-common-dir: ${commonDir})`);
    return mainRepoPath;
    
  } catch (error) {
    throw new Error(`Failed to determine main repository path: ${error.message}`);
  }
}

/**
 * Get the git repository root directory
 */
export function getGitRepositoryRoot() {
  try {
    const root = safeGitExec('rev-parse', ['--show-toplevel'], { encoding: 'utf8' }).trim();
    return root;
  } catch (error) {
    throw new Error(`Not in a git repository: ${error.message}`);
  }
}

/**
 * Check the status of a worktree to detect modified/untracked files
 * @param {string} worktreePath - Path to the worktree to check
 * @returns {Object} Status information about the worktree
 */
export function checkWorktreeStatus(worktreePath) {
  try {
    gitLogger.info(`Checking status of worktree: ${worktreePath}`);
    
    // Use git status --porcelain to get machine-readable output
    const statusOutput = safeGitExec('status', ['--porcelain'], { 
      encoding: 'utf8',
      cwd: worktreePath,
      timeout: 30000
    });
    
    const statusLines = statusOutput.trim().split('\n').filter(line => line);
    
    const status = {
      isClean: statusLines.length === 0,
      modifiedFiles: [],
      untrackedFiles: [],
      stagedFiles: [],
      deletedFiles: [],
      totalChanges: statusLines.length
    };
    
    // Parse git status output
    for (const line of statusLines) {
      const statusCode = line.substring(0, 2);
      const fileName = line.substring(3);
      
      // First character: staged changes, Second character: working tree changes
      const staged = statusCode[0];
      const workingTree = statusCode[1];
      
      if (workingTree === 'M') {
        status.modifiedFiles.push(fileName);
      } else if (workingTree === 'D') {
        status.deletedFiles.push(fileName);
      } else if (statusCode === '??') {
        status.untrackedFiles.push(fileName);
      }
      
      if (staged !== ' ' && staged !== '?') {
        status.stagedFiles.push(fileName);
      }
    }
    
    gitLogger.info(`Worktree status: ${status.isClean ? 'clean' : `${status.totalChanges} changes`}`);
    return status;
    
  } catch (error) {
    gitLogger.error(`Failed to check worktree status ${worktreePath}: ${error.message}`);
    // If we can't check status, assume it's not clean to be safe
    return {
      isClean: false,
      modifiedFiles: [],
      untrackedFiles: [],
      stagedFiles: [],
      deletedFiles: [],
      totalChanges: 0,
      error: error.message
    };
  }
}

/**
 * Display worktree status in a formatted way
 * @param {Object} status - Status object from checkWorktreeStatus
 */
export function displayWorktreeStatus(status) {
  if (status.isClean) {
    console.log('   ✅ Worktree is clean (no changes)');
    return;
  }
  
  if (status.error) {
    console.log(`   ⚠️  Could not check worktree status: ${status.error}`);
    return;
  }
  
  console.log('   ⚠️  Worktree contains uncommitted changes:');
  
  if (status.modifiedFiles.length > 0) {
    console.log(`     Modified files (${status.modifiedFiles.length}):`);
    status.modifiedFiles.slice(0, 5).forEach(file => {
      console.log(`       • ${file}`);
    });
    if (status.modifiedFiles.length > 5) {
      console.log(`       ... and ${status.modifiedFiles.length - 5} more`);
    }
  }
  
  if (status.untrackedFiles.length > 0) {
    console.log(`     Untracked files (${status.untrackedFiles.length}):`);
    status.untrackedFiles.slice(0, 5).forEach(file => {
      console.log(`       • ${file}`);
    });
    if (status.untrackedFiles.length > 5) {
      console.log(`       ... and ${status.untrackedFiles.length - 5} more`);
    }
  }
  
  if (status.stagedFiles.length > 0) {
    console.log(`     Staged files (${status.stagedFiles.length}):`);
    status.stagedFiles.slice(0, 5).forEach(file => {
      console.log(`       • ${file}`);
    });
    if (status.stagedFiles.length > 5) {
      console.log(`       ... and ${status.stagedFiles.length - 5} more`);
    }
  }
  
  if (status.deletedFiles.length > 0) {
    console.log(`     Deleted files (${status.deletedFiles.length}):`);
    status.deletedFiles.slice(0, 5).forEach(file => {
      console.log(`       • ${file}`);
    });
    if (status.deletedFiles.length > 5) {
      console.log(`       ... and ${status.deletedFiles.length - 5} more`);
    }
  }
}

/**
 * Display Docker artifacts in a formatted way
 */
export function displayDockerArtifacts(artifacts) {
  if (!artifacts.found) {
    console.log('   No Docker artifacts found');
    return;
  }
  
  if (artifacts.containers.length > 0) {
    console.log('   Containers:');
    artifacts.containers.forEach(container => {
      console.log(`     ${container}`);
    });
  }
  
  if (artifacts.images.length > 0) {
    console.log('   Images:');
    artifacts.images.forEach(image => {
      console.log(`     ${image}`);
    });
  }
  
  if (artifacts.volumes.length > 0) {
    console.log('   Volumes:');
    artifacts.volumes.forEach(volume => {
      console.log(`     ${volume}`);
    });
  }
  
  if (artifacts.networks.length > 0) {
    console.log('   Networks:');
    artifacts.networks.forEach(network => {
      console.log(`     ${network}`);
    });
  }
}