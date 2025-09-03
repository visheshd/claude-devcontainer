import { execSync, spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Utility functions for worktree and Docker cleanup
 * Shared between CLI cleanup command and git post-merge hook
 */

// Colors for output
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim
};

/**
 * Print status message
 */
export function printStatus(message) {
  console.log(colors.info('[CLEANUP]') + ' ' + message);
}

/**
 * Print success message
 */
export function printSuccess(message) {
  console.log(colors.success('[CLEANUP]') + ' ' + message);
}

/**
 * Print warning message
 */
export function printWarning(message) {
  console.log(colors.warning('[CLEANUP]') + ' ' + message);
}

/**
 * Print error message
 */
export function printError(message) {
  console.log(colors.error('[CLEANUP]') + ' ' + message);
}

/**
 * Check if Docker is available and accessible
 */
export async function checkDocker() {
  try {
    // Check if docker command exists
    execSync('command -v docker', { stdio: 'ignore' });
    
    // Check if docker daemon is accessible
    execSync('docker info', { stdio: 'ignore' });
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all git worktrees with their branch information
 */
export function getAllWorktrees() {
  try {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf8' });
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
    // Get the default branch name
    let defaultBranch;
    try {
      defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', { encoding: 'utf8' })
        .replace('refs/remotes/origin/', '').trim();
    } catch {
      // Fallback to common default branch names
      try {
        execSync('git show-ref --verify --quiet refs/heads/main', { stdio: 'ignore' });
        defaultBranch = 'main';
      } catch {
        defaultBranch = 'master';
      }
    }
    
    // Get merged branches
    const output = execSync(`git branch --merged ${defaultBranch}`, { encoding: 'utf8' });
    const branches = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*') && line !== defaultBranch)
      .map(line => line.replace(/^\* /, ''));
    
    return branches;
  } catch (error) {
    throw new Error(`Failed to get merged branches: ${error.message}`);
  }
}

/**
 * Get Docker artifacts for a specific worktree name
 */
export async function getDockerArtifacts(worktreeName) {
  if (!await checkDocker()) {
    return { found: false, containers: [], images: [], volumes: [], networks: [] };
  }
  
  const artifacts = {
    found: false,
    containers: [],
    images: [],
    volumes: [],
    networks: []
  };
  
  try {
    // Check for containers
    const containers = execSync(
      `docker ps -a --filter "name=${worktreeName}_devcontainer" --format "{{.Names}}"`,
      { encoding: 'utf8' }
    ).trim();
    if (containers) {
      artifacts.containers = containers.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for images
    const images = execSync(
      `docker images --filter "reference=vsc-${worktreeName}-*" --format "{{.Repository}}:{{.Tag}}"`,
      { encoding: 'utf8' }
    ).trim();
    if (images) {
      artifacts.images = images.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for volumes
    const volumes = execSync(
      `docker volume ls --filter "name=vsc-${worktreeName}" --format "{{.Name}}"`,
      { encoding: 'utf8' }
    ).trim();
    if (volumes) {
      artifacts.volumes = volumes.split('\n').filter(Boolean);
      artifacts.found = true;
    }
    
    // Check for networks
    const networks = execSync(
      `docker network ls --filter "name=${worktreeName}_devcontainer" --format "{{.Name}}"`,
      { encoding: 'utf8' }
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
  if (!await checkDocker()) {
    printWarning('Docker not available, skipping Docker cleanup');
    return { success: false, cleaned: 0 };
  }
  
  let totalCleaned = 0;
  const results = {
    containers: 0,
    images: 0,
    volumes: 0,
    networks: 0
  };
  
  try {
    // Remove containers
    const containers = execSync(
      `docker ps -a --filter "name=${worktreeName}_devcontainer" -q`,
      { encoding: 'utf8' }
    ).trim();
    
    if (containers) {
      const containerIds = containers.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${containerIds.length} containers`);
      } else {
        execSync(`echo "${containers}" | xargs docker rm -f`, { stdio: 'ignore' });
        results.containers = containerIds.length;
        totalCleaned += containerIds.length;
        printSuccess(`✓ Removed ${containerIds.length} containers`);
      }
    }
    
    // Remove images
    const images = execSync(
      `docker images --filter "reference=vsc-${worktreeName}-*" -q`,
      { encoding: 'utf8' }
    ).trim();
    
    if (images) {
      const imageIds = images.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${imageIds.length} images`);
      } else {
        execSync(`echo "${images}" | xargs docker rmi -f`, { stdio: 'ignore' });
        results.images = imageIds.length;
        totalCleaned += imageIds.length;
        printSuccess(`✓ Removed ${imageIds.length} images`);
      }
    }
    
    // Remove volumes
    const volumes = execSync(
      `docker volume ls --filter "name=vsc-${worktreeName}" -q`,
      { encoding: 'utf8' }
    ).trim();
    
    if (volumes) {
      const volumeNames = volumes.split('\n').filter(Boolean);
      if (dryRun) {
        printStatus(`Would remove ${volumeNames.length} volumes`);
      } else {
        execSync(`echo "${volumes}" | xargs docker volume rm`, { stdio: 'ignore' });
        results.volumes = volumeNames.length;
        totalCleaned += volumeNames.length;
        printSuccess(`✓ Removed ${volumeNames.length} volumes`);
      }
    }
    
    // Remove networks
    const networks = execSync(
      `docker network ls --filter "name=${worktreeName}_devcontainer" --format "{{.Name}}"`,
      { encoding: 'utf8' }
    ).trim();
    
    if (networks) {
      const networkNames = networks.split('\n').filter(n => 
        n && !['bridge', 'host', 'none'].includes(n)
      );
      if (networkNames.length > 0) {
        if (dryRun) {
          printStatus(`Would remove ${networkNames.length} networks`);
        } else {
          execSync(`echo "${networkNames.join('\n')}" | xargs docker network rm`, { stdio: 'ignore' });
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
    
    execSync(`git worktree remove "${worktreePath}"`, { stdio: 'ignore' });
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
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
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