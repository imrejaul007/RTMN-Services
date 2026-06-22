import { apiClient } from './apiClient';

export interface RezNowTopItem {
  name: string;
  count: number;
  revenue: number;
}

export interface RezNowOrdersByDay {
  date: string;
  count: number;
  revenue: number;
}

export interface RezNowOrdersByHour {
  hour: number;
  count: number;
}

export interface RezNowNewVsReturning {
  new: number;
  returning: number;
}

export interface RezNowAnalytics {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  topItems: RezNowTopItem[];
  ordersByDay: RezNowOrdersByDay[];
  ordersByHour: RezNowOrdersByHour[];
  newVsReturning: RezNowNewVsReturning;
}

class RezNowAnalyticsService {
  async getAnalytics(storeSlug: string, period: string = '30d'): Promise<RezNowAnalytics> {
    const encodedSlug = encodeURIComponent(storeSlug);
    const response = await apiClient.get<RezNowAnalytics>(
      `web-ordering/store/${encodedSlug}/analytics?period=${period}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to load REZ Now analytics');
  }
}

export const rezNowAnalyticsService = new RezNowAnalyticsService();
export default rezNowAnalyticsService;
