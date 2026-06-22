/**
 * Hojai Model Router - Model Registry Integration
 * Provides preferred model overrides from the model registry
 */

import { TaskType, LLMProvider } from '../types';

/**
 * Model preference mapping
 * Allows the model registry to override default routing decisions
 */
interface ModelPreference {
  provider: LLMProvider;
  model: string;
  version?: string;
  metrics?: Record<string, number>;
}

/**
 * Registry API response types
 */
interface RegistryVersion {
  stage: string;
  version: string;
  metadata?: {
    task?: TaskType;
    provider?: LLMProvider;
  };
}

interface RegistryModel {
  name: string;
  versions?: RegistryVersion[];
}

interface RegistryResponse {
  models?: RegistryModel[];
}

class ModelRegistryService {
  private preferences: Map<TaskType, ModelPreference> = new Map();

  /**
   * Set a preferred model for a task type
   */
  setPreferredModel(task: TaskType, provider: LLMProvider, model: string, version?: string): void {
    this.preferences.set(task, { provider, model, version });
    console.log(`[Registry] Set preference: ${task} -> ${provider}/${model}`);
  }

  /**
   * Get the preferred model for a task type
   */
  getPreferredModel(task: TaskType): LLMProvider | null {
    const preference = this.preferences.get(task);
    return preference?.provider || null;
  }

  /**
   * Get the preferred model details
   */
  getPreferredModelDetails(task: TaskType): ModelPreference | null {
    return this.preferences.get(task) || null;
  }

  /**
   * Remove a preference
   */
  removePreference(task: TaskType): void {
    this.preferences.delete(task);
  }

  /**
   * Get all preferences
   */
  getAllPreferences(): Map<TaskType, ModelPreference> {
    return new Map(this.preferences);
  }

  /**
   * Clear all preferences
   */
  clearPreferences(): void {
    this.preferences.clear();
  }

  /**
   * Load preferences from a model registry
   * This would typically call the model-registry service
   */
  async loadFromRegistry(registryUrl: string): Promise<void> {
    try {
      const response = await fetch(`${registryUrl}/api/models`);

      if (!response.ok) {
        console.warn(`[Registry] Failed to load from registry: ${response.status}`);
        return;
      }

      const jsonData = await response.json();
      const data = jsonData as RegistryResponse;

      // Process models and set preferences based on production models
      if (data.models) {
        for (const model of data.models) {
          if (model.versions) {
            const productionVersions = model.versions.filter(
              (v: RegistryVersion) => v.stage === 'production'
            );

            if (productionVersions.length > 0) {
              // Find the latest production version
              const latest = productionVersions[productionVersions.length - 1];
              if (latest) {
                const metadata = latest.metadata;

                if (metadata?.task && metadata?.provider) {
                  this.setPreferredModel(
                    metadata.task,
                    metadata.provider,
                    `${model.name}:${latest.version}`,
                    latest.version
                  );
                }
              }
            }
          }
        }
      }

      console.log(`[Registry] Loaded ${this.preferences.size} preferences from registry`);
    } catch (error) {
      console.warn('[Registry] Could not load from registry:', error);
    }
  }
}

// Export singleton instance
export const modelRegistryService = new ModelRegistryService();
