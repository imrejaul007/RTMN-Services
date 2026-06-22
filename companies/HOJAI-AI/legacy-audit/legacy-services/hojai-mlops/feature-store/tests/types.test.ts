/**
 * Feature Store Types Tests
 */

import type {
  Feature,
  FeatureSet,
  StoreFeaturesRequest,
  GetFeaturesResponse,
  GetFeatureResponse,
  BatchGetRequest,
  BatchGetResponse,
  DeleteResponse,
  HealthResponse,
  ApiError,
} from '../src/types';

describe('Feature Store Types', () => {
  describe('Feature', () => {
    it('should accept number feature', () => {
      const feature: Feature = {
        name: 'age',
        value: 25,
        type: 'number',
        timestamp: new Date().toISOString(),
      };
      expect(feature.name).toBe('age');
      expect(feature.value).toBe(25);
      expect(feature.type).toBe('number');
    });

    it('should accept string feature', () => {
      const feature: Feature = {
        name: 'country',
        value: 'India',
        type: 'string',
        timestamp: new Date().toISOString(),
      };
      expect(feature.name).toBe('country');
      expect(feature.value).toBe('India');
      expect(feature.type).toBe('string');
    });

    it('should accept boolean feature', () => {
      const feature: Feature = {
        name: 'is_active',
        value: true,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      };
      expect(feature.name).toBe('is_active');
      expect(feature.value).toBe(true);
      expect(feature.type).toBe('boolean');
    });
  });

  describe('FeatureSet', () => {
    it('should create complete feature set', () => {
      const featureSet: FeatureSet = {
        entity_id: 'user_123',
        features: {
          age: {
            name: 'age',
            value: 25,
            type: 'number',
            timestamp: new Date().toISOString(),
          },
          country: {
            name: 'country',
            value: 'India',
            type: 'string',
            timestamp: new Date().toISOString(),
          },
        },
        last_updated: new Date().toISOString(),
      };

      expect(featureSet.entity_id).toBe('user_123');
      expect(Object.keys(featureSet.features)).toHaveLength(2);
      expect(featureSet.features.age.value).toBe(25);
      expect(featureSet.features.country.value).toBe('India');
    });
  });

  describe('GetFeaturesResponse', () => {
    it('should handle found response', () => {
      const response: GetFeaturesResponse = {
        entity_id: 'user_123',
        features: {
          age: {
            name: 'age',
            value: 25,
            type: 'number',
            timestamp: new Date().toISOString(),
          },
        },
        last_updated: new Date().toISOString(),
        found: true,
      };

      expect(response.found).toBe(true);
    });

    it('should handle not found response', () => {
      const response: GetFeaturesResponse = {
        entity_id: 'user_123',
        features: {},
        last_updated: '',
        found: false,
      };

      expect(response.found).toBe(false);
      expect(Object.keys(response.features)).toHaveLength(0);
    });
  });

  describe('BatchGetResponse', () => {
    it('should handle batch response', () => {
      const response: BatchGetResponse = {
        results: [
          {
            entity_id: 'user_1',
            features: {},
            last_updated: '',
            found: false,
          },
          {
            entity_id: 'user_2',
            features: {
              age: {
                name: 'age',
                value: 30,
                type: 'number',
                timestamp: new Date().toISOString(),
              },
            },
            last_updated: new Date().toISOString(),
            found: true,
          },
        ],
      };

      expect(response.results).toHaveLength(2);
      expect(response.results[0].found).toBe(false);
      expect(response.results[1].found).toBe(true);
    });
  });

  describe('DeleteResponse', () => {
    it('should format delete response', () => {
      const response: DeleteResponse = {
        entity_id: 'user_123',
        deleted: true,
        features_deleted: 5,
      };

      expect(response.deleted).toBe(true);
      expect(response.features_deleted).toBe(5);
    });
  });

  describe('HealthResponse', () => {
    it('should format healthy response', () => {
      const response: HealthResponse = {
        status: 'healthy',
        redis: 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      expect(response.status).toBe('healthy');
      expect(response.redis).toBe('connected');
    });

    it('should format unhealthy response', () => {
      const response: HealthResponse = {
        status: 'unhealthy',
        redis: 'disconnected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      expect(response.status).toBe('unhealthy');
      expect(response.redis).toBe('disconnected');
    });
  });

  describe('ApiError', () => {
    it('should format error response', () => {
      const error: ApiError = {
        error: 'Validation Error',
        message: 'Invalid input',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };

      expect(error.statusCode).toBe(400);
      expect(error.error).toBe('Validation Error');
    });
  });
});
