/**
 * Constants used throughout the DevContainer CLI
 */

// File and directory names
export const FILE_NAMES = {
  DEVCONTAINER_JSON: 'devcontainer.json',
  DOCKER_COMPOSE_YML: 'docker-compose.yml',
  DOCKER_COMPOSE_YAML: 'docker-compose.yaml',
  PACKAGE_JSON: 'package.json',
  CARGO_TOML: 'Cargo.toml',
  PYPROJECT_TOML: 'pyproject.toml',
  REQUIREMENTS_TXT: 'requirements.txt',
  PIPFILE: 'Pipfile',
  POETRY_LOCK: 'poetry.lock',
  ENV_EXAMPLE: '.env.example',
  ENV_FILE: '.env',
  README_MD: 'README.md',
  GITIGNORE: '.gitignore'
};

// Directory names
export const DIRECTORY_NAMES = {
  DEVCONTAINER: '.devcontainer',
  DOCKER: 'docker',
  TEMPLATES: 'templates',
  COMPOSE_TEMPLATES: 'templates/compose',
  NODE_MODULES: 'node_modules',
  VENV: 'venv',
  PYCACHE: '__pycache__',
  SRC_TAURI: 'src-tauri',
  PRISMA: 'prisma',
  MIGRATIONS: 'migrations',
  DATABASE: 'database',
  SQL: 'sql',
  JOBS: 'jobs',
  QUEUE: 'queue',
  WORKERS: 'workers',
  BACKGROUND: 'background',
  TASKS: 'tasks',
  SERVICES: 'services',
  MICROSERVICES: 'microservices',
  CLAUDE: '.claude'
};

// Default ports for various services
export const DEFAULT_PORTS = {
  JUPYTER: 8888,
  NEXT_JS: 3000,
  TAURI_DEV: 1420,
  POSTGRES: 5432,
  REDIS: 6379,
  MAILHOG_WEB: 8025,
  MINIO_API: 9000,
  MINIO_CONSOLE: 9001,
  TENSORBOARD: 6006,
  ML_API: 8000,
  VECTOR_DB: 8001,
  API_ALT: 3001
};

// MCP server features
export const MCP_FEATURES = {
  SERENA: 'serena',
  CONTEXT7: 'context7',
  LANGCHAIN_TOOLS: 'langchain-tools',
  VECTOR_DB: 'vector-db',
  WEB_DEV_TOOLS: 'web-dev-tools',
  NEXTJS_TOOLS: 'nextjs-tools',
  RUST_ANALYZER: 'rust-analyzer',
  TAURI_TOOLS: 'tauri-tools'
};

// VS Code extensions
export const VSCODE_EXTENSIONS = {
  CLAUDE: 'anthropic.claude-code',
  PYTHON: 'ms-python.python',
  JUPYTER: 'ms-toolsai.jupyter',
  BLACK_FORMATTER: 'ms-python.black-formatter',
  RUST_ANALYZER: 'rust-lang.rust-analyzer',
  TAURI_VSCODE: 'tauri-apps.tauri-vscode',
  VSCODE_LLDB: 'vadimcn.vscode-lldb',
  TAILWIND_CSS: 'bradlc.vscode-tailwindcss',
  PRETTIER: 'esbenp.prettier-vscode',
  TYPESCRIPT_NEXT: 'ms-vscode.vscode-typescript-next',
  POSTGRES: 'ckolkman.vscode-postgres',
  PRISMA: 'prisma.prisma'
};

// Docker image names
export const DOCKER_IMAGES = {
  PYTHON_ML: 'claude-python-ml:latest',
  RUST_TAURI: 'claude-rust-tauri:latest',
  NEXTJS: 'claude-nextjs:latest',
  BASE: 'claude-base:latest'
};

// DevContainer feature registry paths
export const DEVCONTAINER_FEATURES = {
  CLAUDE_MCP: 'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1',
  HOST_SSH_BUILD: 'ghcr.io/visheshd/claude-devcontainer/host-ssh-build:1'
};

// File patterns for project detection
export const FILE_PATTERNS = {
  PYTHON: ['*.py'],
  JAVASCRIPT: ['*.js', '*.jsx'],
  TYPESCRIPT: ['*.ts', '*.tsx'],
  RUST: ['*.rs'],
  JSON: ['*.json'],
  YAML: ['*.yml', '*.yaml'],
  MARKDOWN: ['*.md'],
  DOCKER: ['Dockerfile', 'Dockerfile.*'],
  IGNORE_PATTERNS: ['**/node_modules/**', '**/venv/**', '**/__pycache__/**', '**/.git/**']
};

// Database dependencies for detection
export const DATABASE_DEPENDENCIES = [
  'prisma',
  'drizzle-orm',
  'pg',
  'mysql2',
  'sqlite3',
  'mongoose',
  'sequelize',
  'typeorm',
  '@prisma/client'
];

// Cache dependencies for detection
export const CACHE_DEPENDENCIES = [
  'redis',
  'ioredis',
  'node-cache',
  'memory-cache',
  'node-redis'
];

// Background job dependencies for detection
export const JOB_DEPENDENCIES = [
  'bull',
  'bullmq',
  'agenda',
  'bee-queue',
  'kue',
  'node-cron'
];

// ML library patterns for Python detection
export const ML_LIBRARIES = [
  'pandas',
  'numpy',
  'sklearn',
  'torch',
  'tensorflow',
  'langchain',
  'openai',
  'transformers',
  'scipy',
  'matplotlib',
  'seaborn',
  'plotly'
];

