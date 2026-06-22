import { apiClient } from './apiClient';

export interface PollOption {
  id: string;
  text: string;
  imageUrl?: string;
  voteCount: number;
}

export interface Poll {
  _id: string;
  title: string;
  description?: string;
  options: PollOption[];
  category?: string;
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  totalVotes: number;
  coinsPerVote: number;
  isDaily: boolean;
  tags: string[];
  status: 'draft' | 'active' | 'closed' | 'archived';
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface PollListResponse {
  polls: Poll[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

// Backend response wrapper for GET /admin/polls
interface PollListData {
  polls?: Poll[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
  [key: string]: unknown;
}

// Backend response wrapper for POST /admin/polls
interface CreatePollResponse {
  success: boolean;
  poll?: Poll;
  [key: string]: unknown;
}

// Backend response wrapper for PATCH /admin/polls/:id
interface UpdatePollResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

// Backend response wrapper for DELETE /admin/polls/:id
interface ArchivePollResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface CreatePollPayload {
  title: string;
  description?: string;
  options: Array<{ text: string; imageUrl?: string }>;
  category?: string;
  storeId?: string;
  startsAt: string;
  endsAt: string;
  coinsPerVote?: number;
  isDaily?: boolean;
  tags?: string[];
}

class PollsService {
  async getPolls(page: number = 1, limit: number = 20, status?: string): Promise<PollListResponse> {
    try {
      let url = `admin/polls?page=${page}&limit=${limit}`;
      if (status && status !== 'all') {
        url = `admin/polls?page=${page}&limit=${limit}&status=${status}`;
      }

      const response = await apiClient.get<PollListData>(url);

      if (response.success) {
        const nested = response.data as PollListData;
        // Backend sends `id` (mapped from _id), normalize to `_id` for frontend consistency
        const polls = (nested?.polls || []).map((p) => ({
          ...p,
          _id: p._id,
        }));
        return {
          polls,
          pagination: nested?.pagination || { current: page, pages: 0, total: 0, hasMore: false },
        };
      }
      throw new Error(response.message || 'Failed to fetch polls');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch polls');
    }
  }

  async createPoll(payload: CreatePollPayload): Promise<{ success: boolean; poll: Poll | null }> {
    try {
      const response = await apiClient.post<CreatePollResponse, CreatePollPayload>(
        'admin/polls',
        payload
      );

      if (response.success) {
        const created = (response.data as CreatePollResponse)?.poll;
        return { success: true, poll: created ?? null };
      }
      throw new Error(response.message || 'Failed to create poll');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create poll');
    }
  }

  async updatePoll(
    pollId: string,
    updates: Partial<{
      title: string;
      description: string;
      status: string;
      startsAt: string;
      endsAt: string;
      coinsPerVote: number;
      isDaily: boolean;
      tags: string[];
      category: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch<UpdatePollResponse, typeof updates>(
        `admin/polls/${pollId}`,
        updates
      );

      return {
        success: response.success,
        message: response.message || 'Poll updated successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update poll');
    }
  }

  async archivePoll(pollId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<ArchivePollResponse>(`admin/polls/${pollId}`);

      return {
        success: response.success,
        message: response.message || 'Poll archived successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to archive poll');
    }
  }
}

export const pollsService = new PollsService();
export default pollsService;
