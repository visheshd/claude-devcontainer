import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple DevContainerGenerator class for testing core migration logic
class DevContainerGenerator {
  constructor() {}

  async analyzeConfig(existingConfig) {
    const analysis = {
      hasClaudeMount: false,
      mcpFeatures: [],
      outdatedImage: null,
      issues: [],
      customizations: {
        mounts: [],
        extensions: [],
        ports: [],
        environment: {}
      }
    };

    // Check for .claude mount
    if (existingConfig.mounts) {
      analysis.hasClaudeMount = existingConfig.mounts.some(mount => 
        mount.includes('.claude') && mount.includes('target=/home/claude-user/.claude')
      );
    }

    if (!analysis.hasClaudeMount) {
      analysis.issues.push('Missing .claude directory mount for user customizations');
    }

    // Check for outdated image
    if (existingConfig.image && existingConfig.image.includes('claude-docker')) {
      analysis.outdatedImage = {
        current: existingConfig.image,
        recommended: 'claude-base:latest'
      };
      analysis.issues.push(`Outdated image reference: ${existingConfig.image} → claude-base:latest`);
    }

    // Check for MCP servers
    if (existingConfig.features && existingConfig.features['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1']) {
      const servers = existingConfig.features['ghcr.io/visheshd/claude-devcontainer/claude-mcp:1'].servers;
      if (servers) {
        analysis.mcpFeatures = servers.split(',').map(s => s.trim());
      }
    }

    if (analysis.mcpFeatures.length === 0) {
      analysis.issues.push('No MCP servers configured - consider adding serena and context7');
    }

    // Extract customizations
    if (existingConfig.mounts) {
      analysis.customizations.mounts = existingConfig.mounts.filter(mount => 
        !mount.includes('.claude')
      );
    }

    if (existingConfig.customizations?.vscode?.extensions) {
      analysis.customizations.extensions = existingConfig.customizations.vscode.extensions.filter(ext =>
        ext !== 'anthropic.claude-code' // Exclude Claude Code extension from customizations
      );
    }

    if (existingConfig.forwardPorts) {
      analysis.customizations.ports = existingConfig.forwardPorts;
    }

    if (existingConfig.containerEnv) {
      analysis.customizations.environment = existingConfig.containerEnv;
    }

    return analysis;
  }

  async generateMigrationConfig(existingConfig, analysis) {
    const updatedConfig = { ...existingConfig };

    // Fix outdated image
    if (analysis.outdatedImage) {
      updatedConfig.image = analysis.outdatedImage.recommended;
    }

    // Add .claude mount if missing
    if (!analysis.hasClaudeMount) {
      const claudeMount = "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind";
      updatedConfig.mounts = [claudeMount, ...(analysis.customizations.mounts || [])];
    }

    // Ensure Claude Code extension is present
    if (!updatedConfig.customizations) updatedConfig.customizations = {};
    if (!updatedConfig.customizations.vscode) updatedConfig.customizations.vscode = {};
    if (!updatedConfig.customizations.vscode.extensions) updatedConfig.customizations.vscode.extensions = [];

    if (!updatedConfig.customizations.vscode.extensions.includes('anthropic.claude-code')) {
      updatedConfig.customizations.vscode.extensions = [
        'anthropic.claude-code',
        ...analysis.customizations.extensions
      ];
    }

    // Preserve custom ports and environment
    if (analysis.customizations.ports.length > 0) {
      updatedConfig.forwardPorts = analysis.customizations.ports;
    }

    if (Object.keys(analysis.customizations.environment).length > 0) {
      updatedConfig.containerEnv = analysis.customizations.environment;
    }

    return updatedConfig;
  }
}

