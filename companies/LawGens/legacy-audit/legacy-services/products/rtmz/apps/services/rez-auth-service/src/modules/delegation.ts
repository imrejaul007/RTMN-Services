/**
 * Delegation Module for RABTUL Auth Service
 * Manages healthcare delegation of authority to trusted contacts
 * Version: 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Delegation {
  id: string;
  delegatorId: string; // Patient ID
  delegateId: string; // Trusted person ID
  permissions: DelegationPermissions;
  status: DelegationStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  grantedVia?: string; // Emergency code or in-person
}

export interface DelegationPermissions {
  viewRecords: PermissionSetting;
  viewMedications: PermissionSetting;
  receiveAlerts: AlertPermissionSetting;
  bookAppointments: AppointmentPermissionSetting;
  messageDoctors: MessagingPermissionSetting;
  makePayments: PaymentPermissionSetting;
}

export interface PermissionSetting {
  enabled: boolean;
  restrictions?: PermissionRestrictions;
}

export interface AlertPermissionSetting extends PermissionSetting {
  alertTypes: AlertType[];
  notifyOnEmergency: boolean;
  notifyOnAppointment: boolean;
  notifyOnMedication: boolean;
  notifyOnLabResult: boolean;
}

export interface AppointmentPermissionSetting extends PermissionSetting {
  appointmentTypes: AppointmentType[];
  maxAdvanceDays: number;
  requiresConfirmation: boolean;
}

export interface MessagingPermissionSetting extends PermissionSetting {
  allowedProviders: string[]; // Provider IDs they can message
  messageTypes: MessageType[];
  maxMessagesPerDay: number;
}

export interface PaymentPermissionSetting extends PermissionSetting {
  maxAmountPerTransaction: number;
  maxDailyAmount: number;
  allowedCategories: PaymentCategory[];
  requiresPin: boolean;
}

export interface PermissionRestrictions {
  timeWindow?: {
    startHour: number; // 0-23
    endHour: number; // 0-23
    daysOfWeek?: DayOfWeek[];
  };
  recordScope?: string[]; // Specific record IDs or categories
  expiryDate?: Date;
}

export type DelegationStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'revoked';
export type AlertType = 'emergency' | 'appointment' | 'medication' | 'lab_result' | 'general';
export type AppointmentType = 'checkup' | 'specialist' | 'urgent' | 'telehealth' | 'lab';
export type MessageType = 'general' | 'prescription' | 'follow_up' | 'urgent';
export type PaymentCategory = 'consultation' | 'medication' | 'procedure' | 'lab' | 'insurance';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface DelegationRequest {
  delegateId: string;
  permissions: Partial<DelegationPermissions>;
  expiresAt?: Date;
  message?: string;
}

export interface DelegationUpdate {
  permissions?: Partial<DelegationPermissions>;
  status?: DelegationStatus;
  expiresAt?: Date;
}

export interface DelegationAuditLog {
  id: string;
  delegationId: string;
  action: DelegationAction;
  performedBy: string;
  previousValue: unknown;
  newValue: unknown;
  timestamp: Date;
  ipAddress?: string;
}

export type DelegationAction =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'updated'
  | 'suspended'
  | 'resumed'
  | 'revoked'
  | 'expired'
  | 'permission_changed';

export interface DelegationValidationResult {
  valid: boolean;
  delegation?: Delegation;
  reason?: string;
  missingPermissions?: (keyof DelegationPermissions)[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const PermissionSettingSchema = z.object({
  enabled: z.boolean(),
  restrictions: z.object({
    timeWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
    }).optional(),
    recordScope: z.array(z.string()).optional(),
    expiryDate: z.date().optional(),
  }).optional(),
});

export const AlertPermissionSettingSchema = z.object({
  enabled: z.boolean(),
  restrictions: z.object({
    timeWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
    }).optional(),
    recordScope: z.array(z.string()).optional(),
    expiryDate: z.date().optional(),
  }).optional(),
  alertTypes: z.array(z.enum(['emergency', 'appointment', 'medication', 'lab_result', 'general'])),
  notifyOnEmergency: z.boolean(),
  notifyOnAppointment: z.boolean(),
  notifyOnMedication: z.boolean(),
  notifyOnLabResult: z.boolean(),
});

export const AppointmentPermissionSettingSchema = z.object({
  enabled: z.boolean(),
  restrictions: z.object({
    timeWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
    }).optional(),
    recordScope: z.array(z.string()).optional(),
    expiryDate: z.date().optional(),
  }).optional(),
  appointmentTypes: z.array(z.enum(['checkup', 'specialist', 'urgent', 'telehealth', 'lab'])),
  maxAdvanceDays: z.number().min(1).max(365),
  requiresConfirmation: z.boolean(),
});

export const MessagingPermissionSettingSchema = z.object({
  enabled: z.boolean(),
  restrictions: z.object({
    timeWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
    }).optional(),
    recordScope: z.array(z.string()).optional(),
    expiryDate: z.date().optional(),
  }).optional(),
  allowedProviders: z.array(z.string()),
  messageTypes: z.array(z.enum(['general', 'prescription', 'follow_up', 'urgent'])),
  maxMessagesPerDay: z.number().min(1).max(100),
});

export const PaymentPermissionSettingSchema = z.object({
  enabled: z.boolean(),
  restrictions: z.object({
    timeWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
    }).optional(),
    recordScope: z.array(z.string()).optional(),
    expiryDate: z.date().optional(),
  }).optional(),
  maxAmountPerTransaction: z.number().min(0),
  maxDailyAmount: z.number().min(0),
  allowedCategories: z.array(z.enum(['consultation', 'medication', 'procedure', 'lab', 'insurance'])),
  requiresPin: z.boolean(),
});

export const DelegationRequestSchema = z.object({
  delegateId: z.string().min(1),
  permissions: z.object({
    viewRecords: PermissionSettingSchema.optional(),
    viewMedications: PermissionSettingSchema.optional(),
    receiveAlerts: AlertPermissionSettingSchema.optional(),
    bookAppointments: AppointmentPermissionSettingSchema.optional(),
    messageDoctors: MessagingPermissionSettingSchema.optional(),
    makePayments: PaymentPermissionSettingSchema.optional(),
  }),
  expiresAt: z.date().optional(),
  message: z.string().max(500).optional(),
});

// ============================================================================
// Mock Data Store (for development)
// ============================================================================

const mockDelegationStore: Map<string, Delegation> = new Map();
const mockDelegationAuditLog: DelegationAuditLog[] = [];

// ============================================================================
// Service Class
// ============================================================================

export class DelegationService {
  private readonly MAX_ACTIVE_DELEGATIONS = 10;

  /**
   * Create a new delegation
   */
  async createDelegation(
    delegatorId: string,
    request: DelegationRequest
  ): Promise<Delegation> {
    // Validate request
    const validated = DelegationRequestSchema.safeParse(request);
    if (!validated.success) {
      throw new DelegationError(
        'INVALID_REQUEST',
        `Validation failed: ${validated.error.message}`
      );
    }

    // Check for existing delegation to same delegate
    const existing = await this.getDelegationByDelegate(delegatorId, request.delegateId);
    if (existing) {
      throw new DelegationError(
        'DELEGATION_EXISTS',
        `Delegation already exists to ${request.delegateId}. Update or revoke existing delegation.`
      );
    }

    // Check delegation limit
    const delegatorDelegations = await this.getDelegationsForDelegator(delegatorId);
    if (delegatorDelegations.length >= this.MAX_ACTIVE_DELEGATIONS) {
      throw new DelegationError(
        'DELEGATION_LIMIT_REACHED',
        `Maximum ${this.MAX_ACTIVE_DELEGATIONS} active delegations allowed`
      );
    }

    // Check self-delegation
    if (delegatorId === request.delegateId) {
      throw new DelegationError(
        'SELF_DELEGATION_NOT_ALLOWED',
        'Cannot delegate to yourself'
      );
    }

    const now = new Date();
    const delegation: Delegation = {
      id: this.generateId(),
      delegatorId,
      delegateId: request.delegateId,
      permissions: this.mergeWithDefaults(request.permissions),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: request.expiresAt,
    };

    mockDelegationStore.set(delegation.id, delegation);

    await this.logAudit({
      id: this.generateId(),
      delegationId: delegation.id,
      action: 'created',
      performedBy: delegatorId,
      previousValue: null,
      newValue: delegation,
      timestamp: now,
    });

    return delegation;
  }

  /**
   * Update an existing delegation
   */
  async updateDelegation(
    delegationId: string,
    delegatorId: string,
    update: DelegationUpdate
  ): Promise<Delegation> {
    const delegation = await this.getDelegation(delegationId);

    if (!delegation) {
      throw new DelegationError('DELEGATION_NOT_FOUND', `Delegation ${delegationId} not found`);
    }

    if (delegation.delegatorId !== delegatorId) {
      throw new DelegationError(
        'UNAUTHORIZED',
        'Only the delegator can update this delegation'
      );
    }

    if (delegation.status === 'revoked' || delegation.status === 'expired') {
      throw new DelegationError(
        'DELEGATION_INACTIVE',
        `Cannot update ${delegation.status} delegation`
      );
    }

    const previousValue = { ...delegation.permissions };
    const now = new Date();

    if (update.permissions) {
      delegation.permissions = {
        ...delegation.permissions,
        ...this.mergeWithDefaults(update.permissions),
      };
    }

    if (update.status) {
      delegation.status = update.status;
    }

    if (update.expiresAt) {
      delegation.expiresAt = update.expiresAt;
    }

    delegation.updatedAt = now;

    await this.logAudit({
      id: this.generateId(),
      delegationId: delegation.id,
      action: 'updated',
      performedBy: delegatorId,
      previousValue,
      newValue: delegation.permissions,
      timestamp: now,
    });

    return delegation;
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(
    delegationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<Delegation> {
    const delegation = await this.getDelegation(delegationId);

    if (!delegation) {
      throw new DelegationError('DELEGATION_NOT_FOUND', `Delegation ${delegationId} not found`);
    }

    // Both delegator and delegate can revoke
    if (delegation.delegatorId !== revokedBy && delegation.delegateId !== revokedBy) {
      throw new DelegationError(
        'UNAUTHORIZED',
        'Only the delegator or delegate can revoke this delegation'
      );
    }

    const previousStatus = delegation.status;
    const now = new Date();

    delegation.status = 'revoked';
    delegation.updatedAt = now;

    await this.logAudit({
      id: this.generateId(),
      delegationId: delegation.id,
      action: 'revoked',
      performedBy: revokedBy,
      previousValue: { status: previousStatus },
      newValue: { status: 'revoked', reason },
      timestamp: now,
    });

    return delegation;
  }

  /**
   * Accept a pending delegation (by delegate)
   */
  async acceptDelegation(
    delegationId: string,
    delegateId: string
  ): Promise<Delegation> {
    const delegation = await this.getDelegation(delegationId);

    if (!delegation) {
      throw new DelegationError('DELEGATION_NOT_FOUND', `Delegation ${delegationId} not found`);
    }

    if (delegation.delegateId !== delegateId) {
      throw new DelegationError(
        'UNAUTHORIZED',
        'Only the delegate can accept this delegation'
      );
    }

    if (delegation.status !== 'pending') {
      throw new DelegationError(
        'INVALID_STATUS',
        `Cannot accept delegation with status: ${delegation.status}`
      );
    }

    delegation.status = 'active';
    delegation.updatedAt = new Date();

    await this.logAudit({
      id: this.generateId(),
      delegationId: delegation.id,
      action: 'accepted',
      performedBy: delegateId,
      previousValue: { status: 'pending' },
      newValue: { status: 'active' },
      timestamp: new Date(),
    });

    return delegation;
  }

  /**
   * Reject a pending delegation (by delegate)
   */
  async rejectDelegation(
    delegationId: string,
    delegateId: string,
    reason?: string
  ): Promise<Delegation> {
    const delegation = await this.getDelegation(delegationId);

    if (!delegation) {
      throw new DelegationError('DELEGATION_NOT_FOUND', `Delegation ${delegationId} not found`);
    }

    if (delegation.delegateId !== delegateId) {
      throw new DelegationError(
        'UNAUTHORIZED',
        'Only the delegate can reject this delegation'
      );
    }

    delegation.status = 'revoked';
    delegation.updatedAt = new Date();

    await this.logAudit({
      id: this.generateId(),
      delegationId: delegation.id,
      action: 'rejected',
      performedBy: delegateId,
      previousValue: { status: 'pending' },
      newValue: { status: 'revoked', reason },
      timestamp: new Date(),
    });

    return delegation;
  }

  /**
   * Suspend a delegation temporarily
   */
  async suspendDelegation(
    delegationId: string,
    delegatorId: string,
    reason?: string
  ): Promise<Delegation> {
    return this.updateDelegation(delegationId, delegatorId, { status: 'suspended' });
  }

  /**
   * Resume a suspended delegation
   */
  async resumeDelegation(
    delegationId: string,
    delegatorId: string
  ): Promise<Delegation> {
    const delegation = await this.getDelegation(delegationId);

    if (!delegation) {
      throw new DelegationError('DELEGATION_NOT_FOUND', `Delegation ${delegationId} not found`);
    }

    if (delegation.status !== 'suspended') {
      throw new DelegationError(
        'INVALID_STATUS',
        `Only suspended delegations can be resumed. Current: ${delegation.status}`
      );
    }

    return this.updateDelegation(delegationId, delegatorId, { status: 'active' });
  }

  /**
   * Get a delegation by ID
   */
  async getDelegation(delegationId: string): Promise<Delegation | undefined> {
    const delegation = mockDelegationStore.get(delegationId);

    // Check and update expiry
    if (delegation && delegation.expiresAt && delegation.expiresAt < new Date()) {
      delegation.status = 'expired';
    }

    return delegation;
  }

  /**
   * Get all delegations for a delegator (patient)
   */
  async getDelegationsForDelegator(
    delegatorId: string,
    status?: DelegationStatus
  ): Promise<Delegation[]> {
    const delegations = Array.from(mockDelegationStore.values()).filter(
      d => d.delegatorId === delegatorId
    );

    // Filter by status and check expiry
    return delegations.filter(d => {
      if (status && d.status !== status) return false;
      if (d.expiresAt && d.expiresAt < new Date()) {
        d.status = 'expired';
        return status === 'expired';
      }
      return true;
    });
  }

  /**
   * Get all delegations for a delegate (trusted person)
   */
  async getDelegationsForDelegate(
    delegateId: string,
    status?: DelegationStatus
  ): Promise<Delegation[]> {
    const delegations = Array.from(mockDelegationStore.values()).filter(
      d => d.delegateId === delegateId
    );

    return delegations.filter(d => {
      if (status && d.status !== status) return false;
      if (d.expiresAt && d.expiresAt < new Date()) {
        d.status = 'expired';
        return status === 'expired';
      }
      return true;
    });
  }

  /**
   * Get delegation between specific delegator and delegate
   */
  async getDelegationByDelegate(
    delegatorId: string,
    delegateId: string
  ): Promise<Delegation | undefined> {
    return Array.from(mockDelegationStore.values()).find(
      d => d.delegatorId === delegatorId && d.delegateId === delegateId
    );
  }

  /**
   * Validate if delegate has specific permission
   */
  async validatePermission(
    delegateId: string,
    delegatorId: string,
    permission: keyof DelegationPermissions
  ): Promise<DelegationValidationResult> {
    const delegation = await this.getDelegationByDelegate(delegatorId, delegateId);

    if (!delegation) {
      return { valid: false, reason: 'DELEGATION_NOT_FOUND' };
    }

    if (delegation.status !== 'active') {
      return { valid: false, reason: `DELEGATION_${delegation.status.toUpperCase()}` };
    }

    if (delegation.expiresAt && delegation.expiresAt < new Date()) {
      return { valid: false, reason: 'DELEGATION_EXPIRED' };
    }

    const permissionSetting = delegation.permissions[permission];
    if (!permissionSetting || !permissionSetting.enabled) {
      return { valid: false, reason: 'PERMISSION_NOT_GRANTED', missingPermissions: [permission] };
    }

    // Check time window restrictions
    if (permissionSetting.restrictions?.timeWindow) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const { startHour, endHour, daysOfWeek } = permissionSetting.restrictions.timeWindow;

      if (daysOfWeek && !daysOfWeek.includes(currentDay as DayOfWeek)) {
        return { valid: false, reason: 'OUTSIDE_ALLOWED_DAYS' };
      }

      if (currentHour < startHour || currentHour >= endHour) {
        return { valid: false, reason: 'OUTSIDE_ALLOWED_HOURS' };
      }
    }

    return { valid: true, delegation };
  }

  /**
   * Validate multiple permissions at once
   */
  async validatePermissions(
    delegateId: string,
    delegatorId: string,
    requiredPermissions: (keyof DelegationPermissions)[]
  ): Promise<DelegationValidationResult> {
    const missingPermissions: (keyof DelegationPermissions)[] = [];

    for (const permission of requiredPermissions) {
      const result = await this.validatePermission(delegateId, delegatorId, permission);
      if (!result.valid) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      return { valid: false, reason: 'MISSING_PERMISSIONS', missingPermissions };
    }

    const delegation = await this.getDelegationByDelegate(delegatorId, delegateId);
    return { valid: true, delegation };
  }

  /**
   * Get delegation audit log
   */
  async getDelegationAuditLog(
    delegationId: string,
    limit: number = 100
  ): Promise<DelegationAuditLog[]> {
    return mockDelegationAuditLog
      .filter(entry => entry.delegationId === delegationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private mergeWithDefaults(partial: Partial<DelegationPermissions>): DelegationPermissions {
    return {
      viewRecords: {
        enabled: false,
        ...(partial.viewRecords || {}),
      },
      viewMedications: {
        enabled: false,
        ...(partial.viewMedications || {}),
      },
      receiveAlerts: {
        enabled: false,
        alertTypes: [],
        notifyOnEmergency: false,
        notifyOnAppointment: false,
        notifyOnMedication: false,
        notifyOnLabResult: false,
        ...(partial.receiveAlerts || {}),
      },
      bookAppointments: {
        enabled: false,
        appointmentTypes: [],
        maxAdvanceDays: 30,
        requiresConfirmation: true,
        ...(partial.bookAppointments || {}),
      },
      messageDoctors: {
        enabled: false,
        allowedProviders: [],
        messageTypes: [],
        maxMessagesPerDay: 10,
        ...(partial.messageDoctors || {}),
      },
      makePayments: {
        enabled: false,
        maxAmountPerTransaction: 0,
        maxDailyAmount: 0,
        allowedCategories: [],
        requiresPin: true,
        ...(partial.makePayments || {}),
      },
    };
  }

  private async logAudit(entry: DelegationAuditLog): Promise<void> {
    mockDelegationAuditLog.push(entry);
    // In production, persist to database
  }

  private generateId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class DelegationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'DelegationError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDelegationService(): DelegationService {
  return new DelegationService();
}

// ============================================================================
// Default Export
// ============================================================================

export default DelegationService;
