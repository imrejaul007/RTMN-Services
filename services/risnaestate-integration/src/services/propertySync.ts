import { PropertyProfile } from '../models/PropertyProfile';
import { CustomerOpsBridge } from './customerOpsBridge';

/**
 * PropertySync Service
 * Handles synchronization of properties to Asset Twin
 */

interface SyncStatus {
  total: number;
  synced: number;
  failed: number;
  pending: number;
  lastSyncAt: string;
}

interface PropertySyncResult {
  success: boolean;
  twinId?: string;
  message: string;
  timestamp: string;
}

interface SyncLog {
  propertyId: string;
  twinId?: string;
  action: 'create' | 'update' | 'delete';
  status: 'success' | 'failed';
  message?: string;
  timestamp: string;
}

export class PropertySync {
  private logger: any;
  private customerOpsBridge: CustomerOpsBridge;
  private syncStatus: SyncStatus;
  private syncLog: SyncLog[];

  constructor(logger: any, customerOpsBridge: CustomerOpsBridge) {
    this.logger = logger;
    this.customerOpsBridge = customerOpsBridge;
    this.syncStatus = {
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
      lastSyncAt: new Date().toISOString()
    };
    this.syncLog = [];
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get sync history log
   */
  getSyncLog(limit: number = 100): SyncLog[] {
    return this.syncLog.slice(-limit);
  }

  /**
   * Sync a single property to Asset Twin
   */
  async syncPropertyToTwin(property: PropertyProfile): Promise<PropertySyncResult> {
    const timestamp = new Date().toISOString();
    this.syncStatus.total += 1;
    this.syncStatus.pending += 1;

    try {
      let result: { success: boolean; twinId?: string; error?: string };

      if (property.twinId) {
        // Update existing
        const updated = await this.customerOpsBridge.updatePropertyInAssetTwin(
          property.twinId,
          property
        );
        result = {
          success: updated,
          twinId: property.twinId,
          error: updated ? undefined : 'Update failed'
        };
      } else {
        // Create new
        result = await this.customerOpsBridge.syncPropertyToAssetTwin(property);
      }

      if (result.success) {
        this.syncStatus.synced += 1;
        this.syncStatus.pending -= 1;

        // Log success
        this.addSyncLog({
          propertyId: property.id,
          twinId: result.twinId,
          action: property.twinId ? 'update' : 'create',
          status: 'success',
          timestamp
        });

        // Publish event
        await this.customerOpsBridge.publishPropertyEvent(
          property,
          property.twinId ? 'updated' : 'created'
        );

        return {
          success: true,
          twinId: result.twinId,
          message: `Property synced successfully`,
          timestamp
        };
      } else {
        this.syncStatus.failed += 1;
        this.syncStatus.pending -= 1;

        this.addSyncLog({
          propertyId: property.id,
          twinId: result.twinId,
          action: property.twinId ? 'update' : 'create',
          status: 'failed',
          message: result.error,
          timestamp
        });

        return {
          success: false,
          twinId: result.twinId,
          message: result.error || 'Sync failed',
          timestamp
        };
      }
    } catch (error: any) {
      this.syncStatus.failed += 1;
      this.syncStatus.pending -= 1;

      this.addSyncLog({
        propertyId: property.id,
        action: property.twinId ? 'update' : 'create',
        status: 'failed',
        message: error.message,
        timestamp
      });

      this.logger.error(`Failed to sync property ${property.id}:`, error);

      return {
        success: false,
        message: error.message,
        timestamp
      };
    }
  }

  /**
   * Remove a property from Asset Twin
   */
  async removePropertyFromTwin(twinId: string): Promise<PropertySyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const removed = await this.customerOpsBridge.removePropertyFromAssetTwin(twinId);

      if (removed) {
        this.addSyncLog({
          propertyId: twinId,
          twinId,
          action: 'delete',
          status: 'success',
          timestamp
        });

        return {
          success: true,
          twinId,
          message: 'Property removed from twin',
          timestamp
        };
      } else {
        return {
          success: false,
          twinId,
          message: 'Failed to remove property',
          timestamp
        };
      }
    } catch (error: any) {
      this.addSyncLog({
        propertyId: twinId,
        twinId,
        action: 'delete',
        status: 'failed',
        message: error.message,
        timestamp
      });

      return {
        success: false,
        twinId,
        message: error.message,
        timestamp
      };
    }
  }

  /**
   * Bulk sync multiple properties
   */
  async bulkSync(properties: PropertyProfile[]): Promise<{
    total: number;
    synced: number;
    failed: number;
    results: PropertySyncResult[]
  }> {
    const results: PropertySyncResult[] = [];
    let synced = 0;
    let failed = 0;

    this.logger.info(`Starting bulk sync for ${properties.length} properties`);

    for (const property of properties) {
      const result = await this.syncPropertyToTwin(property);
      results.push(result);

      if (result.success) {
        synced += 1;
      } else {
        failed += 1;
      }
    }

    this.syncStatus.lastSyncAt = new Date().toISOString();

    this.logger.info(`Bulk sync completed: ${synced} synced, ${failed} failed`);

    return {
      total: properties.length,
      synced,
      failed,
      results
    };
  }

  /**
   * Sync all unsynced properties
   */
  async syncUnsyncedProperties(properties: PropertyProfile[]): Promise<{
    total: number;
    synced: number;
    failed: number;
    results: PropertySyncResult[]
  }> {
    const unsyncedProperties = properties.filter(
      p => !p.syncedToTwin || p.twinSyncStatus === 'failed'
    );

    this.logger.info(`Found ${unsyncedProperties.length} unsynced properties`);

    return this.bulkSync(unsyncedProperties);
  }

  /**
   * Re-sync all failed properties
   */
  async resyncFailed(properties: PropertyProfile[]): Promise<{
    total: number;
    synced: number;
    failed: number;
    results: PropertySyncResult[]
  }> {
    const failedProperties = properties.filter(
      p => p.twinSyncStatus === 'failed'
    );

    this.logger.info(`Found ${failedProperties.length} failed syncs to retry`);

    // Reset status for retry
    failedProperties.forEach(p => {
      p.twinSyncStatus = 'pending';
    });

    return this.bulkSync(failedProperties);
  }

  /**
   * Verify sync status of all properties
   */
  async verifySyncStatus(properties: PropertyProfile[]): Promise<{
    verified: number;
    mismatched: number;
    orphaned: number[];
    issues: Array<{ propertyId: string; issue: string }>
  }> {
    let verified = 0;
    let mismatched = 0;
    const orphaned: number[] = [];
    const issues: Array<{ propertyId: string; issue: string }> = [];

    for (const property of properties) {
      if (!property.twinId) {
        issues.push({
          propertyId: property.id,
          issue: 'No twin ID assigned'
        });
        mismatched += 1;
        continue;
      }

      // In production, would verify against actual Asset Twin
      // For now, just check local status
      if (property.syncedToTwin && property.twinSyncStatus === 'synced') {
        verified += 1;
      } else {
        mismatched += 1;
        issues.push({
          propertyId: property.id,
          issue: `Sync status mismatch: ${property.twinSyncStatus}`
        });
      }
    }

    return {
      verified,
      mismatched,
      orphaned,
      issues
    };
  }

  /**
   * Sync property price updates to twin
   */
  async syncPriceUpdate(property: PropertyProfile): Promise<PropertySyncResult> {
    if (!property.twinId) {
      return {
        success: false,
        message: 'Property not synced to twin yet',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.customerOpsBridge.updatePropertyInAssetTwin(
        property.twinId,
        property
      );

      if (result) {
        // Publish price update event
        await this.customerOpsBridge.publishPropertyEvent(property, 'price_updated');

        return {
          success: true,
          twinId: property.twinId,
          message: 'Price updated in twin',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        twinId: property.twinId,
        message: 'Failed to update price',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        twinId: property.twinId,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sync property status changes to twin
   */
  async syncStatusChange(
    property: PropertyProfile,
    newStatus: PropertyProfile['status']
  ): Promise<PropertySyncResult> {
    if (!property.twinId) {
      return {
        success: false,
        message: 'Property not synced to twin yet',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.customerOpsBridge.updatePropertyInAssetTwin(
        property.twinId,
        property
      );

      if (result) {
        // Publish status change event
        await this.customerOpsBridge.publishPropertyEvent(property, 'status_changed');

        return {
          success: true,
          twinId: property.twinId,
          message: `Status changed to ${newStatus}`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        twinId: property.twinId,
        message: 'Failed to update status',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        twinId: property.twinId,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get area insights for a property
   */
  async getPropertyAreaInsights(property: PropertyProfile): Promise<any> {
    return this.customerOpsBridge.getAreaInsights(
      property.location.city,
      property.location.locality
    );
  }

  /**
   * Get comparable properties for a property
   */
  async getComparables(property: PropertyProfile): Promise<any[]> {
    if (!property.twinId) {
      return [];
    }

    return this.customerOpsBridge.getComparableProperties(property.twinId);
  }

  /**
   * Add entry to sync log
   */
  private addSyncLog(entry: SyncLog): void {
    this.syncLog.push(entry);

    // Keep log size manageable
    if (this.syncLog.length > 1000) {
      this.syncLog = this.syncLog.slice(-500);
    }
  }

  /**
   * Reset sync statistics
   */
  resetStats(): void {
    this.syncStatus = {
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
      lastSyncAt: new Date().toISOString()
    };
    this.syncLog = [];
  }
}
