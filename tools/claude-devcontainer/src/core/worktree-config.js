import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Configuration management for worktree creation and cleanup
 * Supports global, project-local, and user-specific configurations
 */

const CONFIG_FILE_NAME = '.claude-worktree-config.json';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  // Worktree path pattern - uses template variables:
  // ${gitRoot} - root directory name
  // ${featureName} - feature/branch name  
  // ${parentDir} - parent directory of git root
  worktreePathPattern: '../${gitRoot}-${featureName}',
  
  // Docker artifact naming patterns
  docker: {
    containerPattern: '${worktreeName}_devcontainer',
    imagePattern: 'vsc-${worktreeName}-*',
    volumePattern: 'vsc-${worktreeName}*',
    networkPattern: '${worktreeName}_devcontainer'
  },
  
  // Safety and validation settings
  validation: {
    allowParentDirectoryTraversal: true,
    maxPathDepth: 3,
    allowedFeatureNameChars: /^[a-zA-Z0-9._-]+$/,
    forbiddenNames: ['.', '..', 'main', 'master', 'HEAD']
  },
  
  // Cleanup behavior
  cleanup: {
    confirmByDefault: true,
    verboseLogging: false,
    autoCleanupMerged: false
  }
};

/**
 * Load configuration from multiple sources in priority order:
 * 1. Project-local (./.claude-worktree-config.json)
 * 2. User global (~/.config/claude-devcontainer/worktree-config.json)  
 * 3. System-wide (/etc/claude-devcontainer/worktree-config.json)
 * 4. Defaults
 */
