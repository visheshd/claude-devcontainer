import { BaseChangeSet } from '../BaseChangeSet.js';

/**
 * Change set that updates outdated Docker image references
 */
export class UpdateImageChangeSet extends BaseChangeSet {
  constructor() {
    super();
    
    // Mapping of outdated images to their updated versions
    this.imageMapping = {
      'claude-docker:latest': 'claude-base:latest',
      'claude-docker': 'claude-base:latest'
    };
  }

  get id() {
    return 'update-image';
  }

  get name() {
    return 'Update Docker Image';
  }

  get description() {
    return 'Updates outdated Docker image references to current versions';
  }

  get version() {
    return '1.0.0';
  }

  canApply(config) {
    // Can apply if there's an image specified
    return !!config.image;
  }

  needsApply(config) {
    if (!config.image) {
      return false;
    }

    return !!this.imageMapping[config.image];
  }

  preview(config) {
    if (!this.needsApply(config)) {
      return {
        summary: 'No changes needed - image is current',
        changes: []
      };
    }

    const currentImage = config.image;
    const newImage = this.imageMapping[currentImage];

    return {
      summary: `Will update image from ${currentImage} to ${newImage}`,
      changes: [
        {
          type: 'modify',
          path: 'image',
          oldValue: currentImage,
          newValue: newImage,
          description: `Update outdated image reference`
        }
      ]
    };
  }

  async apply(config, options = {}) {
    if (!this.needsApply(config)) {
      return config;
    }

    // Create a deep copy of the config
    const updatedConfig = JSON.parse(JSON.stringify(config));

    const currentImage = updatedConfig.image;
    const newImage = this.imageMapping[currentImage];

    if (newImage) {
      updatedConfig.image = newImage;
    }

    return updatedConfig;
  }

  validate(config) {
    if (!config.image) {
      return true; // No image to validate
    }

    // Validation passes if the image is not in our outdated mapping
    return !this.imageMapping[config.image];
  }
}