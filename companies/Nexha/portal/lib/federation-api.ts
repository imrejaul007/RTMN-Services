/**
 * FederationOS API Client
 * Nexha Portal v2.0 — Federation pages
 *
 * All calls go to federation.nexha.io (port 4273 in dev).
 * Uses Bearer JWT auth when logged in.
 */

const FEDERATION_BASE =
  process.env.NEXT_PUBLIC_FEDERATION_URL || 'http://localhost:4273';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MembershipTier = 'founding' | 'strategic' | 'standard' | 'associate' | 'observer';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'expelled' | 'churned';
export type HandshakeStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';

export interface Nexha {
  id: string;
  name: string;
  description: string;
  tier: MembershipTier;
  status: MembershipStatus;
  region: string;
  contactEmail: string;
  publicKey: string;
  categories: string[];
  osVersion: string;
  joinedAt: string;
  lastSyncAt: string;
  metadata?: Record<string, unknown>;
}

export interface Handshake {
  id: string;
  initiatorId: string;
  targetId: string;
  status: HandshakeStatus;
  terms: {
    mutualCapabilities: string[];
    dataSharing: 'none' | 'public' | 'aggregated' | 'full';
    paymentTerms: 'standard' | 'preferred' | 'custom';
    liabilityCap?: number;
  };
  initiatorSignature: string;
  targetSignature?: string;
  initiatedAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

export interface FederationStats {
  totalNexhas: number;
  byTier: Record<MembershipTier, number>;
  byStatus: Record<MembershipStatus, number>;
  totalHandshakes: number;
  activeHandshakes: number;
  totalPolicies: number;
  regions: string[];
}

export interface FederationHealth {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  checks: { name: string; status: 'pass' | 'warn' | 'fail'; message: string }[];
  uptime: number;
  stats: FederationStats;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  nexhaId: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OnboardingChecklist {
  nexhaId: string;
  nexhaName: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  items: OnboardingItem[];
  createdAt: string;
  lastUpdatedAt: string;
}

export interface OnboardingItem {
  id: string;
  category: 'account' | 'technical' | 'compliance' | 'partnership' | 'training';
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  assignee?: string;
  dueDays?: number;
}

export interface Inquiry {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  industryCategory: string;
  region: string;
  employeeCount?: number;
  currentChallenge?: string;
  referralSource: string;
  referredBy?: string;
  status: 'new' | 'contacted' | 'nurturing' | 'converted' | 'lost';
  submittedAt: string;
}

export interface FoundingMemberMetrics {
  totalFoundingMembers: number;
  foundingMembers: {
    id: string; name: string; region: string; category: string;
    peersCount: number; pendingHandshakes: number;
    lastSyncAt: string; aciScore: number; tier: MembershipTier;
  }[];
  avgPeersPerFounding: number;
  avgAciScore: number;
  avgPendingHandshakes: number;
}

export interface MatchRecommendation {
  nexha: Nexha;
  score: number;
  matchReasons: string[];
  categoryScore: number;
  tierAffinity: number;
  statusBonus: number;
  handshakePotential: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ── HTTP client ───────────────────────────────────────────────────────────────

async function fedRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('nexha_federation_token')
      : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${FEDERATION_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) throw new Error(json.error || `API error: ${res.status}`);
  return json.data as T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const federation = {
  // Health
  health: () => fedRequest<FederationHealth>('/api/v1/federation/health'),
  stats: () => fedRequest<FederationStats>('/api/v1/stats'),
  analytics: {
    founding: () => fedRequest<FoundingMemberMetrics>('/api/v1/analytics/founding'),
  },

  // Nexhas
  list: (params?: { tier?: MembershipTier; status?: MembershipStatus; region?: string; category?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();
    return fedRequest<{ nexhas: Nexha[]; total: number }>(`/api/v1/nexhas${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => fedRequest<Nexha>(`/api/v1/nexhas/${id}`),
  peers: (id: string) => fedRequest<{ nexhaId: string; peers: Nexha[]; total: number }>(`/api/v1/nexhas/${id}/peers`),
  matches: (id: string, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : '';
    return fedRequest<{ nexhaId: string; matches: MatchRecommendation[]; total: number }>(`/api/v1/nexhas/${id}/matches${qs}`);
  },
  audit: (id: string) => fedRequest<{ nexhaId: string; entries: AuditEntry[]; total: number }>(`/api/v1/nexhas/${id}/audit`),
  join: (payload: Omit<Nexha, 'id' | 'status' | 'tier' | 'osVersion' | 'joinedAt' | 'lastSyncAt'>) =>
    fedRequest<Nexha>('/api/v1/nexhas/join', { method: 'POST', body: JSON.stringify(payload) }),

  // Inquiry
  submitInquiry: (payload: Omit<Inquiry, 'id' | 'submittedAt' | 'status'>) =>
    fedRequest<Inquiry>('/api/v1/nexhas/inquiry', { method: 'POST', body: JSON.stringify(payload) }),
  listInquiries: (status?: Inquiry['status']) => {
    const qs = status ? `?status=${status}` : '';
    return fedRequest<{ inquiries: Inquiry[]; total: number }>(`/api/v1/nexhas/inquiry${qs}`);
  },

  // Referral
  refer: (nexhaId: string, payload: { prospectName: string; prospectEmail: string; prospectOrganization: string; category: string }) =>
    fedRequest<unknown>(`/api/v1/nexhas/${nexhaId}/refer`, { method: 'POST', body: JSON.stringify(payload) }),
  listReferrals: (params?: { referrerNexhaId?: string; status?: string }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]).toString();
    return fedRequest<{ referrals: unknown[]; total: number }>(`/api/v1/referrals${qs ? `?${qs}` : ''}`);
  },

  // Onboarding checklist
  checklist: (nexhaId: string) => fedRequest<OnboardingChecklist>(`/api/v1/onboarding/checklist/${nexhaId}`),
  updateChecklistItem: (nexhaId: string, itemId: string, completed: boolean) =>
    fedRequest<OnboardingChecklist>(
      `/api/v1/onboarding/checklist/${nexhaId}/${itemId}`,
      { method: 'PATCH', body: JSON.stringify({ completed }) }
    ),

  // Handshakes
  listHandshakes: (params?: { initiatorId?: string; targetId?: string; status?: HandshakeStatus }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]).toString();
    return fedRequest<{ handshakes: Handshake[]; total: number }>(`/api/v1/handshakes${qs ? `?${qs}` : ''}`);
  },
  initiateHandshake: (payload: { initiatorId: string; targetId: string; terms: Handshake['terms'] }) =>
    fedRequest<Handshake>('/api/v1/handshakes', { method: 'POST', body: JSON.stringify(payload) }),
  respondHandshake: (id: string, accept: boolean, signature: string) =>
    fedRequest<Handshake>(`/api/v1/handshakes/${id}/respond`, {
      method: 'POST', body: JSON.stringify({ accept, targetSignature: signature }),
    }),

  // API base URL
  baseUrl: FEDERATION_BASE,
};
