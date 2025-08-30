/**
 * Base class for all migration change sets.
 * Each change set represents a specific, atomic migration operation.
 */
export class BaseChangeSet {
  constructor() {
    if (new.target === BaseChangeSet) {
      throw new TypeError('Cannot instantiate abstract class BaseChangeSet directly');
    }
  }

  /**
   * Unique identifier for this change set
   * @returns {string}
   */
  get id() {
    throw new Error('Subclasses must implement getId()');
  }

  /**
   * Human-readable name for this change set
   * @returns {string}
   */
  get name() {
    throw new Error('Subclasses must implement getName()');
  }

  /**
   * Description of what this change set does
   * @returns {string}
   */
  get description() {
    throw new Error('Subclasses must implement getDescription()');
  }

  /**
   * Version of this change set (for compatibility tracking)
   * @returns {string}
   */
  get version() {
    return '1.0.0';
  }

  /**
   * Change sets that must be applied before this one
   * @returns {string[]}
   */
  get dependencies() {
    return [];
  }

  /**
   * Change sets that conflict with this one
   * @returns {string[]}
   */
  get conflicts() {
    return [];
  }

  /**
   * Check if this change set can be applied to the given configuration
   * @param {Object} config - DevContainer configuration
   * @returns {boolean}
   */
  canApply(config) {
    throw new Error('Subclasses must implement canApply()');
  }

  /**
   * Check if this change set needs to be applied (i.e., the issue exists)
   * @param {Object} config - DevContainer configuration
   * @returns {boolean}
   */
  needsApply(config) {
    throw new Error('Subclasses must implement needsApply()');
  }

  /**
   * Apply this change set to the configuration
   * @param {Object} config - DevContainer configuration
   * @param {Object} options - Additional options for the change
   * @returns {Promise<Object>} - Modified configuration
   */
  async apply(config, options = {}) {
    throw new Error('Subclasses must implement apply()');
  }

  /**
   * Get a preview of what this change set would do
   * @param {Object} config - DevContainer configuration
   * @returns {Object} - Preview information
   */
  preview(config) {
    throw new Error('Subclasses must implement preview()');
  }

  /**
   * Validate that the change was applied correctly
   * @param {Object} config - DevContainer configuration after applying change
   * @returns {boolean}
   */
  validate(config) {
    return !this.needsApply(config);
  }
}