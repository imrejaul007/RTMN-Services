import { apiClient } from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReactionTargetType = 'order' | 'store' | 'campaign' | 'product';

export interface AdminReaction {
  _id: string;
  emoji: string;
  targetType: ReactionTargetType;
  targetId: string;
  merchantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    profile?: { firstName?: string; lastName?: string };
    email?: string;
    phoneNumber?: string;
  };
}

export interface ReactionStats {
  total: number;
  byEmoji: Array<{ emoji: string; count: number }>;
  byTargetType: Array<{ targetType: string; count: number }>;
  topMerchants: Array<{ merchantId: string; merchantName?: string; count: number }>;
}

export interface ReactionsListResponse {
  reactions: AdminReaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const reactionsAdminService = {
  async getReactions(params: {
    page?: number;
    limit?: number;
    targetType?: ReactionTargetType | '';
    emoji?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ReactionsListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.targetType) qs.set('targetType', params.targetType);
    if (params.emoji) qs.set('emoji', params.emoji);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);

    const res = await apiClient.get<any>(`admin/reactions?${qs}`);
    const data = res.data || {};
    return {
      reactions: data.reactions || data.data || [],
      pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getStats(): Promise<ReactionStats> {
    const res = await apiClient.get<any>('admin/reactions/stats');
    const data = res.data || {};
    return {
      total: data.total ?? 0,
      byEmoji: data.byEmoji ?? [],
      byTargetType: data.byTargetType ?? [],
      topMerchants: data.topMerchants ?? [],
    };
  },

  async getMerchantReactions(
    merchantId: string,
    page = 1,
    limit = 20
  ): Promise<ReactionsListResponse> {
    const res = await apiClient.get<any>(
      `admin/reactions/merchants/${merchantId}?page=${page}&limit=${limit}`
    );
    const data = res.data || {};
    return {
      reactions: data.reactions || data.data || [],
      pagination: data.pagination || { page, limit, total: 0, totalPages: 0 },
    };
  },

  async deleteReaction(id: string): Promise<void> {
    await apiClient.delete(`admin/reactions/${id}`);
  },
};
