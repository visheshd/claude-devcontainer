/**
 * Validation utilities for DevContainer configurations and inputs
 */

/**
 * Validate stack ID format
 * @param {string} stackId - Stack ID to validate
 * @returns {boolean} True if valid
 */
export function isValidStackId(stackId) {
  return typeof stackId === 'string' && 
         stackId.length > 0 && 
         /^[a-z0-9-]+$/.test(stackId);
}

/**
 * Validate template name format
 * @param {string} templateName - Template name to validate
 * @returns {boolean} True if valid
 */
export function isValidTemplateName(templateName) {
  return typeof templateName === 'string' && 
         templateName.length > 0 && 
         /^[a-z0-9-]+$/.test(templateName);
}

/**
 * Validate port number
 * @param {number} port - Port number to validate
 * @returns {boolean} True if valid
 */
export function isValidPort(port) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Validate array of port numbers
 * @param {number[]} ports - Array of ports to validate
 * @returns {Object} Validation result
 */
export function validatePorts(ports) {
  if (!Array.isArray(ports)) {
    return { isValid: false, error: 'Ports must be an array' };
  }

  const invalidPorts = ports.filter(port => !isValidPort(port));
  if (invalidPorts.length > 0) {
    return { 
      isValid: false, 
      error: `Invalid ports: ${invalidPorts.join(', ')}. Ports must be integers between 1 and 65535` 
    };
  }

  return { isValid: true };
}

/**
 * Validate VS Code extension ID format
 * @param {string} extensionId - Extension ID to validate
 * @returns {boolean} True if valid
 */
export function isValidVSCodeExtension(extensionId) {
  return typeof extensionId === 'string' && 
         /^[a-z0-9-]+\.[a-z0-9-]+$/i.test(extensionId);
}

/**
 * Validate array of VS Code extensions
 * @param {string[]} extensions - Array of extension IDs
 * @returns {Object} Validation result
 */
export function validateVSCodeExtensions(extensions) {
  if (!Array.isArray(extensions)) {
    return { isValid: false, error: 'Extensions must be an array' };
  }

  const invalidExtensions = extensions.filter(ext => !isValidVSCodeExtension(ext));
  if (invalidExtensions.length > 0) {
    return { 
      isValid: false, 
      error: `Invalid extension IDs: ${invalidExtensions.join(', ')}. Format should be "publisher.name"` 
    };
  }

  return { isValid: true };
}

/**
 * Validate project name format
 * @param {string} name - Project name to validate
 * @returns {boolean} True if valid
 */
