// Generic audit logger interface that works with mongoose.Collection and native MongoDB

export enum AUDIT_ACTIONS {
  // Wallet actions
  COINS_CREDITED = 'COINS_CREDITED',
  COINS_DEBITED = 'COINS_DEBITED',
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_UPDATED = 'WALLET_UPDATED',
  WALLET_FROZEN = 'WALLET_FROZEN',
  WALLET_UNFROZEN = 'WALLET_UNFROZEN',

  // Payout actions
  WITHDRAWAL_REQUESTED = 'WITHDRAWAL_REQUESTED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  PAYOUT_INITIATED = 'PAYOUT_INITIATED',
  PAYOUT_COMPLETED = 'PAYOUT_COMPLETED',

  // Payment actions
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Order actions
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',

  // Refund actions
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',

  // User actions
  USER_REGISTERED = 'USER_REGISTERED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',

  // Merchant actions
  MERCHANT_REGISTERED = 'MERCHANT_REGISTERED',
  MERCHANT_APPROVED = 'MERCHANT_APPROVED',
  MERCHANT_REJECTED = 'MERCHANT_REJECTED',

  // KYC actions
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',

  // Auth actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // General actions
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  merchantId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export class AuditLogger {
  private _collection: {
    insertOne(doc: unknown): Promise<{ insertedId: unknown }>;
    find(query: unknown): {
      sort(sort: unknown): {
        limit(n: number): {
          toArray(): Promise<unknown[]>;
        };
      };
      toArray(): Promise<unknown[]>;
    };
  };
  private serviceName: string;

  constructor(collection: unknown, serviceName: string = 'unknown') {
    this._collection = collection as AuditLogger['_collection'];
    this.serviceName = serviceName;
  }

  async log(entry: Omit<AuditLogEntry, 'timestamp'> & { timestamp?: Date }): Promise<unknown> {
    const fullEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    };
    const result = await this._collection.insertOne(fullEntry);
    return result.insertedId;
  }

  async logSuccess(
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<unknown> {
    return this.log({ action, metadata, status: 'success' });
  }

  async logFailure(
    action: string,
    errorMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<unknown> {
    return this.log({ action, metadata, status: 'failure', errorMessage });
  }

  async getLogsByUser(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this._collection.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as Promise<AuditLogEntry[]>;
  }

  async getLogsByAction(action: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this._collection.find({ action })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as Promise<AuditLogEntry[]>;
  }
}
