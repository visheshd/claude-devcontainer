import { execSync } from 'child_process';
import { dockerLogger } from './shared-logging.js';

/**
 * Safe Docker command execution utilities
 * Handles Docker-specific patterns while preventing injection
 */

// Enhanced error handling for Docker operations
class DockerError extends Error {
  constructor(message, operation, details = null) {
    super(message);
    this.name = 'DockerError';
    this.operation = operation;
    this.details = details;
  }
}

/**
 * Execute Docker command with enhanced error handling and user feedback
 */
function executeDockerCommand(command, operation, options = {}) {
  try {
    return execSync(`docker ${command}`, { 
      encoding: 'utf8', 
      timeout: options.timeout || 30000,
      ...options 
    });
  } catch (error) {
    // Parse Docker error for better user feedback
    const errorMessage = error.message || error.stderr || 'Unknown Docker error';
    
    // Common Docker error patterns and user-friendly messages
    if (errorMessage.includes('Cannot connect to the Docker daemon')) {
      throw new DockerError(
        'Docker daemon is not running. Please start Docker and try again.',
        operation,
        'CONNECTION_FAILED'
      );
    }
    
    if (errorMessage.includes('permission denied')) {
      throw new DockerError(
        'Permission denied. You may need to run with sudo or add your user to the docker group.',
        operation,
        'PERMISSION_DENIED'
      );
    }
    
    if (errorMessage.includes('No such container')) {
      throw new DockerError(
        'Container not found. It may have already been removed.',
        operation,
        'CONTAINER_NOT_FOUND'
      );
    }
    
    if (errorMessage.includes('No such image')) {
      throw new DockerError(
        'Image not found. It may have already been removed.',
        operation,
        'IMAGE_NOT_FOUND'
      );
    }
    
    if (errorMessage.includes('No such volume')) {
      throw new DockerError(
        'Volume not found. It may have already been removed.',
        operation,
        'VOLUME_NOT_FOUND'
      );
    }
    
    if (errorMessage.includes('No such network')) {
      throw new DockerError(
        'Network not found. It may have already been removed.',
        operation,
        'NETWORK_NOT_FOUND'
      );
    }
    
    if (errorMessage.includes('network has active endpoints')) {
      throw new DockerError(
        'Cannot remove network because it has active connections. Stop connected containers first.',
        operation,
        'NETWORK_IN_USE'
      );
    }
    
    if (errorMessage.includes('volume is in use')) {
      throw new DockerError(
        'Cannot remove volume because it is currently in use by a container.',
        operation,
        'VOLUME_IN_USE'
      );
    }
    
    // Generic fallback with sanitized error info
    throw new DockerError(
      `Docker ${operation} failed. ${errorMessage.split('\n')[0]}`,
      operation,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Print Docker operation status with appropriate formatting
 */
function printDockerStatus(message, type = 'info') {
  switch (type) {
    case 'success':
      dockerLogger.success(message);
      break;
    case 'warning':
      dockerLogger.warning(message);
      break;
    case 'error':
      dockerLogger.error(message);
      break;
    default:
      dockerLogger.info(message);
  }
}

/**
 * Safely execute docker ps commands with filters
 */
export function safeDockerPs(filters = [], format = null, options = {}) {
  const args = ['ps', '-a'];
  
  // Add filters safely
  filters.forEach(filter => {
    if (typeof filter === 'object' && filter.key && filter.value) {
      // Validate filter key
      const allowedKeys = ['name', 'status', 'image', 'label'];
      if (!allowedKeys.includes(filter.key)) {
        throw new Error(`Docker filter key '${filter.key}' is not allowed`);
      }
      
      // Escape filter value
      const escapedValue = filter.value.replace(/["\\]/g, '\\$&');
      args.push(`--filter="${filter.key}=${escapedValue}"`);
    }
  });
  
  // Add format safely
  if (format) {
    const escapedFormat = format.replace(/["\\]/g, '\\$&');
    args.push(`--format="${escapedFormat}"`);
  }
  
  const command = args.join(' ');
  try {
    return executeDockerCommand(command, 'container listing', options);
  } catch (error) {
    if (error instanceof DockerError) {
      printDockerStatus(error.message, 'error');
      if (error.details === 'CONNECTION_FAILED') {
        printDockerStatus('Tip: Run "docker info" to check if Docker is running', 'info');
      }
    }
    throw error;
  }
}

/**
 * Safely execute docker images commands with filters  
 */
export function safeDockerImages(filters = [], format = null, options = {}) {
  const args = ['images'];
  
  // Add filters safely
  filters.forEach(filter => {
    if (typeof filter === 'object' && filter.key && filter.value) {
      const allowedKeys = ['reference', 'label', 'before', 'since'];
      if (!allowedKeys.includes(filter.key)) {
        throw new Error(`Docker filter key '${filter.key}' is not allowed`);
      }
      
      const escapedValue = filter.value.replace(/["\\]/g, '\\$&');
      args.push(`--filter="${filter.key}=${escapedValue}"`);
    }
  });
  
  if (format) {
    const escapedFormat = format.replace(/["\\]/g, '\\$&');
    args.push(`--format="${escapedFormat}"`);
  }
  
  const command = args.join(' ');
  try {
    return executeDockerCommand(command, 'image listing', options);
  } catch (error) {
    if (error instanceof DockerError) {
      printDockerStatus(error.message, 'error');
    }
    throw error;
  }
}

/**
 * Safely execute docker volume ls commands
 */
export function safeDockerVolumeList(filters = [], format = null, options = {}) {
  const args = ['volume', 'ls'];
  
  filters.forEach(filter => {
    if (typeof filter === 'object' && filter.key && filter.value) {
      const allowedKeys = ['name', 'driver', 'label'];
      if (!allowedKeys.includes(filter.key)) {
        throw new Error(`Docker volume filter key '${filter.key}' is not allowed`);
      }
      
      const escapedValue = filter.value.replace(/["\\]/g, '\\$&');
      args.push(`--filter="${filter.key}=${escapedValue}"`);
    }
  });
  
  if (format) {
    const escapedFormat = format.replace(/["\\]/g, '\\$&');
    args.push(`--format="${escapedFormat}"`);
  }
  
  const command = args.join(' ');
  try {
    return executeDockerCommand(command, 'volume listing', options);
  } catch (error) {
    if (error instanceof DockerError) {
      printDockerStatus(error.message, 'error');
    }
    throw error;
  }
}

/**
 * Safely execute docker network ls commands
 */
export function safeDockerNetworkList(filters = [], format = null, options = {}) {
  const args = ['network', 'ls'];
  
  filters.forEach(filter => {
    if (typeof filter === 'object' && filter.key && filter.value) {
      const allowedKeys = ['name', 'driver', 'type', 'label'];
      if (!allowedKeys.includes(filter.key)) {
        throw new Error(`Docker network filter key '${filter.key}' is not allowed`);
      }
      
      const escapedValue = filter.value.replace(/["\\]/g, '\\$&');
      args.push(`--filter="${filter.key}=${escapedValue}"`);
    }
  });
  
  if (format) {
    const escapedFormat = format.replace(/["\\]/g, '\\$&');
    args.push(`--format="${escapedFormat}"`);
  }
  
  const command = args.join(' ');
  try {
    return executeDockerCommand(command, 'network listing', options);
  } catch (error) {
    if (error instanceof DockerError) {
      printDockerStatus(error.message, 'error');
    }
    throw error;
  }
}

/**
 * Safely execute docker removal commands
 */
export function safeDockerRemove(type, ids, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return '';
  }
  
  const allowedTypes = ['rm', 'rmi', 'volume', 'network'];
  if (!allowedTypes.includes(type)) {
    throw new Error(`Docker remove type '${type}' is not allowed`);
  }
  
  // Validate IDs/names - they should be alphanumeric with limited special chars
  const validIdPattern = /^[a-zA-Z0-9._-]+$/;
  ids.forEach(id => {
    if (!validIdPattern.test(id)) {
      throw new Error(`Docker ID/name '${id}' contains invalid characters`);
    }
  });
  
  let command;
  if (type === 'rm') {
    command = `docker rm -f ${ids.join(' ')}`;
  } else if (type === 'rmi') {
    command = `docker rmi -f ${ids.join(' ')}`;
  } else if (type === 'volume') {
    command = `docker volume rm ${ids.join(' ')}`;
  } else if (type === 'network') {
    command = `docker network rm ${ids.join(' ')}`;
  }
  
  try {
    const result = executeDockerCommand(command.replace('docker ', ''), `${type} removal`, { timeout: 60000, ...options });
    printDockerStatus(`Successfully removed ${ids.length} ${type === 'rm' ? 'containers' : type === 'rmi' ? 'images' : type}`, 'success');
    return result;
  } catch (error) {
    if (error instanceof DockerError) {
      printDockerStatus(error.message, 'error');
      
      // Provide specific guidance based on error type
      if (error.details === 'CONTAINER_NOT_FOUND') {
        printDockerStatus('Some containers may have already been removed', 'warning');
      } else if (error.details === 'IMAGE_NOT_FOUND') {
        printDockerStatus('Some images may have already been removed', 'warning');
      } else if (error.details === 'VOLUME_IN_USE') {
        printDockerStatus('Tip: Stop containers using the volume first', 'info');
      } else if (error.details === 'NETWORK_IN_USE') {
        printDockerStatus('Tip: Disconnect containers from the network first', 'info');
      }
    }
    throw error;
  }
}

/**
 * Check if Docker is available and accessible
 * @param {boolean} verbose - Whether to provide detailed error messages
 * @returns {boolean} - True if Docker is available and working
 */
export function checkDockerSafely(verbose = false) {
  try {
    // Check if docker command exists
    execSync('command -v docker', { stdio: 'ignore', timeout: 5000 });
  } catch (error) {
    if (verbose) {
      printDockerStatus('Docker command not found. Please install Docker.', 'error');
      printDockerStatus('Visit https://docs.docker.com/get-docker/ for installation instructions', 'info');
    }
    return false;
  }
  
  try {
    // Check if docker daemon is accessible
    execSync('docker info', { stdio: 'ignore', timeout: 10000 });
    return true;
  } catch (error) {
    if (verbose) {
      const errorMsg = error.message || '';
      if (errorMsg.includes('Cannot connect')) {
        printDockerStatus('Docker daemon is not running. Please start Docker.', 'error');
        printDockerStatus('Try: "sudo systemctl start docker" or start Docker Desktop', 'info');
      } else if (errorMsg.includes('permission denied')) {
        printDockerStatus('Permission denied accessing Docker.', 'error');
        printDockerStatus('Try: "sudo usermod -aG docker $USER" and restart your terminal', 'info');
      } else {
        printDockerStatus('Docker daemon is not accessible.', 'error');
      }
    }
    return false;
  }
}

// Export DockerError for use in other modules
export { DockerError };