describe('DevContainer Migration', () => {
  let generator;

  beforeEach(() => {
    generator = new DevContainerGenerator();
  });

  describe('analyzeConfig', () => {
    test('should detect missing .claude mount', async () => {
      const config = {
        name: 'Test Project',
        image: 'claude-base:latest'
      };

      const analysis = await generator.analyzeConfig(config);

      expect(analysis.hasClaudeMount).toBe(false);
      expect(analysis.issues).toContain('Missing .claude directory mount for user customizations');
    });

    test('should detect existing .claude mount', async () => {
      const config = {
        name: 'Test Project',
        image: 'claude-base:latest',
        mounts: [
          'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind'
        ]
      };

      const analysis = await generator.analyzeConfig(config);

      expect(analysis.hasClaudeMount).toBe(true);
      expect(analysis.issues).not.toContain('Missing .claude directory mount for user customizations');
    });

    test('should detect outdated image references', async () => {
      const config = {
        name: 'Test Project',
        image: 'claude-docker:latest'
      };

      const analysis = await generator.analyzeConfig(config);

      expect(analysis.outdatedImage).toEqual({
        current: 'claude-docker:latest',
        recommended: 'claude-base:latest'
      });
      expect(analysis.issues).toContain('Outdated image reference: claude-docker:latest → claude-base:latest');
    });

    test('should detect missing MCP servers', async () => {
      const config = {
        name: 'Test Project',
        image: 'claude-base:latest'
      };

      const analysis = await generator.analyzeConfig(config);

      expect(analysis.mcpFeatures).toEqual([]);
      expect(analysis.issues).toContain('No MCP servers configured - consider adding serena and context7');
    });

    test('should detect existing MCP servers', async () => {
      const config = {
        name: 'Test Project',
        image: 'claude-base:latest',
        features: {
          'ghcr.io/visheshd/claude-devcontainer/claude-mcp:1': {
            servers: 'serena,context7'
          }
        }
      };

      const analysis = await generator.analyzeConfig(config);

      expect(analysis.mcpFeatures).toEqual(['serena', 'context7']);
      expect(analysis.issues).not.toContain('No MCP servers configured - consider adding serena and context7');
    });
  });

  describe('generateMigrationConfig', () => {
    test('should fix outdated image reference', async () => {
      const existingConfig = {
        name: 'Test Project',
        image: 'claude-docker:latest'
      };

      const analysis = {
        outdatedImage: {
          current: 'claude-docker:latest',
          recommended: 'claude-base:latest'
        },
        hasClaudeMount: true,
        mcpFeatures: ['serena'],
        issues: [],
        customizations: { mounts: [], extensions: [], ports: [], environment: {} }
      };

      const updatedConfig = await generator.generateMigrationConfig(existingConfig, analysis);

      expect(updatedConfig.image).toBe('claude-base:latest');
    });

    test('should add missing .claude mount', async () => {
      const existingConfig = {
        name: 'Test Project',
        image: 'claude-base:latest',
        mounts: ['source=/custom,target=/workspace/custom,type=bind']
      };

      const analysis = {
        hasClaudeMount: false,
        mcpFeatures: ['serena'],
        issues: [],
        customizations: {
          mounts: ['source=/custom,target=/workspace/custom,type=bind'],
          extensions: [],
          ports: [],
          environment: {}
        }
      };

      const updatedConfig = await generator.generateMigrationConfig(existingConfig, analysis);

      expect(updatedConfig.mounts).toEqual([
        'source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind',
        'source=/custom,target=/workspace/custom,type=bind'
      ]);
    });

    test('should ensure Claude Code extension is present', async () => {
      const existingConfig = {
        name: 'Test Project',
        image: 'claude-base:latest',
        customizations: {
          vscode: {
            extensions: ['ms-python.python']
          }
        }
      };

      const analysis = {
        hasClaudeMount: true,
        mcpFeatures: ['serena'],
        issues: [],
        customizations: { 
          mounts: [], 
          extensions: ['ms-python.python'], 
          ports: [],
          environment: {}
        }
      };

      const updatedConfig = await generator.generateMigrationConfig(existingConfig, analysis);

      expect(updatedConfig.customizations.vscode.extensions).toEqual([
        'anthropic.claude-code',
        'ms-python.python'
      ]);
    });
  });

  describe('Integration Tests with Fixtures', () => {
    test('should correctly analyze old claude-docker config', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'old-claude-docker.json');
      const config = await fs.readJson(fixturePath);
      
      const analysis = await generator.analyzeConfig(config);

      expect(analysis.outdatedImage.current).toBe('claude-docker:latest');
      expect(analysis.hasClaudeMount).toBe(false);
      expect(analysis.mcpFeatures).toEqual([]);
      expect(analysis.issues).toHaveLength(3); // outdated image, missing mount, no MCP
    });

    test('should correctly analyze up-to-date config', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'up-to-date.json');
      const config = await fs.readJson(fixturePath);
      
      const analysis = await generator.analyzeConfig(config);

      expect(analysis.hasClaudeMount).toBe(true);
      expect(analysis.mcpFeatures).toEqual(['serena', 'context7']);
      expect(analysis.outdatedImage).toBeNull();
      expect(analysis.issues).toHaveLength(0);
    });
  });
});