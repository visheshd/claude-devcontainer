import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registry for managing and discovering migration change sets
 */
export class ChangeSetRegistry {
  constructor() {
    this.changeSets = new Map();
    this.loaded = false;
  }

  /**
   * Load all available change sets from the change-sets directory
   */
  async loadChangeSets() {
    if (this.loaded) return;

    const changeSetsDir = path.join(__dirname, 'change-sets');
    const changeSetFiles = await glob('*ChangeSet.js', { 
      cwd: changeSetsDir,
      absolute: true 
    });

    for (const filePath of changeSetFiles) {
      try {
        const module = await import(`file://${filePath}`);
        const ChangeSetClass = Object.values(module).find(
          export_ => typeof export_ === 'function' && 
          export_.name.endsWith('ChangeSet')
        );

        if (ChangeSetClass) {
          const changeSet = new ChangeSetClass();
          this.changeSets.set(changeSet.id, changeSet);
        }
      } catch (error) {
        console.warn(`Failed to load change set from ${filePath}:`, error.message);
      }
    }

    this.loaded = true;
  }

  /**
   * Get all registered change sets
   * @returns {Array<BaseChangeSet>}
   */
  async getAllChangeSets() {
    await this.loadChangeSets();
    return Array.from(this.changeSets.values());
  }

  /**
   * Get a specific change set by ID
   * @param {string} id - Change set ID
   * @returns {BaseChangeSet|null}
   */
  async getChangeSet(id) {
    await this.loadChangeSets();
    return this.changeSets.get(id) || null;
  }

  /**
   * Get change sets that are applicable to a given configuration
   * @param {Object} config - DevContainer configuration
   * @returns {Array<BaseChangeSet>}
   */
  async getApplicableChangeSets(config) {
    const changeSets = await this.getAllChangeSets();
    return changeSets.filter(changeSet => changeSet.canApply(config));
  }

  /**
   * Get change sets that need to be applied to a given configuration
   * @param {Object} config - DevContainer configuration
   * @returns {Array<BaseChangeSet>}
   */
  async getNeededChangeSets(config) {
    const changeSets = await this.getAllChangeSets();
    return changeSets.filter(changeSet => 
      changeSet.canApply(config) && changeSet.needsApply(config)
    );
  }

  /**
   * Resolve dependencies and return change sets in correct application order
   * @param {Array<BaseChangeSet>} changeSets - Change sets to order
   * @returns {Array<BaseChangeSet>} - Ordered change sets
   * @throws {Error} - If circular dependencies or conflicts are detected
   */
  resolveDependencies(changeSets) {
    const ordered = [];
    const visiting = new Set();
    const visited = new Set();
    const changeSetMap = new Map(changeSets.map(cs => [cs.id, cs]));

    // Check for conflicts first
    for (const changeSet of changeSets) {
      for (const conflictId of changeSet.conflicts) {
        if (changeSetMap.has(conflictId)) {
          throw new Error(
            `Conflict detected: ${changeSet.id} conflicts with ${conflictId}`
          );
        }
      }
    }

    const visit = (changeSetId) => {
      if (visiting.has(changeSetId)) {
        throw new Error(`Circular dependency detected involving ${changeSetId}`);
      }
      if (visited.has(changeSetId)) {
        return;
      }

      const changeSet = changeSetMap.get(changeSetId);
      if (!changeSet) {
        throw new Error(`Dependency not found: ${changeSetId}`);
      }

      visiting.add(changeSetId);

      // Visit dependencies first
      for (const depId of changeSet.dependencies) {
        visit(depId);
      }

      visiting.delete(changeSetId);
      visited.add(changeSetId);
      ordered.push(changeSet);
    };

    // Visit all change sets
    for (const changeSet of changeSets) {
      visit(changeSet.id);
    }

    return ordered;
  }
}