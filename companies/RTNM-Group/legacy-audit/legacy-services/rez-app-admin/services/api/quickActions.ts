import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// ============================================
// TYPES
// ============================================

export interface QuickActionAdmin {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickActionsListResponse {
  quickActions: QuickActionAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QuickActionsQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

// ============================================
// SERVICE
// ============================================

class QuickActionsService {
  /**
   * Get quick actions with pagination and filters
   */
  async getAll(query: QuickActionsQuery = {}): Promise<QuickActionsListResponse> {
    try {
      logger.info('[QuickActions] Fetching quick actions with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/quick-actions${params.toString() ? `?${params.toString()}` : ''}`;
      // Backend uses sendPaginated → data is array directly, pagination is in meta.pagination
      const response = await apiClient.get<any>(endpoint);

      if (response.success) {
        const raw = response.data;
        const quickActions: QuickActionAdmin[] = Array.isArray(raw)
          ? raw
          : (raw?.quickActions ?? []);
        const pagination = (response as any).meta?.pagination ??
          raw?.pagination ?? {
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            total: quickActions.length,
            pages: 1,
          };
        logger.info('[QuickActions] Fetched successfully', { count: quickActions.length });
        return { quickActions, pagination };
      }

      throw new Error(response.message || 'Failed to fetch quick actions');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Get all error:', message);
      throw new Error(message || 'Failed to fetch quick actions');
    }
  }

  /**
   * Get a single quick action by ID
   */
  async getById(id: string): Promise<QuickActionAdmin> {
    try {
      logger.info('[QuickActions] Fetching quick action:', id);
      const response = await apiClient.get<QuickActionAdmin>(`admin/quick-actions/${id}`);

      if (response.success && response.data) {
        logger.info('[QuickActions] Action fetched:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch quick action');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Get by ID error:', message);
      throw new Error(message || 'Failed to fetch quick action');
    }
  }

  /**
   * Create a new quick action
   */
  async create(data: Partial<QuickActionAdmin>): Promise<QuickActionAdmin> {
    try {
      logger.info('[QuickActions] Creating quick action:', data.title);
      const response = await apiClient.post<QuickActionAdmin>('admin/quick-actions', data);

      if (response.success && response.data) {
        logger.info('[QuickActions] Action created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create quick action');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Create error:', message);
      throw new Error(message || 'Failed to create quick action');
    }
  }

  /**
   * Update an existing quick action
   */
  async update(id: string, data: Partial<QuickActionAdmin>): Promise<QuickActionAdmin> {
    try {
      logger.info('[QuickActions] Updating quick action:', id);
      const response = await apiClient.put<QuickActionAdmin>(`admin/quick-actions/${id}`, data);

      if (response.success && response.data) {
        logger.info('[QuickActions] Action updated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update quick action');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Update error:', message);
      throw new Error(message || 'Failed to update quick action');
    }
  }

  /**
   * Delete a quick action
   */
  async remove(id: string): Promise<void> {
    try {
      logger.info('[QuickActions] Deleting quick action:', id);
      const response = await apiClient.delete(`admin/quick-actions/${id}`);

      if (response.success) {
        logger.info('[QuickActions] Action deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete quick action');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Delete error:', message);
      throw new Error(message || 'Failed to delete quick action');
    }
  }

  /**
   * Toggle quick action active status
   */
  async toggleActive(id: string): Promise<QuickActionAdmin> {
    try {
      logger.info('[QuickActions] Toggling active status for action:', id);
      const response = await apiClient.patch<QuickActionAdmin>(
        `admin/quick-actions/${id}/toggle-active`
      );

      if (response.success && response.data) {
        logger.info('[QuickActions] Active toggled, now:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle quick action status');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Toggle active error:', message);
      throw new Error(message || 'Failed to toggle quick action status');
    }
  }

  /**
   * Reorder quick actions by sending ordered IDs
   */
  async reorder(orderedIds: string[]): Promise<void> {
    try {
      if (__DEV__)
        logger.info('[QuickActions] Reordering quick actions', { count: orderedIds.length });
      const response = await apiClient.post('admin/quick-actions/reorder', { orderedIds });

      if (response.success) {
        logger.info('[QuickActions] Reorder successful');
        return;
      }

      throw new Error(response.message || 'Failed to reorder quick actions');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[QuickActions] Reorder error:', message);
      throw new Error(message || 'Failed to reorder quick actions');
    }
  }
}

export const quickActionsService = new QuickActionsService();
export default quickActionsService;
