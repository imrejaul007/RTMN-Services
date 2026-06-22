import mongoose, { Document, Schema } from 'mongoose';

// Support Permission Types
export enum SupportPermissionType {
  VIEW_BOOKINGS = 'view_bookings',
  MANAGE_BOOKINGS = 'manage_bookings',
  VIEW_PRESCRIPTIONS = 'view_prescriptions',
  MANAGE_PRESCRIPTIONS = 'manage_prescriptions',
  VIEW_APPOINTMENTS = 'view_appointments',
  MANAGE_APPOINTMENTS = 'manage_appointments',
  VIEW_MEDICAL_RECORDS = 'view_medical_records',
  VIEW_SUPPORT_ISSUES = 'view_support_issues',
  CREATE_SUPPORT_ISSUES = 'create_support_issues',
  RESOLVE_SUPPORT_ISSUES = 'resolve_support_issues',
  VIEW_BILLING = 'view_billing',
  MANAGE_BILLING = 'manage_billing',
  VIEW_NOTIFICATIONS = 'view_notifications',
  EMERGENCY_ACCESS = 'emergency_access',
  ALL_ACCESS = 'all_access'
}

// Notification Types
export enum NotificationType {
  BOOKING_CREATED = 'booking_created',
  BOOKING_UPDATED = 'booking_updated',
  BOOKING_CANCELLED = 'booking_cancelled',
  PRESCRIPTION_ADDED = 'prescription_added',
  PRESCRIPTION_UPDATED = 'prescription_updated',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  SUPPORT_ISSUE_CREATED = 'support_issue_created',
  SUPPORT_ISSUE_UPDATED = 'support_issue_updated',
  SUPPORT_RESOLVED = 'support_resolved',
  EMERGENCY_ALERT = 'emergency_alert',
  DELEGATION_REQUEST = 'delegation_request',
  DELEGATION_ACCEPTED = 'delegation_accepted',
  DELEGATION_REVOKED = 'delegation_revoked',
  CARE_CIRCLE_UPDATE = 'care_circle_update'
}

// Delegation Status
export enum DelegationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

// Link Status
export enum LinkStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

// Share Status
export enum ShareStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

// Emergency Access Level
export enum EmergencyAccessLevel {
  VIEW_ONLY = 'view_only',
  LIMITED_MANAGE = 'limited_manage',
  FULL_ACCESS = 'full_access'
}

// Support Permission Schema
export interface ISupportPermission {
  permissions: SupportPermissionType[];
  canManageBookings: boolean;
  canManagePrescriptions: boolean;
  canViewMedicalRecords: boolean;
  canAccessBilling: boolean;
  canCreateSupportTickets: boolean;
  canResolveIssues: boolean;
  emergencyAccess: boolean;
  customPermissions?: Record<string, boolean>;
}

// Support Delegation Schema
export interface IDelegationScope {
  services: string[];
  actions: string[];
  resourceTypes: string[];
  timeBound: boolean;
  validFrom?: Date;
  validUntil?: Date;
}

// Family Support Link
export interface IFamilySupportLink {
  ownerId: string;
  familyMemberId: string;
  familyMemberName: string;
  relationship: string;
  permissions: ISupportPermission;
  status: LinkStatus;
  linkedAt: Date;
  expiresAt?: Date;
  createdBy: string;
  notes?: string;
}

// Support Delegation
export interface ISupportDelegation {
  ownerId: string;
  delegateId: string;
  delegateName: string;
  scope: IDelegationScope;
  status: DelegationStatus;
  createdAt: Date;
  acceptedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
}

// Family Notification
export interface IFamilyNotification {
  recipientId: string;
  recipientName: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  relatedCustomerId: string;
  relatedCustomerName: string;
  read: boolean;
  delivered: boolean;
  channels: string[];
  sentAt: Date;
  readAt?: Date;
  metadata?: Record<string, unknown>;
}

// Support Share
export interface ISupportShare {
  ownerId: string;
  shareType: string;
  sharedWith: string[];
  content: Record<string, unknown>;
  status: ShareStatus;
  sharedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
}

// Care Circle Link
export interface ICareCircleLink {
  customerId: string;
  careCircleId: string;
  careCircleName: string;
  linkedAt: Date;
  linkedBy: string;
  autoSyncPermissions: boolean;
  sharedServices: string[];
}

// Emergency Access
export interface IEmergencyAccess {
  customerId: string;
  grantedTo: string[];
  accessLevel: EmergencyAccessLevel;
  grantedAt: Date;
  expiresAt?: Date;
  reason: string;
  active: boolean;
  lastAccessedAt?: Date;
  accessLog: Array<{
    accessedBy: string;
    accessedAt: Date;
    action: string;
    resource: string;
  }>;
}

// Family Support History
export interface IFamilySupportHistory {
  customerId: string;
  familyMemberId: string;
  familyMemberName: string;
  action: string;
  actionType: string;
  details: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  relatedResourceId?: string;
  relatedResourceType?: string;
}

// Mongoose Document Interfaces
export interface IFamilySupportLinkDocument extends IFamilySupportLink, Document {}
export interface ISupportDelegationDocument extends ISupportDelegation, Document {}
export interface IFamilyNotificationDocument extends IFamilyNotification, Document {}
export interface ISupportShareDocument extends ISupportShare, Document {}
export interface ICareCircleLinkDocument extends ICareCircleLink, Document {}
export interface IEmergencyAccessDocument extends IEmergencyAccess, Document {}
export interface IFamilySupportHistoryDocument extends IFamilySupportHistory, Document {}

