import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * ProjectDetector handles automatic detection of project types and requirements
 * to suggest appropriate DevContainer stacks
 */
export class ProjectDetector {
  /**
   * Detect project type and suggest appropriate stacks
   * @param {string} projectPath - Path to the project directory
   * @returns {string[]} Array of suggested stack IDs
   */
  detectProjectType(projectPath = '.') {
    const detectedStacks = [];
    
    // Check for existing docker-compose configuration
    if (this.hasExistingCompose(projectPath)) {
      detectedStacks.push('existing-compose');
    }
    
    // Check for multi-service indicators
    const hasDatabase = this.detectDatabaseUsage(projectPath);
    const hasCache = this.detectCacheUsage(projectPath);
    const hasBackgroundJobs = this.detectBackgroundJobs(projectPath);
    
    // Detect different project types
    detectedStacks.push(...this.detectNodeJsProject(projectPath, hasDatabase, hasCache));
    detectedStacks.push(...this.detectRustProject(projectPath));
    detectedStacks.push(...this.detectPythonProject(projectPath, hasDatabase, hasCache));
    
    return detectedStacks;
  }

  /**
   * Check for existing Docker Compose configuration
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if docker-compose files exist
   */
  hasExistingCompose(projectPath) {
    return fs.existsSync(path.join(projectPath, 'docker-compose.yml')) ||
           fs.existsSync(path.join(projectPath, 'docker-compose.yaml'));
  }

  /**
   * Detect Node.js project and suggest appropriate stack
   * @param {string} projectPath - Project directory path
   * @param {boolean} hasDatabase - Whether database usage is detected
   * @param {boolean} hasCache - Whether cache usage is detected
   * @returns {string[]} Array of suggested stacks
   */
  detectNodeJsProject(projectPath, hasDatabase, hasCache) {
    if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
      return [];
    }

