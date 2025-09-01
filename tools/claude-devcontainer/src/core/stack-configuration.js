/**
 * Stack configurations for Claude DevContainer environments
 * Both single-container and multi-service stacks are supported
 */

// Stack configurations
export const STACKS = {
  'python-ml': {
    name: 'Python ML',
    description: 'Python with ML libraries, LangChain, Jupyter',
    image: 'claude-python-ml:latest',
    ports: [8888], // Jupyter
    features: ['serena', 'context7', 'langchain-tools', 'vector-db'],
    extensions: [
      'ms-python.python',
      'ms-toolsai.jupyter',
      'ms-python.black-formatter'
    ]
  },
  'rust-tauri': {
    name: 'Rust Tauri',
    description: 'Rust with Tauri v2 for desktop apps',
    image: 'claude-rust-tauri:latest',
    ports: [1420], // Tauri dev server
    features: ['serena', 'context7', 'rust-analyzer', 'tauri-tools'],
    extensions: [
      'rust-lang.rust-analyzer',
      'tauri-apps.tauri-vscode',
      'vadimcn.vscode-lldb'
    ],
    hostBuilds: true
  },
  'nextjs': {
    name: 'Next.js',
    description: 'Next.js with modern web development tools',
    image: 'claude-nextjs:latest',
    ports: [3000], // Next.js dev server
    features: ['serena', 'context7', 'web-dev-tools', 'nextjs-tools'],
    extensions: [
      'bradlc.vscode-tailwindcss',
      'esbenp.prettier-vscode',
      'ms-vscode.vscode-typescript-next'
    ]
  },
  'custom': {
    name: 'Custom',
    description: 'Base Claude environment for custom configuration',
    image: 'claude-base:latest',
    features: ['serena', 'context7'],
    extensions: []
  },
  // Multi-service stacks
  'web-db': {
    name: 'Web + Database',
    description: 'Next.js with PostgreSQL and Redis',
    template: 'web-db-stack',
    multiService: true,
    services: ['app', 'db', 'redis'],
    ports: [3000, 3001, 5432, 6379],
    features: ['serena', 'context7', 'web-dev-tools', 'nextjs-tools'],
    extensions: [
      'bradlc.vscode-tailwindcss',
      'esbenp.prettier-vscode',
      'ms-vscode.vscode-typescript-next',
      'ckolkman.vscode-postgres'
    ]
  },
  'python-ml-services': {
    name: 'Python ML Services',
    description: 'Python ML with Vector DB and Redis',
    template: 'python-ml-services',
    multiService: true,
    services: ['app', 'vectordb', 'redis'],
    ports: [8888, 8000, 6006, 5432, 6379, 8001],
    features: ['serena', 'context7', 'langchain-tools', 'vector-db'],
    extensions: [
      'ms-python.python',
      'ms-toolsai.jupyter',
      'ms-python.black-formatter',
      'ckolkman.vscode-postgres'
    ]
  },
  'fullstack': {
    name: 'Full-Stack App',
    description: 'Complete web app with background services',
    template: 'fullstack-nextjs',
    multiService: true,
    services: ['app', 'worker', 'db', 'redis', 'mail', 'storage'],
    ports: [3000, 3001, 5432, 6379, 8025, 9000, 9001],
    features: ['serena', 'context7', 'web-dev-tools', 'nextjs-tools'],
    extensions: [
      'bradlc.vscode-tailwindcss',
      'esbenp.prettier-vscode',
      'ms-vscode.vscode-typescript-next',
      'ckolkman.vscode-postgres',
      'prisma.prisma'
    ],
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
  const singleContainerRequired = ['image'];
  const multiServiceRequired = ['template', 'services'];
  
  // Check basic required fields
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Stack configuration missing required field: ${field}`);
    }
  }
  
  // Check type-specific required fields
  if (config.multiService) {
    for (const field of multiServiceRequired) {
      if (!config[field]) {
        throw new Error(`Multi-service stack configuration missing required field: ${field}`);
      }
    }
  } else {
    for (const field of singleContainerRequired) {
      if (!config[field]) {
        throw new Error(`Single-container stack configuration missing required field: ${field}`);
      }
    }
  }
  
  // Validate arrays
  if (config.extensions && !Array.isArray(config.extensions)) {
    throw new Error('Stack configuration "extensions" must be an array');
  }
  
  if (config.features && !Array.isArray(config.features)) {
    throw new Error('Stack configuration "features" must be an array');
  }
  
  if (config.ports && !Array.isArray(config.ports)) {
    throw new Error('Stack configuration "ports" must be an array');
  }
  
  return true;
}