export function loadWorktreeConfig() {
  const configs = [DEFAULT_CONFIG];
  
  // System config
  const systemConfigPath = '/etc/claude-devcontainer/worktree-config.json';
  if (fs.existsSync(systemConfigPath)) {
    try {
      const systemConfig = JSON.parse(fs.readFileSync(systemConfigPath, 'utf8'));
      configs.push(systemConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load system config: ${error.message}`);
    }
  }
  
  // User global config
  const userConfigDir = path.join(os.homedir(), '.config', 'claude-devcontainer');
  const userConfigPath = path.join(userConfigDir, 'worktree-config.json');
  if (fs.existsSync(userConfigPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
      configs.push(userConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load user config: ${error.message}`);
    }
  }
  
  // Project local config
  const projectConfigPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(projectConfigPath)) {
    try {
      const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      configs.push(projectConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load project config: ${error.message}`);
    }
  }
  
  // Environment variable overrides
  const envConfig = loadEnvironmentConfig();
  if (Object.keys(envConfig).length > 0) {
    configs.push(envConfig);
  }
  
  // Merge configurations (later configs override earlier ones)
  return configs.reduce((merged, config) => deepMerge(merged, config), {});
}

/**
 * Load configuration overrides from environment variables
 */
function loadEnvironmentConfig() {
  const envConfig = {};
  
  if (process.env.CLAUDE_WORKTREE_PATH_PATTERN) {
    envConfig.worktreePathPattern = process.env.CLAUDE_WORKTREE_PATH_PATTERN;
  }
  
  if (process.env.CLAUDE_WORKTREE_CONFIRM_BY_DEFAULT) {
    envConfig.cleanup = envConfig.cleanup || {};
    envConfig.cleanup.confirmByDefault = process.env.CLAUDE_WORKTREE_CONFIRM_BY_DEFAULT === 'true';
  }
  
  if (process.env.CLAUDE_WORKTREE_VERBOSE) {
    envConfig.cleanup = envConfig.cleanup || {};
    envConfig.cleanup.verboseLogging = process.env.CLAUDE_WORKTREE_VERBOSE === 'true';
  }
  
  return envConfig;
}

/**
 * Deep merge two configuration objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof RegExp)) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Generate worktree path using configured pattern and template variables
 */
export function generateWorktreePath(featureName, gitRoot, config = null) {
  if (!config) {
    config = loadWorktreeConfig();
  }
  
  // Validate feature name
  validateFeatureName(featureName, config);
  
  // Template variables
  const variables = {
    gitRoot,
    featureName: sanitizeFeatureName(featureName),
    parentDir: path.dirname(process.cwd()),
    timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
    user: os.userInfo().username
  };
  
  // Replace template variables in pattern
  let pathPattern = config.worktreePathPattern;
  for (const [key, value] of Object.entries(variables)) {
    pathPattern = pathPattern.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }
  
  // Resolve relative path
  const absolutePath = path.resolve(pathPattern);
  
  // Validate the resulting path
  validateWorktreePath(absolutePath, config);
  
  return pathPattern; // Return relative path for use
}

/**
 * Validate feature name against configuration rules
 */
function validateFeatureName(featureName, config) {
  const { allowedFeatureNameChars, forbiddenNames } = config.validation;
  
  if (!featureName || typeof featureName !== 'string') {
    throw new Error('Feature name must be a non-empty string');
  }
  
  if (forbiddenNames.includes(featureName)) {
    throw new Error(`Feature name '${featureName}' is not allowed (forbidden names: ${forbiddenNames.join(', ')})`);
  }
  
  if (!allowedFeatureNameChars.test(featureName)) {
    throw new Error(`Feature name '${featureName}' contains invalid characters. Only letters, numbers, dots, underscores, and hyphens are allowed.`);
  }
  
  if (featureName.length > 50) {
    throw new Error('Feature name must be 50 characters or less');
  }
}

/**
 * Sanitize feature name for safe use in paths
 */
function sanitizeFeatureName(featureName) {
  return featureName
    .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate the generated worktree path
 */
function validateWorktreePath(absolutePath, config) {
  const { allowParentDirectoryTraversal, maxPathDepth } = config.validation;
  const currentDir = process.cwd();
  
  // Check for directory traversal if not allowed
  if (!allowParentDirectoryTraversal && !absolutePath.startsWith(currentDir)) {
    throw new Error(`Worktree path '${absolutePath}' is outside current directory and traversal is disabled`);
  }
  
  // Check path depth
  const relativePath = path.relative(currentDir, absolutePath);
  const pathDepth = relativePath.split(path.sep).length;
  if (pathDepth > maxPathDepth) {
    throw new Error(`Worktree path depth (${pathDepth}) exceeds maximum allowed (${maxPathDepth})`);
  }
  
  // Check for obvious security issues
  if (absolutePath.includes('..') && !allowParentDirectoryTraversal) {
    throw new Error('Path traversal detected in worktree path');
  }
}

/**
 * Generate Docker artifact names using configured patterns
 */
export function generateDockerArtifactNames(worktreeName, config = null) {
  if (!config) {
    config = loadWorktreeConfig();
  }
  
  const { docker } = config;
  
  return {
    containerPattern: docker.containerPattern.replace(/\${worktreeName}/g, worktreeName),
    imagePattern: docker.imagePattern.replace(/\${worktreeName}/g, worktreeName),
    volumePattern: docker.volumePattern.replace(/\${worktreeName}/g, worktreeName),
    networkPattern: docker.networkPattern.replace(/\${worktreeName}/g, worktreeName)
  };
}

/**
 * Create a sample configuration file for user customization
 */
export function createSampleConfig(targetPath = null) {
  if (!targetPath) {
    targetPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  }
  
  const sampleConfig = {
    ...DEFAULT_CONFIG,
    // Add some example alternative patterns as comments in the JSON
    _examples: {
      worktreePathPatterns: [
        '../${gitRoot}-${featureName}',
        './worktrees/${featureName}',
        '~/worktrees/${gitRoot}/${featureName}',
        '/tmp/worktrees/${user}/${gitRoot}/${featureName}'
      ]
    }
  };
  
  fs.writeFileSync(targetPath, JSON.stringify(sampleConfig, null, 2));
  return targetPath;
}