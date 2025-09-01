import chalk from 'chalk';

/**
 * Logging utilities with colored output for CLI
 */

/**
 * Logger class with different log levels and colored output
 */
export class Logger {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.verbose = options.verbose || false;
  }

  /**
   * Log info message in blue
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    console.log(chalk.blue(this._format(message)), ...args);
  }

  /**
   * Log success message in green
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  success(message, ...args) {
    console.log(chalk.green(this._format(message)), ...args);
  }

  /**
   * Log warning message in yellow
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    console.warn(chalk.yellow(this._format(message)), ...args);
  }

  /**
   * Log error message in red
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    console.error(chalk.red(this._format(message)), ...args);
  }

  /**
   * Log debug message in gray (only if verbose is enabled)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.verbose) {
      console.log(chalk.gray(this._format(`[DEBUG] ${message}`)), ...args);
    }
  }

  /**
   * Log verbose message in dim (only if verbose is enabled)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  verbose(message, ...args) {
    if (this.verbose) {
      console.log(chalk.dim(this._format(message)), ...args);
    }
  }

  /**
   * Log with custom color
   * @param {string} color - Chalk color method name
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  log(color, message, ...args) {
    const colorFunc = chalk[color] || chalk.white;
    console.log(colorFunc(this._format(message)), ...args);
  }

  /**
   * Log progress step
   * @param {string} step - Current step description
   * @param {number} current - Current step number
   * @param {number} total - Total number of steps
   */
  step(step, current, total) {
    const progress = `[${current}/${total}]`;
    console.log(chalk.cyan(progress), chalk.gray(step));
  }

  /**
   * Create a new logger with additional prefix
   * @param {string} prefix - Additional prefix for this logger
   * @returns {Logger} New logger instance
   */
  child(prefix) {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      prefix: childPrefix,
      verbose: this.verbose
    });
  }

  /**
   * Format message with prefix
   * @private
   * @param {string} message - Message to format
   * @returns {string} Formatted message
   */
  _format(message) {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }
}

// Default logger instance
export const logger = new Logger();

/**
 * Create spinner-like progress indicator
 * @param {string} message - Initial message
 * @returns {Object} Progress object with update and finish methods
 */
export function createProgress(message) {
  let currentMessage = message;
  
  // Print initial message
  process.stdout.write(chalk.blue(`⏳ ${currentMessage}...`));
  
  return {
    /**
     * Update progress message
     * @param {string} newMessage - New progress message
     */
    update(newMessage) {
      // Clear current line and write new message
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      currentMessage = newMessage;
      process.stdout.write(chalk.blue(`⏳ ${currentMessage}...`));
    },

    /**
     * Finish progress with success
     * @param {string} finalMessage - Final success message
     */
    succeed(finalMessage = currentMessage) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log(chalk.green(`✅ ${finalMessage}`));
    },

    /**
     * Finish progress with failure
     * @param {string} finalMessage - Final error message
     */
    fail(finalMessage = currentMessage) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log(chalk.red(`❌ ${finalMessage}`));
    },

    /**
     * Finish progress with warning
     * @param {string} finalMessage - Final warning message
     */
    warn(finalMessage = currentMessage) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log(chalk.yellow(`⚠️  ${finalMessage}`));
    }
  };
}

/**
 * Log a boxed message for important information
 * @param {string} title - Box title
 * @param {string[]} lines - Array of lines to display in box
 * @param {string} color - Box color (default: blue)
 */
export function logBox(title, lines, color = 'blue') {
  const colorFunc = chalk[color] || chalk.blue;
  const maxLength = Math.max(title.length, ...lines.map(line => line.length));
  const border = '─'.repeat(maxLength + 4);
  
  console.log(colorFunc(`┌${border}┐`));
  console.log(colorFunc(`│  ${title.padEnd(maxLength)}  │`));
  console.log(colorFunc(`├${border}┤`));
  
  lines.forEach(line => {
    console.log(colorFunc(`│  ${line.padEnd(maxLength)}  │`));
  });
  
  console.log(colorFunc(`└${border}┘`));
}

/**
 * Log table with aligned columns
 * @param {Array<Object>} data - Array of objects to display
 * @param {string[]} columns - Column names to display
 * @param {Object} options - Table options
 */
export function logTable(data, columns, options = {}) {
  if (!data || data.length === 0) {
    console.log(chalk.gray('No data to display'));
    return;
  }

  // Calculate column widths
  const widths = columns.map(col => 
    Math.max(col.length, ...data.map(row => String(row[col] || '').length))
  );

  // Print header
  const header = columns.map((col, i) => chalk.bold(col.padEnd(widths[i]))).join('  ');
  console.log(header);
  console.log(chalk.gray('─'.repeat(header.length)));

  // Print rows
  data.forEach(row => {
    const rowStr = columns.map((col, i) => 
      String(row[col] || '').padEnd(widths[i])
    ).join('  ');
    console.log(rowStr);
  });
}