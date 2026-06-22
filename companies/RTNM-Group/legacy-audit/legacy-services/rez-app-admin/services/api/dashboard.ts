import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface DashboardStats {
  merchants: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    newThisMonth: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    newToday: number;
  };
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingCount: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalPlatformFees: number;
    todayPlatformFees: number;
  };
  coins: {
    totalAwarded: number;
    pendingApproval: number;
    awardedToday: number;
    awardedThisMonth: number;
  };
}

export interface AnalyticsDashboardResponse {
  userGrowth: Array<{
    date: string;
    newUsers: number;
    label: string;
  }>;
  topMerchants: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
    category: string;
  }>;
  suspiciousActivity: Array<{
    id: string;
    type: string;
    description: string;
    userId?: string;
    merchantId?: string;
    amount?: number;
    flaggedAt: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface PlatformSummaryResponse {
  period: string;
  revenue: number;
  visitors: number;
  newVsReturning: { new: number; returning: number; ratio: number };
  days: Array<{ date: string; revenue: number; visitors: number }>;
}

// ============ PAGINATION TYPES ============

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  merchantId?: string;
}

export interface RecentActivityResponse {
  recentOrders: Array<{
    orderNumber: string;
    status: string;
    totals: { total: number };
    payment: { status: string };
    createdAt: string;
    user?: { profile?: { firstName?: string; lastName?: string }; phoneNumber?: string };
  }>;
  recentCoinAwards: Array<{
    amount: number;
    source: string;
    description: string;
    createdAt: string;
    user?: { profile?: { firstName?: string; lastName?: string }; phoneNumber?: string };
  }>;
}

class DashboardService {
  /**
   * Get platform dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    try {
      logger.info('[Dashboard] Fetching platform stats...');
      const response = await apiClient.get<DashboardStats>('admin/dashboard/stats');

      if (response.success && response.data) {
        logger.info('[Dashboard] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      logger.error('[Dashboard] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get dashboard stats');
    }
  }

  /**
   * Get analytics dashboard data (user growth, top merchants, suspicious activity)
   */
  async getAnalyticsDashboard(): Promise<AnalyticsDashboardResponse> {
    try {
      logger.info('[Dashboard] Fetching analytics dashboard...');
      const response = await apiClient.get<AnalyticsDashboardResponse>('admin/analytics/dashboard');

      if (response.success && response.data) {
        logger.info('[Dashboard] Analytics dashboard fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get analytics dashboard');
    } catch (error: any) {
      logger.error('[Dashboard] Get analytics dashboard error:', error.message);
      throw new Error(error.message || 'Failed to get analytics dashboard');
    }
  }

  /**
   * Get recent platform activity.
   * Throws on API failure so callers can distinguish a network/server error
   * from a genuinely empty activity list (which returns non-null data with
   * empty arrays). Callers should maintain a separate `error` state instead of
   * treating a thrown error the same as an empty result.
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivityResponse> {
    logger.info('[Dashboard] Fetching recent activity...');
    const response = await apiClient.get<RecentActivityResponse>(
      `admin/dashboard/recent-activity?limit=${limit}`
    );

    if (!response.success) {
      const msg = response.message || 'Failed to load recent activity';
      logger.error('[Dashboard] Get recent activity error:', msg);
      throw new Error(msg);
    }

    logger.info('[Dashboard] Recent activity fetched');
    // response.data may be null when the server returns success with no body;
    // in that case return the canonical empty shape rather than null.
    return response.data ?? { recentOrders: [], recentCoinAwards: [] };
  }

  /**
   * Get platform summary from analytics-events service.
   * Routed through the backend proxy so auth headers are included automatically.
   */
  async getPlatformSummary(period: string = '30d'): Promise<PlatformSummaryResponse | null> {
    try {
      logger.info(`[Dashboard] Fetching platform summary (period=${period})...`);
      const response = await apiClient.get<PlatformSummaryResponse>(
        `admin/analytics/platform-summary?period=${period}`
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Platform summary fetched successfully');
        return response.data;
      }

      logger.warn('[Dashboard] Platform summary returned no data (non-critical)');
      return null;
    } catch (error: any) {
      // Platform summary is non-critical — analytics-events may be unavailable.
      logger.warn('[Dashboard] getPlatformSummary error (non-critical):', error.message);
      return null;
    }
  }

  // ============ SERVER-SIDE PAGINATION METHODS ============

  /**
   * Get paginated orders with server-side filtering
   * Reduces client-side memory usage and improves load times
   */
  async getPaginatedOrders(options: {
    page?: number;
    limit?: number;
    filters?: AnalyticsFilters;
  } = {}): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 50, filters = {} } = options;

