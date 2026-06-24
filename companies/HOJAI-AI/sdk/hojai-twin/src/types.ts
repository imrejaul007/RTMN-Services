export const TWIN_PORTS: Record<string, number> = {
  hub: 4705, capabilityProfile: 4150,
  customer: 4895, order: 5310, employee: 4730, voice: 4876,
};

/** Money in minor units (cents/paise). */
export interface Money {
  amount: number;
  currency: string;
}

/** Generic twin record (works for any twin type via the Hub). */
export interface TwinRecord {
  id: string;
  type: string; // 'customer' | 'order' | 'employee' | ...
  ownerCorpId?: string;
  name?: string;
  attributes: Record<string, unknown>;
  state?: Record<string, unknown>;
  identity?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  context?: Record<string, unknown>;
  lifecycle?: { stage: string; transitionedAt?: string; metadata?: Record<string, unknown> };
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface TwinRelationship {
  id: string;
  fromTwinId: string;
  toTwinId: string;
  kind: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TwinStats {
  totalTwins: number;
  byType: Record<string, number>;
  totalRelationships: number;
  activeSyncs: number;
  archivedTwins: number;
}

export interface TwinCategory {
  id: string;
  name: string;
  description?: string;
  count: number;
}
