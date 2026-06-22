import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// Canonical types: @rez/shared-types — migrate imports when package is published

export interface PriveSubmission {
  _id: string;
  username: string;
  platform: 'instagram' | 'twitter' | 'youtube';
  campaignName: string;
  postUrl: string;
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
}

class PriveService {
  /**
   * Get submissions with optional status filter
   */
  async getSubmissions(status?: string): Promise<PriveSubmission[]> {
    try {
      logger.info('[Prive] Fetching submissions...');
      let endpoint = 'admin/prive/submissions';
      if (status) endpoint += `?status=${status}`;

      const response = await apiClient.get<PriveSubmission[]>(endpoint);

      if (response.success && response.data) {
        logger.info('[Prive] Submissions fetched successfully');
        return Array.isArray(response.data) ? response.data : [];
      }

      throw new Error(response.message || 'Failed to get submissions');
    } catch (error: any) {
      logger.error('[Prive] Get submissions error:', error.message);
      throw new Error(error.message || 'Failed to get submissions');
    }
  }

  /**
   * Bulk review multiple submissions (approve or reject)
   */
  async bulkReviewSubmissions(
    submissionIds: string[],
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Prive] Bulk reviewing submissions', { count: submissionIds.length, action });
      const results = await Promise.allSettled(
        submissionIds.map((id) => this.reviewSubmission(id, action, notes))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      return {
        success: failed === 0,
        message:
          failed === 0
            ? `${succeeded} submission(s) ${action}d successfully`
            : `${succeeded} succeeded, ${failed} failed`,
      };
    } catch (error: any) {
      logger.error('[Prive] Bulk review error:', error.message);
      throw new Error(error.message || `Failed to bulk ${action} submissions`);
    }
  }

  /**
   * Review a submission (approve or reject)
   */
  async reviewSubmission(
    submissionId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Prive] Reviewing submission', { submissionId, action });
      const body = { action, notes };
      const response = await apiClient.patch<any>(
        `admin/prive/submissions/${submissionId}/review`,
        body
      );

      return {
        success: response.success,
        message: response.message || `Submission ${action}ed`,
      };
    } catch (error: any) {
      logger.error('[Prive] Review submission error:', error.message);
      throw new Error(error.message || `Failed to ${action} submission`);
    }
  }
}

export const priveService = new PriveService();
export default priveService;