export function isValidProjectName(name) {
  return typeof name === 'string' && 
         name.length > 0 && 
         name.length <= 100 &&
         !/[<>:"/\\|?*]/.test(name);
}

/**
 * Validate feature name format
 * @param {string} feature - Feature name to validate
 * @returns {boolean} True if valid
 */
export function isValidFeatureName(feature) {
  return typeof feature === 'string' && 
         feature.length > 0 && 
         /^[a-z0-9-]+$/.test(feature);
}

/**
 * Validate array of feature names
 * @param {string[]} features - Array of feature names
 * @returns {Object} Validation result
 */
export function validateFeatures(features) {
  if (!Array.isArray(features)) {
    return { isValid: false, error: 'Features must be an array' };
  }

  const invalidFeatures = features.filter(feature => !isValidFeatureName(feature));
  if (invalidFeatures.length > 0) {
    return { 
      isValid: false, 
      error: `Invalid feature names: ${invalidFeatures.join(', ')}. Use lowercase letters, numbers, and hyphens only` 
    };
  }

  return { isValid: true };
}

/**
 * Validate Docker image name format
 * @param {string} imageName - Docker image name to validate
 * @returns {boolean} True if valid
 */
export function isValidDockerImage(imageName) {
  if (typeof imageName !== 'string' || imageName.length === 0) {
    return false;
  }

  // Basic Docker image name validation
  // Supports: name, name:tag, registry/name:tag
  const imagePattern = /^(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(?:(?:\.(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))+)?(?::[0-9]+)?\/)?[a-z0-9]+(?:(?:(?:[._]|__|[-]*)[a-z0-9]+)+)?(?:(?:\/[a-z0-9]+(?:(?:(?:[._]|__|[-]*)[a-z0-9]+)+)?)+)?(?::[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127})?$/;
  
  return imagePattern.test(imageName);
}

/**
 * Validate service name format (for Docker Compose)
 * @param {string} serviceName - Service name to validate
 * @returns {boolean} True if valid
 */
export function isValidServiceName(serviceName) {
  return typeof serviceName === 'string' && 
         serviceName.length > 0 && 
         /^[a-z0-9][a-z0-9_-]*$/.test(serviceName);
}

/**
 * Validate array of service names
 * @param {string[]} services - Array of service names
 * @returns {Object} Validation result
 */
export function validateServiceNames(services) {
  if (!Array.isArray(services)) {
    return { isValid: false, error: 'Services must be an array' };
  }

  const invalidServices = services.filter(service => !isValidServiceName(service));
  if (invalidServices.length > 0) {
    return { 
      isValid: false, 
      error: `Invalid service names: ${invalidServices.join(', ')}. Use lowercase letters, numbers, underscores, and hyphens only` 
    };
  }

  return { isValid: true };
}

/**
 * Validate environment variable name
 * @param {string} varName - Environment variable name
 * @returns {boolean} True if valid
 */
export function isValidEnvVarName(varName) {
  return typeof varName === 'string' && 
         /^[A-Z_][A-Z0-9_]*$/.test(varName);
}

/**
 * Validate mount string format (Docker mount)
 * @param {string} mount - Mount string to validate
 * @returns {boolean} True if valid
 */
export function isValidMount(mount) {
  if (typeof mount !== 'string' || mount.length === 0) {
    return false;
  }

  // Basic mount validation: should contain source and target
  return mount.includes('source=') && mount.includes('target=');
}

/**
 * Validate array of mounts
 * @param {string[]} mounts - Array of mount strings
 * @returns {Object} Validation result
 */
export function validateMounts(mounts) {
  if (!Array.isArray(mounts)) {
    return { isValid: false, error: 'Mounts must be an array' };
  }

  const invalidMounts = mounts.filter(mount => !isValidMount(mount));
  if (invalidMounts.length > 0) {
    return { 
      isValid: false, 
      error: `Invalid mount format: ${invalidMounts.join(', ')}. Must include source= and target=` 
    };
  }

  return { isValid: true };
}

/**
 * Validate DevContainer configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Detailed validation result
 */
export function validateDevContainerConfiguration(config) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Configuration must have a valid name');
  }

  // Container setup validation
  if (!config.dockerComposeFile && !config.image) {
    errors.push('Configuration must specify either "image" or "dockerComposeFile"');
  }

  if (config.dockerComposeFile && !config.service) {
    errors.push('Multi-service configuration must specify "service"');
  }

  if (config.image && !isValidDockerImage(config.image)) {
    errors.push(`Invalid Docker image name: ${config.image}`);
  }

  if (config.service && !isValidServiceName(config.service)) {
    errors.push(`Invalid service name: ${config.service}`);
  }

  // Ports validation
  if (config.forwardPorts) {
    const portValidation = validatePorts(config.forwardPorts);
    if (!portValidation.isValid) {
      errors.push(portValidation.error);
    }
  }

  // Extensions validation
  if (config.customizations?.vscode?.extensions) {
    const extensionValidation = validateVSCodeExtensions(config.customizations.vscode.extensions);
    if (!extensionValidation.isValid) {
      errors.push(extensionValidation.error);
    }
  }

  // Mounts validation
  if (config.mounts) {
    const mountValidation = validateMounts(config.mounts);
    if (!mountValidation.isValid) {
      errors.push(mountValidation.error);
    }
  }

  // Features validation
  if (config.features && typeof config.features === 'object') {
    const featureKeys = Object.keys(config.features);
    const invalidFeatureKeys = featureKeys.filter(key => !key.includes('/') && !key.includes(':'));
    
    if (invalidFeatureKeys.length > 0) {
      warnings.push(`Feature keys should include registry path: ${invalidFeatureKeys.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize user input by removing potentially dangerous characters
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>:"/\\|?*]/g, '') // Remove file system unsafe characters
    .replace(/\x00/g, '') // Remove null bytes
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * Validate that required dependencies are available
 * @param {string[]} dependencies - Array of dependency names to check
 * @returns {Object} Validation result with missing dependencies
 */
export function validateDependencies(dependencies) {
  const missing = [];
  
  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      missing.push(dep);
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}