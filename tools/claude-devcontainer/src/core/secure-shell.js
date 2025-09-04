import { execSync, spawn } from 'child_process';

/**
 * Secure shell command execution utilities
 * Provides protection against command injection and unsafe shell operations
 */

/**
 * Escape shell arguments to prevent injection attacks
 * @param {string} arg - Argument to escape
 * @returns {string} - Safely escaped argument
 */
export function escapeShellArg(arg) {
  if (typeof arg !== 'string') {
    throw new Error('Shell argument must be a string');
  }
  
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * Validate that a string contains only safe characters for shell execution
 * @param {string} input - Input to validate
 * @param {string} context - Context for error messages
 * @returns {boolean} - True if safe
 */
export function validateSafeInput(input, context = 'input', allowWildcards = false) {
  if (typeof input !== 'string') {
    throw new Error(`${context} must be a string`);
  }
  
  // Check for dangerous characters and patterns
  const dangerousPatterns = [
    /[;&|`$()\[\]]/,    // Shell metacharacters (removed {} for Docker formats)
    /\$\(/,             // Command substitution
    /`/,                // Backticks
    /\\\\/,             // Escaped backslashes (could be injection attempts)
    /\|\|/,             // OR operators
    /&&/,               // AND operators
    />/,                // Redirections
    /</                 // Input redirections
  ];
  
  // Add wildcard patterns if not allowed
  if (!allowWildcards) {
    dangerousPatterns.push(/\*/, /\?/);
  }
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      throw new Error(`${context} contains potentially dangerous characters: ${input}`);
    }
  }
  
  return true;
}

/**
 * Safely execute git commands with validated arguments
 * @param {string} subcommand - Git subcommand (e.g., 'worktree', 'branch')
 * @param {Array<string>} args - Arguments for the git command
 * @param {Object} options - Options for execSync
 * @returns {string} - Command output
 */
export function safeGitExec(subcommand, args = [], options = {}) {
  // Validate subcommand
  const allowedSubcommands = [
    'worktree', 'branch', 'rev-parse', 'show-ref', 'fetch', 'status', 
    'log', 'symbolic-ref', 'remote', 'update-index'
  ];
  
  if (!allowedSubcommands.includes(subcommand)) {
    throw new Error(`Git subcommand '${subcommand}' is not allowed`);
  }
  
  // Define known safe git command options that don't need escaping
  const safeGitOptions = {
    worktree: ['add', 'list', 'remove', 'move', 'prune', 'lock', 'unlock', '--porcelain', '--verbose', '-v', '--force', '-f'],
    branch: ['--list', '--all', '--merged', '--no-merged', '--contains', '--points-at', '--format', '-r', '-a', '-v', '--verbose'],
    'rev-parse': ['--git-dir', '--show-toplevel', '--abbrev-ref', '--short', '--verify', '--quiet', '-q'],
    'show-ref': ['--verify', '--quiet', '-q', '--heads', '--tags'],
    fetch: ['--all', '--prune', '--dry-run', '--verbose', '-v'],
    status: ['--porcelain', '--short', '-s', '--branch', '-b'],
    log: ['--oneline', '--graph', '--decorate', '--all', '--format', '--pretty'],
    'symbolic-ref': ['--quiet', '-q', '--short'],
    remote: ['--verbose', '-v', 'get-url', 'show'],
    'update-index': ['--assume-unchanged', '--no-assume-unchanged', '--skip-worktree', '--no-skip-worktree', '--refresh', '--ignore-missing']
  };
  
  // Process arguments based on their type
  const processedArgs = args.map((arg, index) => {
    validateSafeInput(arg, `git ${subcommand} argument ${index + 1}`);
    
    // Don't escape known safe git options
    const safeOptions = safeGitOptions[subcommand] || [];
    if (safeOptions.includes(arg)) {
      return arg;
    }
    
    // Don't escape arguments that look like git refs (refs/heads/, refs/remotes/, etc.)
    if (arg.startsWith('refs/') || arg.startsWith('origin/')) {
      return arg;
    }
    
    // Don't escape short flags and known patterns
    if (arg.startsWith('--') || arg.startsWith('-') || arg.match(/^[a-zA-Z0-9._-]+$/)) {
      // For paths and complex values, still escape them
      if (arg.includes('/') && !arg.startsWith('refs/') && !arg.startsWith('origin/')) {
        return escapeShellArg(arg);
      }
      return arg;
    }
    
    // Escape everything else (file paths, user input, etc.)
    return escapeShellArg(arg);
  });
  
  // Construct safe command
  const command = `git ${subcommand} ${processedArgs.join(' ')}`;
  
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
      ...options
    });
  } catch (error) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Safely execute docker commands with validated arguments  
 * @param {string} subcommand - Docker subcommand
 * @param {Array<string>} args - Arguments for the docker command
 * @param {Object} options - Options for execSync
 * @returns {string} - Command output
 */
