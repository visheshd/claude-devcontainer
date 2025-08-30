import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility function to run CLI commands in subprocess
 */
export async function runCLI(args, options = {}) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '..', 'src', 'index.js');
    const child = spawn('node', [cliPath, ...args], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: options.stdio || ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Handle timeout
    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        reject(new Error(`CLI command timed out after ${options.timeout}ms`));
      }, options.timeout);
    }
  });
}

/**
 * Create a temporary project directory for testing
 */
export async function createTempProject(config = null) {
  const tempDir = path.join(__dirname, 'temp-projects', `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  await fs.ensureDir(tempDir);
  
  if (config) {
    const devcontainerDir = path.join(tempDir, '.devcontainer');
    await fs.ensureDir(devcontainerDir);
    await fs.writeJson(path.join(devcontainerDir, 'devcontainer.json'), config, { spaces: 2 });
  }
  
  return tempDir;
}

/**
 * Clean up temporary project directories
 */
export async function cleanupTempProjects() {
  const tempProjectsDir = path.join(__dirname, 'temp-projects');
  if (await fs.pathExists(tempProjectsDir)) {
    await fs.remove(tempProjectsDir);
  }
}

/**
 * Read devcontainer.json from a project directory
 */
export async function readDevContainer(projectDir) {
  const devcontainerPath = path.join(projectDir, '.devcontainer', 'devcontainer.json');
  if (await fs.pathExists(devcontainerPath)) {
    return await fs.readJson(devcontainerPath);
  }
  return null;
}

/**
 * Check if a backup file exists
 */
export async function hasBackup(projectDir) {
  const devcontainerDir = path.join(projectDir, '.devcontainer');
  const files = await fs.readdir(devcontainerDir);
  return files.some(file => file.startsWith('devcontainer.json.backup.'));
}

/**
 * Create a project with package.json to help with stack detection
 */
export async function createProjectWithType(type) {
  const tempDir = await createTempProject();
  
  const packageJsonConfigs = {
    nextjs: {
      name: 'test-nextjs',
      dependencies: {
        next: '^13.0.0',
        react: '^18.0.0'
      }
    },
    python: {
      name: 'test-python',
      // No package.json, but add requirements.txt or pyproject.toml
    },
    node: {
      name: 'test-node',
      dependencies: {
        express: '^4.18.0'
      }
    }
  };
  
  if (packageJsonConfigs[type]) {
    await fs.writeJson(path.join(tempDir, 'package.json'), packageJsonConfigs[type], { spaces: 2 });
  }
  
  // Add type-specific files
  if (type === 'python') {
    await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'requests==2.28.0\n');
  }
  
  return tempDir;
}