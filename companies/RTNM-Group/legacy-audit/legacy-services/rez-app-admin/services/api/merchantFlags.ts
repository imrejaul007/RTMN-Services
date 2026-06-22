import { apiClient } from './apiClient';

export interface MerchantFeatureFlagOverride {
  _id: string;
  merchantId: string;
  flagKey: string;
  enabled: boolean;
  overrideReason: string;
  expiresAt?: string | null;
  setBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantFeatureFlags {
  merchantId: string;
  merchantName?: string;
  /** Map of flagKey → override; null means "use global default" */
  flags: Record<string, boolean | null>;
  overrides: MerchantFeatureFlagOverride[];
  globalDefaults?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

class MerchantFlagsService {
  /**
   * Get all feature flag overrides for a specific merchant.
   * Real endpoint: GET /api/admin/merchants/:id/feature-flags
   */
  async getFlags(merchantId: string): Promise<MerchantFeatureFlags> {
    const response = await apiClient.get<{
      merchantId: string;
      merchantName: string;
      overrides: MerchantFeatureFlagOverride[];
    }>(`admin/merchants/${merchantId}/feature-flags`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load feature flags');
    }

    // Convert overrides array → flags Record (null = global default for unknown flags)
    const flags: Record<string, boolean | null> = {};
    response.data.overrides.forEach((o: MerchantFeatureFlagOverride) => {
      flags[o.flagKey] = o.enabled;
    });

    return {
      merchantId: response.data.merchantId,
      merchantName: response.data.merchantName,
      flags,
      overrides: response.data.overrides,
    };
  }

  /**
   * Create or update a feature flag override for a merchant.
   * Real endpoint: POST /api/admin/merchants/:id/feature-flags
   */
  async setFlag(
    merchantId: string,
    flagKey: string,
    enabled: boolean | null,
    overrideReason: string,
    expiresAt?: string | null
  ): Promise<MerchantFeatureFlagOverride | null> {
    if (enabled === null) {
      // null means "reset to global" — delete the override
      await this.deleteFlag(merchantId, flagKey);
      return null;
    }

    const response = await apiClient.post<{ override: MerchantFeatureFlagOverride }>(
      `admin/merchants/${merchantId}/feature-flags`,
      { flagKey, enabled, overrideReason, expiresAt: expiresAt ?? null }
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to set flag override');
    }

    return response.data.override;
  }

  /**
   * Update multiple flags at once (used by the "Save Changes" button).
   * Sends individual POST calls for each changed flag.
   */
  async updateFlags(
    merchantId: string,
    flags: Record<string, boolean | null>
  ): Promise<MerchantFeatureFlags> {
    const reason = 'Admin bulk update';
    const results = await Promise.allSettled(
      Object.entries(flags).map(([flagKey, enabled]) =>
        this.setFlag(merchantId, flagKey, enabled, reason)
      )
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      const total = results.length;
      const failed = failures.length;
      throw new Error(`${failed} of ${total} flag updates failed. ${total - failed} succeeded.`);
    }
    return this.getFlags(merchantId);
  }

  /**
   * Delete a specific flag override (merchant reverts to global default).
   * Real endpoint: DELETE /api/admin/merchants/:id/feature-flags/:flagKey
   */
  async deleteFlag(merchantId: string, flagKey: string): Promise<void> {
    await apiClient.delete(`admin/merchants/${merchantId}/feature-flags/${flagKey}`);
  }

  /**
   * Reset all overrides for a merchant to global defaults.
   */
  async resetToGlobal(merchantId: string): Promise<MerchantFeatureFlags> {
    const current = await this.getFlags(merchantId);
    const results = await Promise.allSettled(
      current.overrides.map((o) => this.deleteFlag(merchantId, o.flagKey))
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} of ${results.length} flag resets failed. Please try again.`
      );
    }
    return { merchantId, flags: {}, overrides: [] };
  }
}

export const merchantFlagsService = new MerchantFlagsService();
export default merchantFlagsService;
