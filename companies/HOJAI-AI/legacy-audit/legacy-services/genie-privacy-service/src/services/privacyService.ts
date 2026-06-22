import { v4 as uuidv4 } from 'uuid';
import {
  Storage,
  PrivacySettings,
  PrivacyAudit,
  ExportedData,
  EventType,
  UpdatePrivacySettings,
  PrivacyZone
} from '../types';

export class PrivacyService {
  constructor(private storage: Storage) {}

  /**
   * Get privacy settings for a user
   */
  async getSettings(userId: string): Promise<PrivacySettings | null> {
    return this.storage.settings.get(userId) || null;
  }

  /**
   * Get or create default privacy settings for a user
   */
  async getOrCreateSettings(userId: string): Promise<PrivacySettings> {
    const existing = await this.getSettings(userId);
    if (existing) {
      return existing;
    }

    const defaultSettings: PrivacySettings = {
      user_id: userId,
      privacy_zones: [],
      incognito_mode: false,
      local_processing: true,
      end_to_end_encryption: true,
      data_retention_days: 90,
      capture_screenshots: false,
      capture_voice: true,
      share_analytics: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.storage.settings.set(userId, defaultSettings);
    return defaultSettings;
  }

  /**
   * Update privacy settings
   */
  async updateSettings(
    userId: string,
    updates: UpdatePrivacySettings
  ): Promise<PrivacySettings> {
    const current = await this.getOrCreateSettings(userId);

    const updated: PrivacySettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.storage.settings.set(userId, updated);

    await this.logAudit(userId, 'setting_change', `Updated settings: ${Object.keys(updates).join(', ')}`, {
      previous_values: current,
      new_values: updates
    });

    return updated;
  }

  /**
   * Toggle incognito mode
   */
  async toggleIncognito(
    userId: string,
    enabled: boolean,
    durationMinutes?: number
  ): Promise<PrivacySettings> {
    const current = await this.getOrCreateSettings(userId);

    const updated: PrivacySettings = {
      ...current,
      incognito_mode: enabled,
      updated_at: new Date().toISOString()
    };

    this.storage.settings.set(userId, updated);

    const details = enabled
      ? `Incognito mode enabled${durationMinutes ? ` for ${durationMinutes} minutes` : ''}`
      : 'Incognito mode disabled';

    await this.logAudit(userId, 'incognito', details, {
      enabled,
      duration_minutes: durationMinutes
    });

    return updated;
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(
    userId: string,
    memoryId: string,
    reason?: string
  ): Promise<boolean> {
    const memories = this.storage.memories.get(userId) || [];
    const memoryIndex = memories.findIndex(m => m.id === memoryId);

    if (memoryIndex === -1) {
      return false;
    }

    const deletedMemory = memories[memoryIndex];
    memories.splice(memoryIndex, 1);
    this.storage.memories.set(userId, memories);

    await this.logAudit(userId, 'delete', `Deleted memory: ${memoryId}`, {
      memory_id: memoryId,
      memory_category: deletedMemory.category,
      reason
    });

    return true;
  }

  /**
   * Export all user data
   */
  async exportData(
    userId: string,
    options: {
      includeMemories: boolean;
      includeSettings: boolean;
      includeAuditLog: boolean;
      format: 'json' | 'csv';
    }
  ): Promise<ExportedData> {
    const exportedData: ExportedData = {
      exported_at: new Date().toISOString(),
      user_id: userId
    };

    if (options.includeSettings) {
      exportedData.settings = await this.getSettings(userId) || undefined;
    }

    if (options.includeMemories) {
      exportedData.memories = this.storage.memories.get(userId) || [];
    }

    if (options.includeAuditLog) {
      exportedData.audit_log = this.storage.auditLog.filter(
        audit => audit.user_id === userId
      );
    }

    await this.logAudit(userId, 'export', 'Data export requested', {
      options
    });

    return exportedData;
  }

  /**
   * Delete all user data
   */
  async deleteAllData(userId: string): Promise<{ deleted: boolean }> {
    const hadData =
      this.storage.settings.has(userId) ||
      (this.storage.memories.get(userId)?.length || 0) > 0;

    this.storage.settings.delete(userId);
    this.storage.memories.delete(userId);

    // Log audit for all deleted audit entries
    const auditEntries = this.storage.auditLog.filter(a => a.user_id === userId);
    await this.logAudit(userId, 'delete', 'All user data deleted', {
      settings_deleted: true,
      memories_deleted: true,
      audit_entries_count: auditEntries.length
    });

    // Remove audit entries for this user
    this.storage.auditLog = this.storage.auditLog.filter(a => a.user_id !== userId);

    return { deleted: hadData };
  }

  /**
   * Get audit log for a user
   */
  async getAuditLog(
    userId: string,
    options: {
      eventType?: EventType;
      startDate?: string;
      endDate?: string;
      limit: number;
    }
  ): Promise<PrivacyAudit[]> {
    let logs = this.storage.auditLog.filter(audit => audit.user_id === userId);

    if (options.eventType) {
      logs = logs.filter(audit => audit.event_type === options.eventType);
    }

    if (options.startDate) {
      logs = logs.filter(
        audit => new Date(audit.timestamp) >= new Date(options.startDate!)
      );
    }

    if (options.endDate) {
      logs = logs.filter(
        audit => new Date(audit.timestamp) <= new Date(options.endDate!)
      );
    }

    // Sort by timestamp descending and limit
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, options.limit);
  }

  /**
   * Check if a zone is in privacy zones
   */
  isPrivacyZoneEnabled(userId: string, zone: PrivacyZone): boolean {
    const settings = this.storage.settings.get(userId);
    return settings?.privacy_zones.includes(zone) || false;
  }

  /**
   * Add a privacy zone
   */
  async addPrivacyZone(userId: string, zone: PrivacyZone): Promise<PrivacySettings> {
    const current = await this.getOrCreateSettings(userId);

    if (current.privacy_zones.includes(zone)) {
      return current;
    }

    return this.updateSettings(userId, {
      privacy_zones: [...current.privacy_zones, zone]
    });
  }

  /**
   * Remove a privacy zone
   */
  async removePrivacyZone(userId: string, zone: PrivacyZone): Promise<PrivacySettings> {
    const current = await this.getOrCreateSettings(userId);

    return this.updateSettings(userId, {
      privacy_zones: current.privacy_zones.filter(z => z !== zone)
    });
  }

  /**
   * Internal: Add a memory (for testing/demo)
   */
  addMemory(
    userId: string,
    content: string,
    category: string
  ): { id: string; timestamp: string } {
    const memories = this.storage.memories.get(userId) || [];
    const memory = {
      id: uuidv4(),
      content,
      category,
      timestamp: new Date().toISOString()
    };
    memories.push(memory);
    this.storage.memories.set(userId, memories);

    return { id: memory.id, timestamp: memory.timestamp };
  }

  /**
   * Log an audit event
   */
  private async logAudit(
    userId: string,
    eventType: EventType,
    details: string,
    metadata?: Record<string, unknown>
  ): Promise<PrivacyAudit> {
    const audit: PrivacyAudit = {
      id: uuidv4(),
      user_id: userId,
      event_type: eventType,
      details,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.storage.auditLog.push(audit);

    // Keep only last 1000 audit entries per user
    const userAudits = this.storage.auditLog.filter(a => a.user_id === userId);
    if (userAudits.length > 1000) {
      const otherAudits = this.storage.auditLog.filter(a => a.user_id !== userId);
      this.storage.auditLog = [
        ...otherAudits,
        ...userAudits.slice(-1000)
      ];
    }

    return audit;
  }
}
