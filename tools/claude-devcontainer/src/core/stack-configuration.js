/**
 * Stack configurations for Claude DevContainer environments
 * Both single-container and multi-service stacks are supported
 */

// Stack configurations
// Note: Specific configurations (ports, extensions, features) are now handled
// by the template inheritance system. This only contains metadata.
export const STACKS = {
  'python-ml': {
    name: 'Python ML',
    description: 'Python with ML libraries, LangChain, Jupyter',
    hostBuilds: false
  },
  'rust-tauri': {
    name: 'Rust Tauri',
    description: 'Rust with Tauri v2 for desktop apps',
    hostBuilds: true
  },
  'nextjs': {
    name: 'Next.js',
    description: 'Next.js with modern web development tools',
    hostBuilds: false
  },
  'custom': {
    name: 'Custom',
    description: 'Base Claude environment for custom configuration',
    hostBuilds: false
  },
  // Multi-service stacks
  'web-db': {
    name: 'Web + Database',
    description: 'Next.js with PostgreSQL and Redis',
    template: 'web-db-stack',
    multiService: true,
    services: ['app', 'db', 'redis']
  },
  'python-ml-services': {
    name: 'Python ML Services',
    description: 'Python ML with Vector DB and Redis',
    template: 'python-ml-services',
    multiService: true,
    services: ['app', 'vectordb', 'redis']
  },
  'fullstack': {
    name: 'Full-Stack App',
    description: 'Complete web app with background services',
    template: 'fullstack-nextjs',
    multiService: true,
    services: ['app', 'worker', 'db', 'redis', 'mail', 'storage'],
    profiles: ['full']
  }
};

/**
 * Get stack configuration by ID
 * @param {string} stackId - The stack identifier
 * @returns {Object} Stack configuration object
 * @throws {Error} If stack is not found
 */
export function getStack(stackId) {
  const stack = STACKS[stackId];
  if (!stack) {
    throw new Error(`Stack "${stackId}" not found. Available stacks: ${Object.keys(STACKS).join(', ')}`);
  }
  return stack;
}

/**
 * Get all available stack IDs
 * @returns {string[]} Array of stack IDs
 */
export function getAvailableStacks() {
  return Object.keys(STACKS);
}

/**
 * Get stacks filtered by type
 * @param {boolean} multiService - Filter for multi-service stacks
 * @returns {Object} Filtered stacks object
 */
export function getStacksByType(multiService = false) {
  return Object.fromEntries(
    Object.entries(STACKS).filter(([_, config]) => 
      Boolean(config.multiService) === multiService
    )
  );
}

/**
 * Validate stack configuration
 * @param {Object} config - Stack configuration to validate
 * @returns {boolean} True if valid
 * @throws {Error} If configuration is invalid
 */
export function validateStackConfig(config) {
  const required = ['name', 'description'];
  const multiServiceRequired = ['template', 'services'];
  
  // Check basic required fields
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Stack configuration missing required field: ${field}`);
    }
  }
  
  // Check multi-service specific required fields
  if (config.multiService) {
    for (const field of multiServiceRequired) {
      if (!config[field]) {
        throw new Error(`Multi-service stack configuration missing required field: ${field}`);
      }
    }
    
    // Validate services array
    if (config.services && !Array.isArray(config.services)) {
      throw new Error('Multi-service stack configuration "services" must be an array');
    }
  }
  
  // Validate optional fields
  if (config.hostBuilds !== undefined && typeof config.hostBuilds !== 'boolean') {
    throw new Error('Stack configuration "hostBuilds" must be a boolean');
  }
  
  return true;
}