import chalk from 'chalk';

/**
 * Shared logging utilities for consistent output across the application
 * Centralizes color schemes and formatting patterns
 */

// Color scheme configuration
const COLORS = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim,
  highlight: chalk.cyan,
  emoji: chalk.white // For emojis to maintain visibility
};

// Log prefixes for different modules
const PREFIXES = {
  cleanup: '[CLEANUP]',
  docker: '[DOCKER]',
  git: '[GIT]',
  worktree: '[WORKTREE]',
  config: '[CONFIG]'
};

/**
 * Base logging function with consistent formatting
 * @param {string} message - Message to log
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} prefix - Optional prefix for the message
 */
function logWithFormat(message, level = 'info', prefix = '') {
  const colorFn = COLORS[level] || COLORS.info;
  const prefixText = prefix ? colorFn(prefix) + ' ' : '';
  console.log(prefixText + message);
}

/**
 * Print status message with INFO level
 */
export function printStatus(message, module = null) {
  const prefix = module ? PREFIXES[module] || `[${module.toUpperCase()}]` : '';
  logWithFormat(message, 'info', prefix);
}

/**
 * Print success message with SUCCESS level
 */
export function printSuccess(message, module = null) {
  const prefix = module ? PREFIXES[module] || `[${module.toUpperCase()}]` : '';
  logWithFormat(message, 'success', prefix);
}

/**
 * Print warning message with WARNING level
 */
export function printWarning(message, module = null) {
  const prefix = module ? PREFIXES[module] || `[${module.toUpperCase()}]` : '';
  logWithFormat(message, 'warning', prefix);
}

/**
 * Print error message with ERROR level
 */
export function printError(message, module = null) {
  const prefix = module ? PREFIXES[module] || `[${module.toUpperCase()}]` : '';
  logWithFormat(message, 'error', prefix);
}

/**
 * Print dimmed/secondary message
 */
export function printSecondary(message, module = null) {
  const prefix = module ? COLORS.dim(PREFIXES[module] || `[${module.toUpperCase()}]`) + ' ' : '';
  console.log(prefix + COLORS.dim(message));
}

/**
 * Print highlighted message (for important info that's not an error)
 */
export function printHighlight(message, module = null) {
  const prefix = module ? PREFIXES[module] || `[${module.toUpperCase()}]` : '';
  logWithFormat(COLORS.highlight(message), 'info', prefix);
}

/**
 * Print a formatted header
 */
export function printHeader(message, emoji = '') {
  const decoratedMessage = emoji ? `${COLORS.emoji(emoji)} ${message}` : message;
  console.log('\n' + COLORS.info(decoratedMessage));
}

/**
 * Print a section separator
 */
export function printSeparator(char = '─', length = 60) {
  console.log(COLORS.dim(char.repeat(length)));
}

/**
 * Create a logger for a specific module
 */
export function createModuleLogger(moduleName) {
  return {
    info: (message) => printStatus(message, moduleName),
    success: (message) => printSuccess(message, moduleName),
    warning: (message) => printWarning(message, moduleName),
    error: (message) => printError(message, moduleName),
    secondary: (message) => printSecondary(message, moduleName),
    highlight: (message) => printHighlight(message, moduleName),
    header: (message, emoji) => printHeader(message, emoji),
    separator: (char, length) => printSeparator(char, length)
  };
}

// Pre-configured loggers for common modules
export const cleanupLogger = createModuleLogger('cleanup');
export const dockerLogger = createModuleLogger('docker');
export const gitLogger = createModuleLogger('git');
export const worktreeLogger = createModuleLogger('worktree');
export const configLogger = createModuleLogger('config');

// Export color functions for direct use when needed
export const colors = COLORS;