    try {
      logger.info('[Dashboard] Fetching paginated orders...');
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      // Add filters to query params
      if (filters.startDate) queryParams.set('startDate', filters.startDate);
      if (filters.endDate) queryParams.set('endDate', filters.endDate);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.merchantId) queryParams.set('merchantId', filters.merchantId);

      const response = await apiClient.get<PaginatedResponse<any>>(
        `admin/analytics/orders?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Paginated orders fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get paginated orders');
    } catch (error: any) {
      logger.error('[Dashboard] Get paginated orders error:', error.message);
      throw new Error(error.message || 'Failed to get paginated orders');
    }
  }

  /**
   * Get paginated merchants with server-side filtering
   */
  async getPaginatedMerchants(options: {
    page?: number;
    limit?: number;
    filters?: AnalyticsFilters;
  } = {}): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 50, filters = {} } = options;

    try {
      logger.info('[Dashboard] Fetching paginated merchants...');
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.status) queryParams.set('status', filters.status);
      if (filters.category) queryParams.set('category', filters.category);

      const response = await apiClient.get<PaginatedResponse<any>>(
        `admin/analytics/merchants?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Paginated merchants fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get paginated merchants');
    } catch (error: any) {
      logger.error('[Dashboard] Get paginated merchants error:', error.message);
      throw new Error(error.message || 'Failed to get paginated merchants');
    }
  }

  /**
   * Get paginated users with server-side filtering
   */
  async getPaginatedUsers(options: {
    page?: number;
    limit?: number;
    filters?: AnalyticsFilters;
  } = {}): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 50, filters = {} } = options;

    try {
      logger.info('[Dashboard] Fetching paginated users...');
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.startDate) queryParams.set('startDate', filters.startDate);
      if (filters.endDate) queryParams.set('endDate', filters.endDate);
      if (filters.status) queryParams.set('status', filters.status);

      const response = await apiClient.get<PaginatedResponse<any>>(
        `admin/analytics/users?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Paginated users fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get paginated users');
    } catch (error: any) {
      logger.error('[Dashboard] Get paginated users error:', error.message);
      throw new Error(error.message || 'Failed to get paginated users');
    }
  }

  /**
   * Get paginated transactions with server-side filtering
   */
  async getPaginatedTransactions(options: {
    page?: number;
    limit?: number;
    filters?: AnalyticsFilters;
  } = {}): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 50, filters = {} } = options;

    try {
      logger.info('[Dashboard] Fetching paginated transactions...');
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.startDate) queryParams.set('startDate', filters.startDate);
      if (filters.endDate) queryParams.set('endDate', filters.endDate);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.merchantId) queryParams.set('merchantId', filters.merchantId);

      const response = await apiClient.get<PaginatedResponse<any>>(
        `admin/analytics/transactions?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Paginated transactions fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get paginated transactions');
    } catch (error: any) {
      logger.error('[Dashboard] Get paginated transactions error:', error.message);
      throw new Error(error.message || 'Failed to get paginated transactions');
    }
  }

  /**
   * Get export data with server-side filtering (for large dataset exports)
   */
  async getExportData(options: {
    type: 'orders' | 'merchants' | 'users' | 'transactions';
    filters?: AnalyticsFilters;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
    try {
      logger.info(`[Dashboard] Requesting export for ${options.type}...`);
      const response = await apiClient.post<{ downloadUrl: string; expiresAt: string }>(
        'admin/analytics/export',
        options
      );

      if (response.success && response.data) {
        logger.info('[Dashboard] Export data requested successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to request export');
    } catch (error: any) {
      logger.error('[Dashboard] Get export data error:', error.message);
      throw new Error(error.message || 'Failed to get export data');
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