// Project complexity thresholds
export const COMPLEXITY_THRESHOLDS = {
  SIMPLE: 0,
  MODERATE: 3,
  COMPLEX: 6,
  ENTERPRISE: 9
};

// Multi-service recommendation threshold
export const MULTI_SERVICE_THRESHOLD = 4;

// Resource requirements for different service counts
export const RESOURCE_REQUIREMENTS = {
  SMALL: { cpus: 2, memory: '4gb' },
  MEDIUM: { cpus: 4, memory: '6gb' },
  LARGE: { cpus: 6, memory: '8gb' }
};

// Environment variable templates
export const ENV_TEMPLATES = {
  TWILIO: [
    '# Twilio SMS (optional)',
    '# TWILIO_ACCOUNT_SID=your_account_sid',
    '# TWILIO_AUTH_TOKEN=your_auth_token',
    '# TWILIO_FROM_NUMBER=your_from_number'
  ],
  DATABASE: [
    '# Database Configuration',
    '# DATABASE_URL=postgresql://user:password@localhost:5432/database'
  ],
  REDIS: [
    '# Redis Configuration',
    '# REDIS_URL=redis://localhost:6379'
  ],
  GENERAL: [
    '# Add other environment variables as needed'
  ]
};

// Post-create commands for different stacks
export const POST_CREATE_COMMANDS = {
  'python-ml': 'uv sync || pip install -r requirements.txt || echo "No requirements found"',
  'nextjs': 'pnpm install || npm install || echo "No package.json found"',
  'rust-tauri': 'cargo fetch'
};

// Default Claude settings
export const CLAUDE_SETTINGS = {
  includeCoAuthoredBy: false,
  permissions: {
    allow: [
      'Read(~/.zshrc)',
      'Bash(ls:*)',
      'Bash(find:*)',
      'Bash(grep:*)',
      'Bash(awk:*)',
      'Bash(sed:*)',
      'Bash(git:*)'
    ]
  },
  model: 'sonnet'
};

// Template validation requirements
export const TEMPLATE_REQUIREMENTS = {
  REQUIRED_FILES: ['docker-compose.yml', 'devcontainer.json'],
  OPTIONAL_FILES: ['.env.example', 'README.md'],
  DIRECTORIES: ['docker']
};

// CLI command descriptions
export const COMMAND_DESCRIPTIONS = {
  INIT: 'Initialize a new Claude DevContainer configuration',
  MIGRATE: 'Migrate existing DevContainer configuration to latest Claude setup',
  MIGRATE_SPECIFIC: 'Apply specific change sets',
  CHECK: 'Analyze existing DevContainer configuration for issues',
  CHANGE_SETS: 'List all available change sets',
  DETECT: 'Detect project type in current directory',
  STACKS: 'List available development stacks',
  SERVICES: 'List available multi-service templates',
  COMPOSE: 'Initialize with specific multi-service template'
};

// Validation regex patterns
export const VALIDATION_PATTERNS = {
  STACK_ID: /^[a-z0-9-]+$/,
  TEMPLATE_NAME: /^[a-z0-9-]+$/,
  EXTENSION_ID: /^[a-z0-9-]+\.[a-z0-9-]+$/i,
  SERVICE_NAME: /^[a-z0-9][a-z0-9_-]*$/,
  ENV_VAR_NAME: /^[A-Z_][A-Z0-9_]*$/,
  PROJECT_NAME: /^[^<>:"/\\|?*]+$/
};

// Maximum limits
export const LIMITS = {
  PROJECT_NAME_LENGTH: 100,
  MAX_PORTS: 50,
  MAX_EXTENSIONS: 100,
  MAX_FEATURES: 50,
  MAX_SERVICES: 20,
  MAX_INPUT_LENGTH: 255
};

// Error codes
export const ERROR_CODES = {
  STACK_CONFIG_ERROR: 'STACK_CONFIG_ERROR',
  TEMPLATE_VALIDATION_ERROR: 'TEMPLATE_VALIDATION_ERROR',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  PROJECT_DETECTION_ERROR: 'PROJECT_DETECTION_ERROR',
  CONFIG_GENERATION_ERROR: 'CONFIG_GENERATION_ERROR',
  FILE_OPERATION_ERROR: 'FILE_OPERATION_ERROR',
  COMMAND_VALIDATION_ERROR: 'COMMAND_VALIDATION_ERROR',
  DOCKER_COMPOSE_ERROR: 'DOCKER_COMPOSE_ERROR',
  FEATURE_CONFIG_ERROR: 'FEATURE_CONFIG_ERROR',
  DEPENDENCY_VALIDATION_ERROR: 'DEPENDENCY_VALIDATION_ERROR'
};

// Success messages
export const SUCCESS_MESSAGES = {
  INIT_SINGLE: 'DevContainer configuration created successfully!',
  INIT_MULTI: 'Multi-service DevContainer setup complete!',
  MIGRATION: 'DevContainer configuration migrated successfully!',
  VALIDATION: 'Configuration validation passed!',
  TEMPLATE_COPIED: 'Template files copied successfully!'
};

// Warning messages
export const WARNING_MESSAGES = {
  NO_PROJECT_TYPE: 'No specific project type detected',
  HIGH_COMPLEXITY: 'High complexity project - multi-service setup recommended',
  MISSING_FILES: 'Some recommended files are missing',
  DEPRECATED_CONFIG: 'Configuration uses deprecated settings'
};