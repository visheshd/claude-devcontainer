import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  runCLI, 
  createTempProject, 
  cleanupTempProjects, 
  readDevContainer, 
  hasBackup,
  createProjectWithType 
} from './cli-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CLI Integration Tests', () => {
  // Clean up before and after all tests
  beforeAll(async () => {
    await cleanupTempProjects();
  });

  afterAll(async () => {
    await cleanupTempProjects();
  });

  describe('Basic CLI Commands', () => {
    test('should show help when no arguments provided', async () => {
      const result = await runCLI(['--help'], { timeout: 5000 });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage: claude-devcontainer');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('migrate');
      expect(result.stdout).toContain('check');
    });

    test('should show version', async () => {
      const result = await runCLI(['--version'], { timeout: 5000 });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should list available stacks', async () => {
      const result = await runCLI(['stacks'], { timeout: 5000 });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Available Development Stacks');
      expect(result.stdout).toContain('Next.js');
      expect(result.stdout).toContain('Python');
    });
  });

  describe('Project Detection', () => {
    test('should detect Next.js project', async () => {
      const tempDir = await createProjectWithType('nextjs');
      
      const result = await runCLI(['detect'], { 
        cwd: tempDir,
        timeout: 5000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Detected project types');
      expect(result.stdout).toContain('nextjs');
    });

    test('should detect Python project', async () => {
      const tempDir = await createProjectWithType('python');
      
      const result = await runCLI(['detect'], { 
        cwd: tempDir,
        timeout: 5000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Detected project types');
      expect(result.stdout).toContain('python');
    });

    test('should handle no detected project type', async () => {
      const tempDir = await createTempProject();
      
      const result = await runCLI(['detect'], { 
        cwd: tempDir,
        timeout: 5000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('No specific project type detected');
    });
  });

  describe('Migration Commands', () => {
    test('should analyze config with check command', async () => {
      // Create a legacy config
      const legacyConfig = {
        name: 'Test Project',
        image: 'claude-docker:latest'
      };
      
      const tempDir = await createTempProject(legacyConfig);
      
      const result = await runCLI(['check'], { 
        cwd: tempDir,
        timeout: 20000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Configuration Analysis');
      expect(result.stdout).toContain('Issues to fix');
      expect(result.stdout).toContain('claude-docker:latest');
    }, 25000);

    test('should detect up-to-date config', async () => {
      // Create an up-to-date config
      const currentConfig = {
        name: 'Test Project',
        image: 'claude-base:latest',
        mounts: [
          'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind'
        ],
        features: {
          'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
            servers: 'serena,context7'
          }
        },
        customizations: {
          vscode: {
            extensions: ['anthropic.claude-code']
          }
        }
      };
      
      const tempDir = await createTempProject(currentConfig);
      
      const result = await runCLI(['check'], { 
        cwd: tempDir,
        timeout: 10000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('up to date');
    });

    test('should handle missing devcontainer for migrate', async () => {
      const tempDir = await createTempProject(); // No devcontainer config
      
      const result = await runCLI(['migrate'], { 
        cwd: tempDir,
        timeout: 10000 
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('No existing DevContainer configuration found');
      expect(result.stdout).toContain('claude-devcontainer init');
    });
  });

  describe('Init Command', () => {
    test('should initialize basic project with no interaction', async () => {
      const tempDir = await createTempProject();
      
      const result = await runCLI(['init', '--no-interaction'], { 
        cwd: tempDir,
        timeout: 20000 
      });
      
      expect(result.code).toBe(0);
      
      // Verify devcontainer.json was created
      const config = await readDevContainer(tempDir);
      expect(config).not.toBeNull();
      expect(config.name).toBeDefined();
      expect(config.image).toBeDefined();
    }, 25000);

    test('should initialize with specific stack', async () => {
      const tempDir = await createTempProject();
      
      const result = await runCLI(['init', '--stack', 'nextjs', '--no-interaction'], { 
        cwd: tempDir,
        timeout: 20000 
      });
      
      expect(result.code).toBe(0);
      
      // Verify Next.js config was created
      const config = await readDevContainer(tempDir);
      expect(config).not.toBeNull();
      expect(config.image).toContain('nextjs');
    }, 25000);
  });

  describe('Error Handling', () => {
    test('should handle invalid command', async () => {
      const result = await runCLI(['invalid-command'], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
    });

    test('should handle malformed devcontainer.json', async () => {
      const tempDir = await createTempProject();
      const devcontainerDir = path.join(tempDir, '.devcontainer');
      await fs.ensureDir(devcontainerDir);
      
      // Write malformed JSON
      await fs.writeFile(
        path.join(devcontainerDir, 'devcontainer.json'),
        '{ invalid json'
      );
      
      const result = await runCLI(['check'], { 
        cwd: tempDir,
        timeout: 10000 
      });
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Error parsing devcontainer.json');
    });
  });
});