    try {
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        // Next.js project - suggest multi-service for complex needs
        if (hasDatabase && hasCache) {
          return ['fullstack'];
        } else if (hasDatabase) {
          return ['web-db'];
        } else {
          return ['nextjs'];
        }
      } else {
        return ['custom']; // Generic Node.js falls back to custom stack
      }
    } catch (error) {
      console.warn(`Warning: Could not parse package.json: ${error.message}`);
      return ['custom']; // Fallback to custom stack
    }
  }

  /**
   * Detect Rust project and suggest appropriate stack
   * @param {string} projectPath - Project directory path
   * @returns {string[]} Array of suggested stacks
   */
  detectRustProject(projectPath) {
    if (!fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      return [];
    }

    if (fs.existsSync(path.join(projectPath, 'src-tauri'))) {
      return ['rust-tauri'];
    } else {
      return ['rust'];
    }
  }

  /**
   * Detect Python project and suggest appropriate stack
   * @param {string} projectPath - Project directory path
   * @param {boolean} hasDatabase - Whether database usage is detected
   * @param {boolean} hasCache - Whether cache usage is detected
   * @returns {string[]} Array of suggested stacks
   */
  detectPythonProject(projectPath, hasDatabase, hasCache) {
    const pythonIndicators = [
      'pyproject.toml',
      'setup.py', 
      'requirements.txt',
      'Pipfile',
      'poetry.lock'
    ];

    const hasPythonProject = pythonIndicators.some(indicator =>
      fs.existsSync(path.join(projectPath, indicator))
    );

    if (!hasPythonProject) {
      return [];
    }

    // Check for ML indicators in Python files
    const hasMLIndicators = this.detectMLLibraries(projectPath);
    
    if (hasMLIndicators) {
      // Suggest ML services for ML projects with complex needs
      if (hasDatabase || hasCache) {
        return ['python-ml-services'];
      } else {
        return ['python-ml'];
      }
    } else {
      return ['python'];
    }
  }

  /**
   * Detect ML libraries in Python files
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if ML libraries are detected
   */
  detectMLLibraries(projectPath) {
    try {
      const pyFiles = glob.sync('**/*.py', { 
        cwd: projectPath, 
        ignore: ['**/node_modules/**', '**/venv/**', '**/__pycache__/**'],
        maxDepth: 3 // Limit depth for performance
      });

      const mlLibraryPattern = /import\s+(pandas|numpy|sklearn|torch|tensorflow|langchain|openai|transformers|scipy|matplotlib|seaborn|plotly)/m;
      
      return pyFiles.some(file => {
        try {
          const content = fs.readFileSync(path.join(projectPath, file), 'utf8');
          return mlLibraryPattern.test(content);
        } catch (error) {
          // Skip files that can't be read
          return false;
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not scan Python files: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect database usage in project
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if database usage is detected
   */
  detectDatabaseUsage(projectPath) {
    // Check for database-related files
    const dbFileIndicators = [
      'prisma/schema.prisma',
      'drizzle.config.ts',
      'drizzle.config.js',
      'migrations/',
      'database/',
      'sql/',
      '.env'
    ];
    
    const hasDbFiles = dbFileIndicators.some(indicator => 
      fs.existsSync(path.join(projectPath, indicator))
    );
    
    if (hasDbFiles) return true;
    
    // Check package.json dependencies
    return this.checkPackageJsonDependencies(projectPath, [
      'prisma', 'drizzle-orm', 'pg', 'mysql2', 'sqlite3', 
      'mongoose', 'sequelize', 'typeorm', '@prisma/client'
    ]);
  }

  /**
   * Detect cache usage in project
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if cache usage is detected
   */
  detectCacheUsage(projectPath) {
    return this.checkPackageJsonDependencies(projectPath, [
      'redis', 'ioredis', 'node-cache', 'memory-cache', 'node-redis'
    ]);
  }

  /**
   * Detect background job usage in project
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if background job libraries/patterns are detected
   */
  detectBackgroundJobs(projectPath) {
    // Check for background job libraries
    const hasJobLibs = this.checkPackageJsonDependencies(projectPath, [
      'bull', 'bullmq', 'agenda', 'bee-queue', 'kue', 'node-cron'
    ]);
    
    if (hasJobLibs) return true;
    
    // Check for common background job file patterns
    const jobPatterns = [
      'worker.js', 'worker.ts', 
      'jobs/', 'queue/', 'workers/',
      'background/', 'tasks/'
    ];
    
    return jobPatterns.some(pattern => 
      fs.existsSync(path.join(projectPath, pattern))
    );
  }

  /**
   * Check if package.json contains specific dependencies
   * @param {string} projectPath - Project directory path
   * @param {string[]} dependencies - Array of dependency names to check for
   * @returns {boolean} True if any dependencies are found
   */
  checkPackageJsonDependencies(projectPath, dependencies) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }
    
    try {
      const packageJson = fs.readJsonSync(packageJsonPath);
      const allDeps = { 
        ...packageJson.dependencies, 
        ...packageJson.devDependencies 
      };
      
      return dependencies.some(dep => dep in allDeps);
    } catch (error) {
      console.warn(`Warning: Could not parse package.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Get project complexity score (0-10)
   * Higher scores suggest multi-service setup
   * @param {string} projectPath - Project directory path
   * @returns {number} Complexity score
   */
  getProjectComplexity(projectPath = '.') {
    let score = 0;
    
    if (this.detectDatabaseUsage(projectPath)) score += 3;
    if (this.detectCacheUsage(projectPath)) score += 2;
    if (this.detectBackgroundJobs(projectPath)) score += 2;
    if (this.hasExistingCompose(projectPath)) score += 1;
    
    // Check for additional complexity indicators
    if (fs.existsSync(path.join(projectPath, 'microservices'))) score += 3;
    if (fs.existsSync(path.join(projectPath, 'services'))) score += 2;
    if (fs.existsSync(path.join(projectPath, 'docker'))) score += 1;
    
    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Suggest whether to use multi-service setup based on project analysis
   * @param {string} projectPath - Project directory path
   * @returns {boolean} True if multi-service is recommended
   */
  shouldUseMultiService(projectPath = '.') {
    return this.getProjectComplexity(projectPath) >= 4;
  }
}