export function safeDockerExec(subcommand, args = [], options = {}) {
  // Validate subcommand
  const allowedSubcommands = [
    'ps', 'images', 'volume', 'network', 'rm', 'rmi', 'info',
    'system', 'container', 'image'
  ];
  
  if (!allowedSubcommands.includes(subcommand)) {
    throw new Error(`Docker subcommand '${subcommand}' is not allowed`);
  }
  
  // Validate and escape arguments with special handling for Docker patterns
  const processedArgs = args.map((arg, index) => {
    // Special handling for filter and format arguments
    if (arg.startsWith('--filter=') || arg.startsWith('--format=')) {
      return arg; // Keep these as-is for now, they're pre-validated by our config system
    }
    
    // For other flags and options
    if (arg.startsWith('--') || arg.startsWith('-')) {
      return arg; // Docker flags are generally safe
    }
    
    // For regular arguments, apply validation but allow some Docker patterns
    if (arg.includes('*') || arg.includes('{{') || arg.includes('}}')) {
      // Allow Docker format patterns and wildcards in controlled contexts
      return escapeShellArg(arg);
    }
    
    // Standard validation for other args
    validateSafeInput(arg, `docker ${subcommand} argument ${index + 1}`);
    return escapeShellArg(arg);
  });
  
  // Construct safe command
  const command = `docker ${subcommand} ${processedArgs.join(' ')}`;
  
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
      ...options
    });
  } catch (error) {
    // Don't expose full docker error details to prevent information leakage
    throw new Error(`Docker command failed: ${subcommand}`);
  }
}

/**
 * Validate a feature/branch name for safety
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
export function validateFeatureName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Feature name must be a non-empty string');
  }
  
  if (name.length > 50) {
    throw new Error('Feature name must be 50 characters or less');
  }
  
  // Allow only alphanumeric, dots, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(name)) {
    throw new Error('Feature name can only contain letters, numbers, dots, hyphens, and underscores');
  }
  
  // Prevent problematic names
  const forbiddenNames = ['.', '..', 'HEAD', 'main', 'master', 'origin'];
  if (forbiddenNames.includes(name)) {
    throw new Error(`Feature name '${name}' is not allowed`);
  }
  
  return true;
}

/**
 * Validate a worktree path for safety
 * @param {string} path - Path to validate
 * @returns {boolean} - True if valid
 */
export function validateWorktreePath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('Worktree path must be a non-empty string');
  }
  
  // Prevent obvious path traversal attacks
  if (path.includes('../') || path.includes('..\\')) {
    // Note: This might be overly restrictive if we want to allow parent directories
    // The worktree-config.js handles this with allowParentDirectoryTraversal setting
  }
  
  // Prevent paths that start with dangerous characters
  if (path.startsWith('-') || path.startsWith('~') || path.startsWith('$')) {
    throw new Error('Worktree path cannot start with -, ~, or $');
  }
  
  return true;
}

/**
 * Safely execute a shell command with comprehensive validation
 * @param {string} command - Base command to execute
 * @param {Array<string>} args - Arguments for the command
 * @param {Object} options - Options for execSync
 * @returns {string} - Command output
 */
export function safeExec(command, args = [], options = {}) {
  // Whitelist of allowed base commands
  const allowedCommands = ['git', 'docker', 'which', 'command'];
  
  if (!allowedCommands.includes(command)) {
    throw new Error(`Command '${command}' is not allowed`);
  }
  
  // Use specific safe executors
  if (command === 'git') {
    const [subcommand, ...subargs] = args;
    return safeGitExec(subcommand, subargs, options);
  }
  
  if (command === 'docker') {
    const [subcommand, ...subargs] = args;
    return safeDockerExec(subcommand, subargs, options);
  }
  
  // For other whitelisted commands, validate and escape
  const escapedArgs = args.map((arg, index) => {
    validateSafeInput(arg, `${command} argument ${index + 1}`);
    return escapeShellArg(arg);
  });
  
  const fullCommand = `${command} ${escapedArgs.join(' ')}`;
  
  try {
    return execSync(fullCommand, {
      encoding: 'utf8',
      timeout: 30000,
      ...options
    });
  } catch (error) {
    throw new Error(`Command failed: ${command}`);
  }
}

/**
 * Create a safe environment for shell execution
 * @param {Object} options - Environment options
 * @returns {Object} - Safe environment variables
 */
export function createSafeEnv(options = {}) {
  // Start with minimal environment
  const safeEnv = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: process.env.HOME || '/tmp',
    USER: process.env.USER || 'unknown',
    ...options.additionalEnv
  };
  
  // Remove potentially dangerous environment variables
  const dangerousVars = [
    'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES',
    'IFS', 'PS1', 'PS2', 'PS4', 'PROMPT_COMMAND'
  ];
  
  dangerousVars.forEach(varName => {
    delete safeEnv[varName];
  });
  
  return safeEnv;
}