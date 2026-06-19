// Type augmentations for Mongoose models with custom static methods
// This is the recommended way to type Mongoose statics in TypeScript

import { Model, Document } from 'mongoose';
import { ICustomer, IIdentityLink, IRiskEvent } from './index';

// Customer statics
export interface ICustomerModel extends Model<ICustomer> {
  findByEmail(email: string): Promise<ICustomer | null>;
  findByPhone(phone: string): Promise<ICustomer | null>;
  findByCustomerId(customerId: string): Promise<ICustomer | null>;
  findByIdentity(type: string, value: string): Promise<ICustomer | null>;
  findMasterCustomer(masterId: string): Promise<ICustomer[]>;
}

// IdentityLink statics
export interface IIdentityLinkModel extends Model<IIdentityLink> {
  findByMasterId(masterId: string): Promise<IIdentityLink[]>;
  findByLinkedId(linkedId: string): Promise<IIdentityLink[]>;
  findLink(masterId: string, linkedId: string): Promise<IIdentityLink | null>;
  getAllLinkedIds(masterId: string): Promise<string[]>;
  linkCustomers(
    masterId: string,
    linkedId: string,
    linkType: string,
    confidence: number,
    matchedFields: string[],
    linkedBy?: string
  ): Promise<IIdentityLink>;
  unlinkCustomer(masterId: string, linkedId: string): Promise<boolean>;
}

// RiskEvent statics
export interface IRiskEventModel extends Model<IRiskEvent> {
  findByCustomerId(customerId: string): Promise<IRiskEvent[]>;
  findUnresolvedByCustomer(customerId: string): Promise<IRiskEvent[]>;
  findByEventType(eventType: string, limit?: number): Promise<IRiskEvent[]>;
  findBySeverity(severity: string, limit?: number): Promise<IRiskEvent[]>;
  getRecentHighSeverityEvents(hours?: number, limit?: number): Promise<IRiskEvent[]>;
  createEvent(
    customerId: string,
    eventType: string,
    severity: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<IRiskEvent>;
  resolveEvent(
    eventId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<IRiskEvent | null>;
  getCustomerRiskHistory(customerId: string): Promise<IRiskEvent[]>;
  getRiskTrend(days?: number): Promise<unknown[]>;
}

declare module 'mongoose' {
  // No module augmentation needed; we use the typed model exports directly
}
