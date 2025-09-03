import { execSync, spawn } from 'child_process';
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
          head: null
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
    
    // Add worktree names (basename of path)
    worktrees.forEach(wt => {
      wt.name = wt.path.split('/').pop();
    });
    
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
 */
export function removeWorktree(worktreePath, dryRun = false) {
  try {
    if (dryRun) {
      printStatus(`Would remove worktree: ${worktreePath}`);
      return { success: true };
    }
    
    safeGitExec('worktree', ['remove', worktreePath], { stdio: 'ignore' });
    return { success: true };
  } catch (error) {
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