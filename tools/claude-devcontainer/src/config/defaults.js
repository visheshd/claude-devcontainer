import { 
  CLAUDE_SETTINGS, 
  ENV_TEMPLATES, 
  VSCODE_EXTENSIONS, 
  DEVCONTAINER_FEATURES,
  MCP_FEATURES 
} from './constants.js';

/**
 * Default configurations for DevContainer setups
 */

/**
 * Default mount configurations for all DevContainer setups
 * @returns {string[]} Array of mount strings
 */
export function getDefaultMounts() {
  return [
    'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind'
  ];
}

/**
 * Default VS Code settings for multi-service setups
 * @returns {Object} VS Code settings object
 */
export function getDefaultVSCodeSettings() {
  return {
    'editor.formatOnSave': true,
    'git.enableSmartCommit': true,
    'git.confirmSync': false,
    'git.autofetch': true,
    'terminal.integrated.defaultProfile.linux': 'zsh'
  };
}

/**
 * Default VS Code extensions (always includes Claude)
 * @param {string[]} additionalExtensions - Additional extensions to include
 * @returns {string[]} Array of extension IDs
 */
export function getDefaultVSCodeExtensions(additionalExtensions = []) {
  return [
    VSCODE_EXTENSIONS.CLAUDE,
    ...additionalExtensions
  ];
}

/**
 * Default MCP features for basic setups
 * @returns {string[]} Array of MCP feature names
 */
export function getDefaultMCPFeatures() {
  return [
    MCP_FEATURES.SERENA,
    MCP_FEATURES.CONTEXT7
  ];
}

/**
 * Default Claude settings configuration
 * @returns {Object} Claude settings object
 */
export function getDefaultClaudeSettings() {
  return { ...CLAUDE_SETTINGS };
}

/**
 * Default environment variables template
 * @param {Object} options - Template options
 * @returns {string[]} Array of environment variable lines
 */
export function getDefaultEnvTemplate(options = {}) {
  const lines = [
    '# Environment Variables for Claude DevContainer',
    '# Copy to .env and fill in your values',
    ''
  ];

  if (options.includeTwilio !== false) {
    lines.push(...ENV_TEMPLATES.TWILIO, '');
  }

  if (options.includeDatabase) {
    lines.push(...ENV_TEMPLATES.DATABASE, '');
  }

  if (options.includeRedis) {
    lines.push(...ENV_TEMPLATES.REDIS, '');
  }

  lines.push(...ENV_TEMPLATES.GENERAL);
  
  return lines;
}

/**
 * Default DevContainer base configuration
 * @param {string} name - Configuration name
 * @returns {Object} Base DevContainer configuration
 */
export function getBaseDevContainerConfig(name) {
  return {
    name,
    mounts: getDefaultMounts(),
    customizations: {
      vscode: {
        extensions: [VSCODE_EXTENSIONS.CLAUDE]
      }
    }
  };
}

/**
 * Default single-container DevContainer configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Single-container DevContainer configuration
 */
export function getSingleContainerDefaults(options = {}) {
  const config = getBaseDevContainerConfig(options.name || 'Claude Development Environment');
  
  return {
    ...config,
    image: options.image || 'claude-base:latest',
    features: {
      [DEVCONTAINER_FEATURES.CLAUDE_MCP]: {
        servers: (options.features || getDefaultMCPFeatures()).join(',')
      }
    },
    forwardPorts: options.ports || [],
    postCreateCommand: options.postCreateCommand || null,
    remoteUser: 'claude-user'
  };
}

/**
 * Default multi-service DevContainer configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Multi-service DevContainer configuration
 */
export function getMultiServiceDefaults(options = {}) {
  const config = getBaseDevContainerConfig(options.name || 'Multi-Service Development');
  
  return {
    ...config,
    dockerComposeFile: options.composeFile || 'docker-compose.yml',
    service: options.service || 'app',
    workspaceFolder: options.workspaceFolder || '/workspace',
    features: {
      [DEVCONTAINER_FEATURES.CLAUDE_MCP]: {
        servers: (options.features || getDefaultMCPFeatures()).join(',')
      }
    },
    customizations: {
      vscode: {
        extensions: getDefaultVSCodeExtensions(options.extensions || []),
        settings: getDefaultVSCodeSettings()
      }
    },
    forwardPorts: options.ports || [],
    hostRequirements: options.hostRequirements || { cpus: 2, memory: '4gb' },
    remoteUser: 'claude-user'
  };
}

