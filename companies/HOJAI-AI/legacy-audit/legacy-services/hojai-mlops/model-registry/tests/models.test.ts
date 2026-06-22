/**
 * Hojai Model Registry - Tests
 */

import { modelRegistryService } from '../src/services/registry';

describe('ModelRegistryService', () => {
  beforeEach(() => {
    // Reset in-memory store before each test
    (modelRegistryService as any).models.clear();
  });

  describe('registerModel', () => {
    it('should register a new model version', async () => {
      const result = await modelRegistryService.registerModel({
        name: 'churn-predictor',
        version: '1.0.0',
        description: 'Initial version',
        metrics: { accuracy: 0.92, f1: 0.88 },
        stage: 'production',
      });

      expect(result.success).toBe(true);
      expect(result.model.name).toBe('churn-predictor');
      expect(result.model.versions).toHaveLength(1);
      expect(result.model.versions[0].version).toBe('1.0.0');
      expect(result.model.versions[0].stage).toBe('production');
    });

    it('should add versions to existing model', async () => {
      await modelRegistryService.registerModel({
        name: 'churn-predictor',
        version: '1.0.0',
      });

      const result = await modelRegistryService.registerModel({
        name: 'churn-predictor',
        version: '2.0.0',
        description: 'Major update',
      });

      expect(result.model.versions).toHaveLength(2);
    });

    it('should reject duplicate version', async () => {
      await modelRegistryService.registerModel({
        name: 'churn-predictor',
        version: '1.0.0',
      });

      await expect(
        modelRegistryService.registerModel({
          name: 'churn-predictor',
          version: '1.0.0',
        })
      ).rejects.toThrow("Model 'churn-predictor' version '1.0.0' already exists");
    });
  });

  describe('listModels', () => {
    it('should return empty list when no models registered', async () => {
      const result = await modelRegistryService.listModels();
      expect(result.models).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return all registered models', async () => {
      await modelRegistryService.registerModel({ name: 'model-a', version: '1.0.0' });
      await modelRegistryService.registerModel({ name: 'model-b', version: '1.0.0' });

      const result = await modelRegistryService.listModels();
      expect(result.models).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getModelVersions', () => {
    it('should return all versions for a model', async () => {
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.0' });
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '2.0.0' });

      const result = await modelRegistryService.getModelVersions('churn-predictor');
      expect(result.versions).toHaveLength(2);
    });

    it('should throw NotFoundError for non-existent model', async () => {
      await expect(
        modelRegistryService.getModelVersions('non-existent')
      ).rejects.toThrow("Model 'non-existent' not found");
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest semver', async () => {
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.0' });
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.1' });
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '2.0.0' });

      const result = await modelRegistryService.getLatestVersion('churn-predictor');
      expect(result.found).toBe(true);
      expect(result.version?.version).toBe('2.0.0');
    });
  });

  describe('updateStage', () => {
    it('should update the stage of a version', async () => {
      await modelRegistryService.registerModel({
        name: 'churn-predictor',
        version: '1.0.0',
        stage: 'dev',
      });

      const result = await modelRegistryService.updateStage('churn-predictor', '1.0.0', 'production');

      expect(result.success).toBe(true);
      expect(result.previous_stage).toBe('dev');
      expect(result.new_stage).toBe('production');
    });

    it('should throw NotFoundError for non-existent version', async () => {
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.0' });

      await expect(
        modelRegistryService.updateStage('churn-predictor', '0.0.1', 'production')
      ).rejects.toThrow("Version 'churn-predictor:0.0.1' not found");
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version', async () => {
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.0' });
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '2.0.0' });

      const result = await modelRegistryService.deleteVersion('churn-predictor', '1.0.0');

      expect(result.deleted).toBe(true);
      expect(result.success).toBe(true);

      const versions = await modelRegistryService.getModelVersions('churn-predictor');
      expect(versions.versions).toHaveLength(1);
    });

    it('should delete model when last version removed', async () => {
      await modelRegistryService.registerModel({ name: 'churn-predictor', version: '1.0.0' });

      await modelRegistryService.deleteVersion('churn-predictor', '1.0.0');

      await expect(
        modelRegistryService.getModelVersions('churn-predictor')
      ).rejects.toThrow("Model 'churn-predictor' not found");
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await modelRegistryService.registerModel({ name: 'model-a', version: '1.0.0' });
      await modelRegistryService.registerModel({ name: 'model-a', version: '2.0.0' });
      await modelRegistryService.registerModel({ name: 'model-b', version: '1.0.0' });

      const stats = await modelRegistryService.getStats();
      expect(stats.models_registered).toBe(2);
      expect(stats.total_versions).toBe(3);
    });
  });
});
