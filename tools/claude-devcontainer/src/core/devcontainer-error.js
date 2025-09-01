/**
 * Custom error classes for DevContainer operations
 * Provides specific error types for better error handling and user feedback
 */

/**
 * Base error class for all DevContainer-related errors
 */
export class DevContainerError extends Error {
  constructor(message, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a stack configuration is invalid or missing
 */
export class StackConfigurationError extends DevContainerError {
  constructor(stackId, message = null, details = null) {
    const errorMessage = message || `Invalid or missing stack configuration for "${stackId}"`;
    super(errorMessage, 'STACK_CONFIG_ERROR', details);
    this.stackId = stackId;
  }
}

/**
 * Error thrown when template validation fails
 */
export class TemplateValidationError extends DevContainerError {
  constructor(templateName, message = null, missingFiles = []) {
    const errorMessage = message || `Template "${templateName}" validation failed`;
    super(errorMessage, 'TEMPLATE_VALIDATION_ERROR', { missingFiles });
    this.templateName = templateName;
    this.missingFiles = missingFiles;
  }
}

/**
 * Error thrown when a template is not found
 */
export class TemplateNotFoundError extends DevContainerError {
  constructor(templateName, templatePath = null) {
    const message = `Template "${templateName}" not found` + (templatePath ? ` at ${templatePath}` : '');
    super(message, 'TEMPLATE_NOT_FOUND', { templatePath });
    this.templateName = templateName;
    this.templatePath = templatePath;
  }
}

/**
 * Error thrown when project detection fails
 */
export class ProjectDetectionError extends DevContainerError {
  constructor(projectPath, message = null) {
    const errorMessage = message || `Failed to detect project type at "${projectPath}"`;
    super(errorMessage, 'PROJECT_DETECTION_ERROR', { projectPath });
    this.projectPath = projectPath;
  }
}

/**
 * Error thrown when configuration generation fails
 */
export class ConfigGenerationError extends DevContainerError {
  constructor(stackId, message = null, configType = null) {
    const errorMessage = message || `Failed to generate configuration for stack "${stackId}"`;
    super(errorMessage, 'CONFIG_GENERATION_ERROR', { stackId, configType });
    this.stackId = stackId;
    this.configType = configType;
  }
}

/**
 * Error thrown when file operations fail
 */
export class FileOperationError extends DevContainerError {
  constructor(operation, filePath, message = null, originalError = null) {
    const errorMessage = message || `File operation "${operation}" failed for "${filePath}"`;
    super(errorMessage, 'FILE_OPERATION_ERROR', { operation, filePath, originalError });
    this.operation = operation;
    this.filePath = filePath;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when CLI command validation fails
 */
export class CommandValidationError extends DevContainerError {
  constructor(command, message = null, validationDetails = null) {
    const errorMessage = message || `Command validation failed for "${command}"`;
    super(errorMessage, 'COMMAND_VALIDATION_ERROR', validationDetails);
    this.command = command;
  }
}

/**
 * Error thrown when Docker Compose operations fail
 */
export class DockerComposeError extends DevContainerError {
  constructor(operation, message = null, composeFile = null) {
    const errorMessage = message || `Docker Compose operation "${operation}" failed`;
    super(errorMessage, 'DOCKER_COMPOSE_ERROR', { operation, composeFile });
    this.operation = operation;
    this.composeFile = composeFile;
  }
}

/**
 * Error thrown when feature configuration is invalid
 */
export class FeatureConfigurationError extends DevContainerError {
  constructor(featureName, message = null, configDetails = null) {
    const errorMessage = message || `Feature configuration error for "${featureName}"`;
    super(errorMessage, 'FEATURE_CONFIG_ERROR', configDetails);
    this.featureName = featureName;
  }
}

/**
 * Error thrown when dependency validation fails
 */
export class DependencyValidationError extends DevContainerError {
  constructor(dependency, message = null, requiredVersion = null) {
    const errorMessage = message || `Dependency validation failed for "${dependency}"`;
    super(errorMessage, 'DEPENDENCY_VALIDATION_ERROR', { dependency, requiredVersion });
    this.dependency = dependency;
    this.requiredVersion = requiredVersion;
  }
}

/**
 * Utility function to format error messages for CLI display
 * @param {Error} error - The error to format
 * @returns {string} Formatted error message
 */
export function formatErrorForCLI(error) {
  if (error instanceof DevContainerError) {
    let message = `${error.name}: ${error.message}`;
    
    if (error.details) {
      if (error.details.missingFiles && error.details.missingFiles.length > 0) {
        message += `\nMissing files: ${error.details.missingFiles.join(', ')}`;
      }
      
      if (error.details.templatePath) {
        message += `\nTemplate path: ${error.details.templatePath}`;
      }
      
      if (error.details.projectPath) {
        message += `\nProject path: ${error.details.projectPath}`;
      }
    }
    
    if (error.code) {
      message += `\nError code: ${error.code}`;
    }
    
    return message;
  }
  
  return error.message || 'An unknown error occurred';
}

/**
 * Utility function to check if an error is recoverable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is recoverable
 */
export function isRecoverableError(error) {
  if (!(error instanceof DevContainerError)) {
    return false;
  }
  
  const recoverableErrorTypes = [
    'TEMPLATE_NOT_FOUND',
    'PROJECT_DETECTION_ERROR',
    'COMMAND_VALIDATION_ERROR'
  ];
  
  return recoverableErrorTypes.includes(error.code);
}

/**
 * Utility function to suggest solutions based on error type
 * @param {Error} error - The error to analyze
 * @returns {string[]} Array of suggested solutions
 */
export function getSuggestedSolutions(error) {
  if (!(error instanceof DevContainerError)) {
    return ['Check the error message and try again'];
  }
  
  const suggestions = {
    'STACK_CONFIG_ERROR': [
      'Verify the stack ID is correct',
      'Check available stacks with: claude-devcontainer list',
      'Ensure stack configuration is properly defined'
    ],
    'TEMPLATE_VALIDATION_ERROR': [
      'Check if template files exist',
      'Verify template structure matches requirements',
      'Try recreating the template or use a different one'
    ],
    'TEMPLATE_NOT_FOUND': [
      'Check if the template name is correct',
      'List available templates with: claude-devcontainer services',
      'Verify templates directory exists and is accessible'
    ],
    'PROJECT_DETECTION_ERROR': [
      'Ensure you are in a valid project directory',
      'Check if project files (package.json, Cargo.toml, etc.) exist',
      'Try specifying the stack explicitly'
    ],
    'CONFIG_GENERATION_ERROR': [
      'Verify stack configuration is valid',
      'Check if all required parameters are provided',
      'Try using a simpler stack configuration first'
    ],
    'FILE_OPERATION_ERROR': [
      'Check file permissions',
      'Ensure target directory exists and is writable',
      'Verify disk space is available'
    ],
    'COMMAND_VALIDATION_ERROR': [
      'Check command syntax and parameters',
      'Use --help flag to see available options',
      'Verify you are in the correct directory'
    ],
    'DOCKER_COMPOSE_ERROR': [
      'Verify Docker Compose is installed',
      'Check docker-compose.yml syntax',
      'Ensure Docker daemon is running'
    ]
  };
  
  return suggestions[error.code] || ['Check the error message and try again'];
}