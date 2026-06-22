import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  order: number;
  isActive: boolean;
  views: number;
  helpfulCount?: number;
  notHelpfulCount?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListFAQsResponse {
  faqs: FAQItem[];
  total: number;
  page: number;
  pages: number;
}

class FAQAdminService {
  async list(filters?: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<ListFAQsResponse> {
    let url = 'admin/support/faq';
    const params: string[] = [];

    if (filters?.page) params.push(`page=${filters.page}`);
    if (filters?.limit) params.push(`limit=${filters.limit}`);
    if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
    if (filters?.isActive !== undefined) params.push(`isActive=${filters.isActive}`);
    if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);

    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await apiClient.get<ListFAQsResponse>(url);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to load FAQs');
  }

  async create(data: {
    question: string;
    answer: string;
    category: string;
    subcategory?: string;
    tags?: string[];
    order?: number;
    isActive?: boolean;
    imageUrl?: string;
  }): Promise<FAQItem | null> {
    try {
      // Backend: sendCreated(res, faq) → data IS the faq, not { faq: ... }
      const response = await apiClient.post<FAQItem>('admin/support/faq', data);
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      logger.error('[FAQ Admin] Error creating FAQ:', error);
      return null;
    }
  }

  async update(id: string, data: Partial<FAQItem>): Promise<FAQItem | null> {
    try {
      // Backend: sendSuccess(res, faq) → data IS the faq, not { faq: ... }
      const response = await apiClient.put<FAQItem>(`admin/support/faq/${id}`, data);
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      logger.error('[FAQ Admin] Error updating FAQ:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`admin/support/faq/${id}`);
      return response.success;
    } catch (error) {
      logger.error('[FAQ Admin] Error deleting FAQ:', error);
      return false;
    }
  }

  async toggleActive(id: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`admin/support/faq/${id}/toggle`);
      return response.success;
    } catch (error) {
      logger.error('[FAQ Admin] Error toggling FAQ:', error);
      return false;
    }
  }

  async reorder(items: Array<{ id: string; order: number }>): Promise<boolean> {
    try {
      const response = await apiClient.put('admin/support/faq/reorder', { items });
      return response.success;
    } catch (error) {
      logger.error('[FAQ Admin] Error reordering FAQs:', error);
      return false;
    }
  }
}

export const faqAdminService = new FAQAdminService();
export default faqAdminService;
