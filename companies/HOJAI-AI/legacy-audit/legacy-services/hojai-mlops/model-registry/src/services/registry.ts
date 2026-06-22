/**
 * Hojai Model Registry - In-Memory Model Store
 */

import {
  ModelInfo,
  ModelVersion,
  ModelStage,
  RegisterModelRequest,
  RegisterModelResponse,
  ListModelsResponse,
  GetModelVersionsResponse,
  GetModelVersionResponse,
  GetLatestVersionResponse,
  UpdateStageResponse,
  DeleteVersionResponse,
} from '../types';
import { NotFoundError, ConflictError } from '../middleware/error';

class ModelRegistryService {
  private models: Map<string, ModelInfo> = new Map();

  /**
   * Register a new model version or update existing model
   */
  async registerModel(request: RegisterModelRequest): Promise<RegisterModelResponse> {
    const { name, version, description, metrics, stage, metadata } = request;

    // Check if model exists
    let modelInfo = this.models.get(name);

    if (!modelInfo) {
      // Create new model
      modelInfo = {
        name,
        versions: [],
      };
      this.models.set(name, modelInfo);
    }

    // Check if version already exists
    const existingVersion = modelInfo.versions.find((v) => v.version === version);
    if (existingVersion) {
      throw new ConflictError(`Model '${name}' version '${version}' already exists`);
    }

    // Create new version
    const newVersion: ModelVersion = {
      version,
      created_at: new Date().toISOString(),
      description,
      metrics,
      stage: stage || 'dev',
      metadata,
    };

    modelInfo.versions.push(newVersion);

    // Sort versions by semver
    modelInfo.versions.sort((a, b) => this.compareVersions(a.version, b.version));

    return {
      success: true,
      model: modelInfo,
      message: `Model '${name}' version '${version}' registered successfully`,
    };
  }

  /**
   * List all registered models
   */
  async listModels(): Promise<ListModelsResponse> {
    const models = Array.from(this.models.values());
    return {
      models,
      total: models.length,
    };
  }

  /**
   * Get all versions for a specific model
   */
  async getModelVersions(name: string): Promise<GetModelVersionsResponse> {
    const modelInfo = this.models.get(name);

    if (!modelInfo) {
      throw new NotFoundError('Model', name);
    }

    return {
      name,
      versions: modelInfo.versions,
      total: modelInfo.versions.length,
    };
  }

  /**
   * Get the latest version of a model
   */
  async getLatestVersion(name: string): Promise<GetLatestVersionResponse> {
    const modelInfo = this.models.get(name);

    if (!modelInfo) {
      throw new NotFoundError('Model', name);
    }

    if (modelInfo.versions.length === 0) {
      return {
        name,
        version: null,
        found: false,
      };
    }

    // Latest version is the last one after sorting by semver
    const latestVersion = modelInfo.versions[modelInfo.versions.length - 1];

    return {
      name,
      version: latestVersion,
      found: true,
    };
  }

  /**
   * Get a specific version of a model
   */
  async getVersion(name: string, version: string): Promise<GetModelVersionResponse> {
    const modelInfo = this.models.get(name);

    if (!modelInfo) {
      throw new NotFoundError('Model', name);
    }

    const modelVersion = modelInfo.versions.find((v) => v.version === version);

    if (!modelVersion) {
      throw new NotFoundError('Version', `${name}:${version}`);
    }

    return {
      name,
      version: modelVersion,
      found: true,
    };
  }

  /**
   * Update the stage of a specific model version
   */
  async updateStage(name: string, version: string, newStage: ModelStage): Promise<UpdateStageResponse> {
    const modelInfo = this.models.get(name);

    if (!modelInfo) {
      throw new NotFoundError('Model', name);
    }

    const modelVersion = modelInfo.versions.find((v) => v.version === version);

    if (!modelVersion) {
      throw new NotFoundError('Version', `${name}:${version}`);
    }

    const previousStage = modelVersion.stage;
    modelVersion.stage = newStage;

    return {
      success: true,
      name,
      version,
      previous_stage: previousStage,
      new_stage: newStage,
      message: `Model '${name}' version '${version}' stage updated from '${previousStage}' to '${newStage}'`,
    };
  }

  /**
   * Delete a specific version of a model
   */
  async deleteVersion(name: string, version: string): Promise<DeleteVersionResponse> {
    const modelInfo = this.models.get(name);

    if (!modelInfo) {
      throw new NotFoundError('Model', name);
    }

    const versionIndex = modelInfo.versions.findIndex((v) => v.version === version);

    if (versionIndex === -1) {
      throw new NotFoundError('Version', `${name}:${version}`);
    }

    modelInfo.versions.splice(versionIndex, 1);

    // If no versions remain, delete the model entirely
    if (modelInfo.versions.length === 0) {
      this.models.delete(name);
    }

    return {
      success: true,
      name,
      version,
      deleted: true,
      message: `Model '${name}' version '${version}' deleted successfully`,
    };
  }

  /**
   * Get statistics about registered models
   */
  async getStats(): Promise<{ models_registered: number; total_versions: number }> {
    let totalVersions = 0;
    for (const model of this.models.values()) {
      totalVersions += model.versions.length;
    }
    return {
      models_registered: this.models.size,
      total_versions: totalVersions,
    };
  }

  /**
   * Compare two semver versions
   * Returns negative if a < b, positive if a > b, 0 if equal
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string): { major: number; minor: number; patch: number; prerelease: string } => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/);
      if (match) {
        return {
          major: parseInt(match[1], 10),
          minor: parseInt(match[2], 10),
          patch: parseInt(match[3], 10),
          prerelease: match[4] || '',
        };
      }
      // Fallback for non-semver versions
      return { major: 0, minor: 0, patch: 0, prerelease: v };
    };

    const va = parseVersion(a);
    const vb = parseVersion(b);

    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    if (va.patch !== vb.patch) return va.patch - vb.patch;

    // Prerelease versions come before release versions
    if (va.prerelease && !vb.prerelease) return -1;
    if (!va.prerelease && vb.prerelease) return 1;

    return va.prerelease.localeCompare(vb.prerelease);
  }
}

// Export singleton instance
export const modelRegistryService = new ModelRegistryService();
