/**
 * JSON utilities for handling DevContainer files with comments
 */

/**
 * Strip JSON comments from a string (for DevContainer files)
 * DevContainer files support // comments, but standard JSON parsers don't
 * @param {string} jsonString - JSON string potentially containing comments
 * @returns {string} JSON string with comments removed
 */
export function stripJsonComments(jsonString) {
  return jsonString
    .split('\n')
    .map(line => {
      // Remove line comments but preserve strings
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        // Check if // is inside a string
        const beforeComment = line.substring(0, commentIndex);
        const quotes = (beforeComment.match(/"/g) || []).length;
        if (quotes % 2 === 0) {
          // Even number of quotes means // is not inside a string
          return line.substring(0, commentIndex).trimEnd();
        }
      }
      return line;
    })
    .join('\n');
}

/**
 * Safely parse JSON with comment support
 * @param {string} jsonString - JSON string potentially containing comments
 * @returns {Object} Parsed JSON object
 * @throws {SyntaxError} If JSON is malformed after comment removal
 */
export function parseJsonWithComments(jsonString) {
  const cleanJson = stripJsonComments(jsonString);
  return JSON.parse(cleanJson);
}

/**
 * Read and parse a DevContainer JSON file with comment support
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} Parsed JSON object
 * @throws {Error} If file cannot be read or parsed
 */
export async function readDevContainerJson(filePath) {
  const fs = await import('fs-extra');
  const content = await fs.readFile(filePath, 'utf8');
  return parseJsonWithComments(content);
}

/**
 * Write JSON with proper formatting for DevContainer files
 * @param {string} filePath - Path to write the file
 * @param {Object} data - Data to write as JSON
 * @param {Object} options - Write options
 * @param {number} options.spaces - Number of spaces for indentation (default: 2)
 * @returns {Promise<void>}
 */
export async function writeDevContainerJson(filePath, data, options = {}) {
  const fs = await import('fs-extra');
  const spaces = options.spaces || 2;
  await fs.writeJson(filePath, data, { spaces });
}

/**
 * Merge JSON objects deeply, useful for DevContainer configurations
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 * @returns {Object} Merged object
 */
export function deepMergeJson(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMergeJson(result[key] || {}, source[key]);
      } else if (Array.isArray(source[key])) {
        result[key] = Array.isArray(result[key]) ? [...result[key], ...source[key]] : [...source[key]];
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Validate JSON schema for DevContainer configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateDevContainerConfig(config) {
  const errors = [];
  
  // Basic validation
  if (!config.name) {
    errors.push('Configuration must have a name');
  }
  
  // Single-container validation
  if (!config.dockerComposeFile && !config.image) {
    errors.push('Configuration must specify either "image" or "dockerComposeFile"');
  }
  
  // Multi-service validation
  if (config.dockerComposeFile && !config.service) {
    errors.push('Multi-service configuration must specify "service"');
  }
  
  // Features validation
  if (config.features && typeof config.features !== 'object') {
    errors.push('Features must be an object');
  }
  
  // Extensions validation
  if (config.customizations?.vscode?.extensions && !Array.isArray(config.customizations.vscode.extensions)) {
    errors.push('VS Code extensions must be an array');
  }
  
  // Ports validation
  if (config.forwardPorts && !Array.isArray(config.forwardPorts)) {
    errors.push('Forward ports must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}