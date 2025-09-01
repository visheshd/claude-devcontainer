import { ChangeSetRegistry } from './ChangeSetRegistry.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Engine for orchestrating the application of migration change sets
 */
export class MigrationEngine {
  constructor() {
    this.registry = new ChangeSetRegistry();
  }

  /**
   * Analyze a configuration and return available migrations
   * @param {Object} config - DevContainer configuration
   * @returns {Promise<Object>} - Analysis results
   */
  async analyze(config) {
    const allChangeSets = await this.registry.getAllChangeSets();
    const applicableChangeSets = await this.registry.getApplicableChangeSets(config);
    const neededChangeSets = await this.registry.getNeededChangeSets(config);

    return {
      totalChangeSets: allChangeSets.length,
      applicableChangeSets: applicableChangeSets.length,
      neededChangeSets,
      isUpToDate: neededChangeSets.length === 0,
      issues: neededChangeSets.map(cs => ({
        id: cs.id,
        name: cs.name,
        description: cs.description,
        preview: cs.preview(config)
      }))
    };
  }

  /**
   * Get a preview of what would be changed without applying changes
   * @param {Object} config - DevContainer configuration
   * @param {Array<string>} changeSetIds - Optional: specific change sets to preview
   * @returns {Promise<Object>} - Preview results
   */
  async preview(config, changeSetIds = null) {
    let changeSets;
    
    if (changeSetIds) {
      changeSets = [];
      for (const id of changeSetIds) {
        const changeSet = await this.registry.getChangeSet(id);
        if (!changeSet) {
          throw new Error(`Change set not found: ${id}`);
        }
        changeSets.push(changeSet);
      }
    } else {
      changeSets = await this.registry.getNeededChangeSets(config);
    }

    // Resolve dependencies
    const orderedChangeSets = await this.registry.resolveDependencies(changeSets);

    const previews = [];
    let currentConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    for (const changeSet of orderedChangeSets) {
      const preview = changeSet.preview(currentConfig);
      previews.push({
        id: changeSet.id,
        name: changeSet.name,
        description: changeSet.description,
        preview
      });

      // Apply change to current config for next preview
      currentConfig = await changeSet.apply(currentConfig, { preview: true });
    }

    return {
      changeSets: orderedChangeSets.length,
      previews,
      finalConfig: currentConfig
    };
  }

  /**
   * Apply migrations to a configuration
   * @param {Object} config - DevContainer configuration
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} - Migration results
   */
  async migrate(config, options = {}) {
    const {
      interactive = true,
      changeSetIds = null,
      dryRun = false,
      autoApprove = false
    } = options;

    let changeSets;
    
    if (changeSetIds) {
      // Apply specific change sets
      changeSets = [];
      for (const id of changeSetIds) {
        const changeSet = await this.registry.getChangeSet(id);
        if (!changeSet) {
          throw new Error(`Change set not found: ${id}`);
        }
        if (!changeSet.canApply(config)) {
          throw new Error(`Change set ${id} cannot be applied to this configuration`);
        }
        changeSets.push(changeSet);
      }
    } else {
      // Apply all needed change sets
      changeSets = await this.registry.getNeededChangeSets(config);
    }

    if (changeSets.length === 0) {
      return {
        applied: [],
        skipped: [],
        config,
        message: 'No migrations needed - configuration is already up to date'
      };
    }

    // Resolve dependencies
    const orderedChangeSets = await this.registry.resolveDependencies(changeSets);

    // Interactive selection if requested
    if (interactive && !autoApprove && !dryRun) {
      const selected = await this.promptForChangeSets(orderedChangeSets, config);
      changeSets = selected;
    }

    if (dryRun) {
      return await this.preview(config, changeSets.map(cs => cs.id));
    }

    // Apply change sets
    const results = {
      applied: [],
      skipped: [],
      config: JSON.parse(JSON.stringify(config)), // Deep clone
      errors: []
    };

    for (const changeSet of orderedChangeSets) {
      try {
        if (!changeSet.needsApply(results.config)) {
          results.skipped.push({
            id: changeSet.id,
            name: changeSet.name,
            reason: 'No longer needed'
          });
          continue;
        }

        console.log(chalk.blue(`Applying: ${changeSet.name}...`));
        
        results.config = await changeSet.apply(results.config, options);
        
        // Validate the change was applied correctly
        if (!changeSet.validate(results.config)) {
          throw new Error('Validation failed after applying change');
        }

        results.applied.push({
          id: changeSet.id,
          name: changeSet.name,
          description: changeSet.description
        });

        console.log(chalk.green(`✅ Applied: ${changeSet.name}`));

      } catch (error) {
        const errorInfo = {
          id: changeSet.id,
          name: changeSet.name,
          error: error.message
        };
        results.errors.push(errorInfo);
        console.log(chalk.red(`❌ Failed to apply ${changeSet.name}: ${error.message}`));
      }
    }

    return results;
  }

  /**
   * Prompt user to select which change sets to apply
   * @param {Array<BaseChangeSet>} changeSets - Available change sets
   * @param {Object} config - Configuration for preview generation
   * @returns {Promise<Array<BaseChangeSet>>} - Selected change sets
   */
  async promptForChangeSets(changeSets, config) {
    console.log(chalk.blue('\n📋 Available Migrations:'));
    
    for (const changeSet of changeSets) {
      console.log(chalk.white(`\n• ${changeSet.name}`));
      console.log(chalk.gray(`  ${changeSet.description}`));
      
      const preview = changeSet.preview(config);
      if (preview.summary) {
        console.log(chalk.cyan(`  ${preview.summary}`));
      }
    }

    const { selectedIds } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedIds',
        message: 'Select migrations to apply:',
        choices: changeSets.map(cs => ({
          name: `${cs.name} - ${cs.description}`,
          value: cs.id,
          checked: true
        }))
      }
    ]);

    return changeSets.filter(cs => selectedIds.includes(cs.id));
  }
}