// Mongoose Schemas
const SupportPermissionSchema = new Schema<ISupportPermission>({
  permissions: [{
    type: String,
    enum: Object.values(SupportPermissionType)
  }],
  canManageBookings: { type: Boolean, default: false },
  canManagePrescriptions: { type: Boolean, default: false },
  canViewMedicalRecords: { type: Boolean, default: false },
  canAccessBilling: { type: Boolean, default: false },
  canCreateSupportTickets: { type: Boolean, default: false },
  canResolveIssues: { type: Boolean, default: false },
  emergencyAccess: { type: Boolean, default: false },
  customPermissions: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const DelegationScopeSchema = new Schema<IDelegationScope>({
  services: [{ type: String }],
  actions: [{ type: String }],
  resourceTypes: [{ type: String }],
  timeBound: { type: Boolean, default: false },
  validFrom: { type: Date },
  validUntil: { type: Date }
}, { _id: false });

const FamilySupportLinkSchema = new Schema<IFamilySupportLinkDocument>({
  ownerId: { type: String, required: true, index: true },
  familyMemberId: { type: String, required: true, index: true },
  familyMemberName: { type: String, required: true },
  relationship: { type: String, required: true },
  permissions: { type: SupportPermissionSchema, required: true },
  status: {
    type: String,
    enum: Object.values(LinkStatus),
    default: LinkStatus.ACTIVE
  },
  linkedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  createdBy: { type: String, required: true },
  notes: { type: String }
}, { timestamps: true });

FamilySupportLinkSchema.index({ ownerId: 1, familyMemberId: 1 }, { unique: true });

const SupportDelegationSchema = new Schema<ISupportDelegationDocument>({
  ownerId: { type: String, required: true, index: true },
  delegateId: { type: String, required: true, index: true },
  delegateName: { type: String, required: true },
  scope: { type: DelegationScopeSchema, required: true },
  status: {
    type: String,
    enum: Object.values(DelegationStatus),
    default: DelegationStatus.PENDING
  },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  expiresAt: { type: Date },
  revokedAt: { type: Date },
  revocationReason: { type: String }
}, { timestamps: true });

SupportDelegationSchema.index({ ownerId: 1, delegateId: 1 });
SupportDelegationSchema.index({ delegateId: 1, status: 1 });

const FamilyNotificationSchema = new Schema<IFamilyNotificationDocument>({
  recipientId: { type: String, required: true, index: true },
  recipientName: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  relatedCustomerId: { type: String, required: true, index: true },
  relatedCustomerName: { type: String, required: true },
  read: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  channels: [{ type: String }],
  sentAt: { type: Date, default: Date.now },
  readAt: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

FamilyNotificationSchema.index({ recipientId: 1, sentAt: -1 });
FamilyNotificationSchema.index({ relatedCustomerId: 1, type: 1 });

const SupportShareSchema = new Schema<ISupportShareDocument>({
  ownerId: { type: String, required: true, index: true },
  shareType: { type: String, required: true },
  sharedWith: [{ type: String }],
  content: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: Object.values(ShareStatus),
    default: ShareStatus.ACTIVE
  },
  sharedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  revokedAt: { type: Date }
}, { timestamps: true });

SupportShareSchema.index({ ownerId: 1, status: 1 });

const CareCircleLinkSchema = new Schema<ICareCircleLinkDocument>({
  customerId: { type: String, required: true, index: true },
  careCircleId: { type: String, required: true },
  careCircleName: { type: String, required: true },
  linkedAt: { type: Date, default: Date.now },
  linkedBy: { type: String, required: true },
  autoSyncPermissions: { type: Boolean, default: false },
  sharedServices: [{ type: String }]
}, { timestamps: true });

CareCircleLinkSchema.index({ customerId: 1, careCircleId: 1 }, { unique: true });

const EmergencyAccessSchema = new Schema<IEmergencyAccessDocument>({
  customerId: { type: String, required: true, index: true },
  grantedTo: [{ type: String }],
  accessLevel: {
    type: String,
    enum: Object.values(EmergencyAccessLevel),
    default: EmergencyAccessLevel.VIEW_ONLY
  },
  grantedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  reason: { type: String, required: true },
  active: { type: Boolean, default: true },
  lastAccessedAt: { type: Date },
  accessLog: [{
    accessedBy: String,
    accessedAt: Date,
    action: String,
    resource: String
  }]
}, { timestamps: true });

const FamilySupportHistorySchema = new Schema<IFamilySupportHistoryDocument>({
  customerId: { type: String, required: true, index: true },
  familyMemberId: { type: String, required: true },
  familyMemberName: { type: String, required: true },
  action: { type: String, required: true },
  actionType: { type: String, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  relatedResourceId: { type: String },
  relatedResourceType: { type: String }
}, { timestamps: true });

FamilySupportHistorySchema.index({ customerId: 1, timestamp: -1 });
FamilySupportHistorySchema.index({ familyMemberId: 1, timestamp: -1 });

// Export Models
export const FamilySupportLink = mongoose.model<IFamilySupportLinkDocument>('FamilySupportLink', FamilySupportLinkSchema);
export const SupportDelegation = mongoose.model<ISupportDelegationDocument>('SupportDelegation', SupportDelegationSchema);
export const FamilyNotification = mongoose.model<IFamilyNotificationDocument>('FamilyNotification', FamilyNotificationSchema);
export const SupportShare = mongoose.model<ISupportShareDocument>('SupportShare', SupportShareSchema);
export const CareCircleLink = mongoose.model<ICareCircleLinkDocument>('CareCircleLink', CareCircleLinkSchema);
export const EmergencyAccess = mongoose.model<IEmergencyAccessDocument>('EmergencyAccess', EmergencyAccessSchema);
export const FamilySupportHistory = mongoose.model<IFamilySupportHistoryDocument>('FamilySupportHistory', FamilySupportHistorySchema);