/**
 * Default Docker Compose service configuration
 * @param {Object} options - Service options
 * @returns {Object} Docker Compose service configuration
 */
export function getDefaultComposeService(options = {}) {
  return {
    build: options.build || {
      context: '.',
      dockerfile: 'Dockerfile'
    },
    volumes: [
      './:/workspace:cached'
    ],
    working_dir: '/workspace',
    command: options.command || 'sleep infinity',
    environment: options.environment || {},
    ports: options.ports || [],
    depends_on: options.dependsOn || []
  };
}

/**
 * Default PostgreSQL service for Docker Compose
 * @param {Object} options - Database options
 * @returns {Object} PostgreSQL service configuration
 */
export function getPostgreSQLService(options = {}) {
  return {
    image: options.image || 'postgres:15',
    environment: {
      POSTGRES_DB: options.database || 'claude_dev',
      POSTGRES_USER: options.user || 'postgres',
      POSTGRES_PASSWORD: options.password || 'postgres',
      ...options.environment
    },
    ports: [`${options.port || 5432}:5432`],
    volumes: [
      'postgres_data:/var/lib/postgresql/data',
      ...(options.volumes || [])
    ],
    healthcheck: {
      test: ['CMD-SHELL', 'pg_isready -U postgres'],
      interval: '30s',
      timeout: '10s',
      retries: 5
    }
  };
}

/**
 * Default Redis service for Docker Compose
 * @param {Object} options - Redis options
 * @returns {Object} Redis service configuration
 */
export function getRedisService(options = {}) {
  return {
    image: options.image || 'redis:7-alpine',
    ports: [`${options.port || 6379}:6379`],
    volumes: [
      'redis_data:/data',
      ...(options.volumes || [])
    ],
    command: options.command || 'redis-server --appendonly yes',
    healthcheck: {
      test: ['CMD', 'redis-cli', 'ping'],
      interval: '30s',
      timeout: '10s',
      retries: 5
    }
  };
}

/**
 * Default volumes for Docker Compose
 * @param {string[]} additionalVolumes - Additional volume names
 * @returns {Object} Volumes configuration
 */
export function getDefaultComposeVolumes(additionalVolumes = []) {
  const defaultVolumes = {
    postgres_data: {},
    redis_data: {}
  };

  additionalVolumes.forEach(volume => {
    defaultVolumes[volume] = {};
  });

  return defaultVolumes;
}

/**
 * Default networks for Docker Compose
 * @returns {Object} Networks configuration
 */
export function getDefaultComposeNetworks() {
  return {
    claude_network: {
      driver: 'bridge'
    }
  };
}

/**
 * Complete default Docker Compose configuration
 * @param {Object} options - Compose options
 * @returns {Object} Docker Compose configuration
 */
export function getDefaultDockerCompose(options = {}) {
  return {
    version: '3.8',
    services: {
      app: getDefaultComposeService({
        ...options.app,
        depends_on: options.dependencies || []
      }),
      ...(options.includePostgres && { db: getPostgreSQLService(options.postgres) }),
      ...(options.includeRedis && { redis: getRedisService(options.redis) }),
      ...options.additionalServices
    },
    volumes: getDefaultComposeVolumes(options.additionalVolumes),
    networks: getDefaultComposeNetworks()
  };
}

/**
 * Default resource requirements based on complexity
 * @param {number} complexity - Complexity score (0-10)
 * @returns {Object} Resource requirements
 */
export function getDefaultResourceRequirements(complexity) {
  if (complexity <= 2) {
    return { cpus: 2, memory: '4gb' };
  } else if (complexity <= 6) {
    return { cpus: 4, memory: '6gb' };
  } else {
    return { cpus: 6, memory: '8gb' };
  }
}

/**
 * Default host build requirements for stacks that support it
 * @returns {Object} Host build feature configuration
 */
export function getHostBuildDefaults() {
  return {
    [DEVCONTAINER_FEATURES.HOST_SSH_BUILD]: {
      enableMacosBuild: true
    }
  };
}

/**
 * Default .gitignore entries for DevContainer projects
 * @returns {string[]} Array of .gitignore patterns
 */
export function getDefaultGitignore() {
  return [
    '# DevContainer',
    '.devcontainer/.env',
    '',
    '# Environment files',
    '.env',
    '.env.local',
    '.env.*.local',
    '',
    '# Dependencies',
    'node_modules/',
    '__pycache__/',
    '*.pyc',
    'target/',
    'Cargo.lock',
    '',
    '# IDE',
    '.vscode/settings.json',
    '.idea/',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db'
  ];
}