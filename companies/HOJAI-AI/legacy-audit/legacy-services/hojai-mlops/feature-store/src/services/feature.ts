/**
 * Feature Store Service
 * Core business logic for feature management
 */

import { redisService } from './redis';
import config from '../config';
import type {
  Feature,
  FeatureSet,
  FeatureValueType,
  FeatureType,
} from '../types';
import type { StoreFeaturesInput, BatchGetInput } from '../validators';

class FeatureService {
  /**
   * Determine the type of a feature value
   */
  private getFeatureType(value: FeatureValueType): FeatureType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  /**
   * Store features for an entity
   */
  async storeFeatures(
    entityId: string,
    input: StoreFeaturesInput
  ): Promise<FeatureSet> {
    const client = redisService.getClient();
    const timestamp = new Date().toISOString();
    const features: Record<string, Feature> = {};

    for (const featureInput of input.features) {
      const feature: Feature = {
        name: featureInput.name,
        value: featureInput.value,
        type: this.getFeatureType(featureInput.value),
        timestamp,
      };

      const key = redisService.buildKey(entityId, featureInput.name);

      // Store feature as JSON
      await client.set(key, JSON.stringify(feature));

      // Set TTL if configured
      if (config.featureStore.ttl > 0) {
        await client.expire(key, config.featureStore.ttl);
      }

      features[featureInput.name] = feature;
    }

    // Update feature set metadata
    const featureSetKey = redisService.buildKey(entityId, '__meta__');
    const featureSet: FeatureSet = {
      entity_id: entityId,
      features,
      last_updated: timestamp,
    };
    await client.set(featureSetKey, JSON.stringify(featureSet));

    if (config.featureStore.ttl > 0) {
      await client.expire(featureSetKey, config.featureStore.ttl);
    }

    return featureSet;
  }

  /**
   * Get all features for an entity
   */
  async getFeatures(entityId: string): Promise<FeatureSet | null> {
    const client = redisService.getClient();
    const featureSetKey = redisService.buildKey(entityId, '__meta__');

    const data = await client.get(featureSetKey);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as FeatureSet;
  }

  /**
   * Get a single feature for an entity
   */
  async getFeature(
    entityId: string,
    featureName: string
  ): Promise<Feature | null> {
    const client = redisService.getClient();
    const key = redisService.buildKey(entityId, featureName);

    const data = await client.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as Feature;
  }

  /**
   * Get specific features for an entity
   */
  async getFeaturesByNames(
    entityId: string,
    featureNames: string[]
  ): Promise<Record<string, Feature>> {
    const client = redisService.getClient();
    const keys = featureNames.map((name) =>
      redisService.buildKey(entityId, name)
    );

    const pipeline = client.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }

    const results = await pipeline.exec();
    const features: Record<string, Feature> = {};

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err, data] = results[i];
        if (!err && data) {
          const feature = JSON.parse(data as string) as Feature;
          features[feature.name] = feature;
        }
      }
    }

    return features;
  }

  /**
   * Delete all features for an entity
   */
  async deleteFeatures(entityId: string): Promise<{
    deleted: boolean;
    featuresDeleted: number;
  }> {
    const client = redisService.getClient();
    const featureSetKey = redisService.buildKey(entityId, '__meta__');

    // Get the feature set to find all feature keys
    const featureSetData = await client.get(featureSetKey);
    let featuresDeleted = 0;

    if (featureSetData) {
      const featureSet = JSON.parse(featureSetData) as FeatureSet;
      featuresDeleted = Object.keys(featureSet.features).length;

      // Delete all feature keys
      const featureKeys = Object.keys(featureSet.features).map((name) =>
        redisService.buildKey(entityId, name)
      );

      if (featureKeys.length > 0) {
        await client.del(...featureKeys);
      }
    }

    // Delete the feature set metadata
    await client.del(featureSetKey);

    return {
      deleted: true,
      featuresDeleted,
    };
  }

  /**
   * Batch get features for multiple entities
   */
  async batchGetFeatures(
    input: BatchGetInput
  ): Promise<
    Array<{
      entity_id: string;
      features: Record<string, Feature>;
      last_updated: string;
      found: boolean;
    }>
  > {
    const { entity_ids, feature_names } = input;
    const results: Array<{
      entity_id: string;
      features: Record<string, Feature>;
      last_updated: string;
      found: boolean;
    }> = [];

    for (const entityId of entity_ids) {
      let features: Record<string, Feature> = {};
      let last_updated = '';
      let found = false;

      if (feature_names && feature_names.length > 0) {
        // Get specific features
        features = await this.getFeaturesByNames(entityId, feature_names);
        found = Object.keys(features).length > 0;
        if (found) {
          const timestamps = Object.values(features).map((f) =>
            new Date(f.timestamp).getTime()
          );
          last_updated = new Date(
            Math.max(...timestamps)
          ).toISOString();
        }
      } else {
        // Get all features
        const featureSet = await this.getFeatures(entityId);
        if (featureSet) {
          features = featureSet.features;
          last_updated = featureSet.last_updated;
          found = true;
        }
      }

      results.push({
        entity_id: entityId,
        features,
        last_updated,
        found,
      });
    }

    return results;
  }

  /**
   * Check if entity exists
   */
  async entityExists(entityId: string): Promise<boolean> {
    const featureSet = await this.getFeatures(entityId);
    return featureSet !== null;
  }

  /**
   * Get feature count for an entity
   */
  async getFeatureCount(entityId: string): Promise<number> {
    const featureSet = await this.getFeatures(entityId);
    if (!featureSet) {
      return 0;
    }
    return Object.keys(featureSet.features).length;
  }
}

export const featureService = new FeatureService();
