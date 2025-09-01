import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * File utilities for DevContainer operations
 */

/**
 * Get current filename and directory for ES modules
 * @param {string} importMetaUrl - import.meta.url from the calling module
 * @returns {Object} Object with __filename and __dirname
 */
export function getFilenameDirname(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);
  return { __filename, __dirname };
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Check if a directory exists
 * @param {string} dirPath - Directory path to check
 * @returns {boolean} True if directory exists
 */
export function directoryExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
export async function ensureDirectory(dirPath) {
  return fs.ensureDir(dirPath);
}

/**
 * Copy file with error handling
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @param {Object} options - Copy options
 * @returns {Promise<void>}
 */
export async function copyFile(source, destination, options = {}) {
  try {
    await fs.copy(source, destination, options);
  } catch (error) {
    throw new Error(`Failed to copy ${source} to ${destination}: ${error.message}`);
  }
}

/**
 * Copy directory recursively with error handling
 * @param {string} source - Source directory path
 * @param {string} destination - Destination directory path
 * @param {Object} options - Copy options
 * @returns {Promise<void>}
 */
export async function copyDirectory(source, destination, options = {}) {
  try {
    await fs.copy(source, destination, options);
  } catch (error) {
    throw new Error(`Failed to copy directory ${source} to ${destination}: ${error.message}`);
  }
}

/**
 * Read file with error handling
 * @param {string} filePath - File path to read
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Promise<string>} File contents
 */
export async function readFile(filePath, encoding = 'utf8') {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write file with error handling
 * @param {string} filePath - File path to write
 * @param {string} content - Content to write
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, content, options = {}) {
  try {
    await fs.writeFile(filePath, content, options);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Read JSON file with error handling
 * @param {string} filePath - JSON file path to read
 * @returns {Promise<Object>} Parsed JSON object
 */
export async function readJsonFile(filePath) {
  try {
    return await fs.readJson(filePath);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file with error handling
 * @param {string} filePath - JSON file path to write
 * @param {Object} data - Data to write as JSON
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function writeJsonFile(filePath, data, options = { spaces: 2 }) {
  try {
    await fs.writeJson(filePath, data, options);
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * List directory contents with filtering
 * @param {string} dirPath - Directory path to list
 * @param {Object} options - List options
 * @param {boolean} options.withFileTypes - Return Dirent objects (default: false)
 * @param {function} options.filter - Filter function for entries
 * @returns {Promise<string[]|fs.Dirent[]>} Directory contents
 */
export async function listDirectory(dirPath, options = {}) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: options.withFileTypes || false });
    
    if (options.filter) {
      return entries.filter(options.filter);
    }
    
    return entries;
  } catch (error) {
    throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Find files matching a pattern in a directory
 * @param {string} dirPath - Directory to search in
 * @param {RegExp|function} pattern - Pattern to match against filenames
 * @param {Object} options - Search options
 * @param {boolean} options.recursive - Search recursively (default: false)
 * @returns {Promise<string[]>} Array of matching file paths
 */
export async function findFiles(dirPath, pattern, options = {}) {
  const results = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && options.recursive) {
        const subResults = await findFiles(entryPath, pattern, options);
        results.push(...subResults);
      } else if (entry.isFile()) {
        let matches = false;
        
        if (pattern instanceof RegExp) {
          matches = pattern.test(entry.name);
        } else if (typeof pattern === 'function') {
          matches = pattern(entry.name, entryPath);
        }
        
        if (matches) {
          results.push(entryPath);
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to find files in ${dirPath}: ${error.message}`);
  }
  
  return results;
}

/**
 * Get file stats with error handling
 * @param {string} filePath - File path to stat
 * @returns {Promise<fs.Stats>} File stats
 */
export async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
  }
}

/**
 * Remove file or directory with error handling
 * @param {string} targetPath - Path to remove
 * @returns {Promise<void>}
 */
export async function remove(targetPath) {
  try {
    await fs.remove(targetPath);
  } catch (error) {
    throw new Error(`Failed to remove ${targetPath}: ${error.message}`);
  }
}

/**
 * Check if path is a directory
 * @param {string} targetPath - Path to check
 * @returns {Promise<boolean>} True if path is a directory
 */
export async function isDirectory(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Check if path is a file
 * @param {string} targetPath - Path to check
 * @returns {Promise<boolean>} True if path is a file
 */
export async function isFile(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}