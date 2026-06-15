// SUTAR GoalOS HTTP Client
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ServiceUnavailableError } from '../utils/errors';

export class SutarClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = config.sutarGoalOSUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({ baseURL: baseUrl, timeout: 5000 });
  }

  async createGoal(goal: any): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/goals', goal);
      return response.data?.data;
    } catch (error: any) {
      logger.error(`[SutarClient] Failed to create goal: ${error.message}`);
      throw new ServiceUnavailableError('SUTAR GoalOS');
    }
  }

  async getGoal(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/goals/${id}`);
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      return null;
    }
  }

  async updateGoalProgress(id: string, progress: number, status: string): Promise<boolean> {
    try {
      await this.client.patch(`/api/v1/goals/${id}/progress`, { progress, status });
      return true;
    } catch (error: any) {
      logger.warn(`[SutarClient] Failed to update progress for ${id}: ${error.message}`);
      return false;
    }
  }

  async listGoals(filters?: any): Promise<any[]> {
    try {
      const response = await this.client.get('/api/v1/goals', { params: filters });
      return response.data?.data || [];
    } catch (error: any) { return []; }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 2000 });
      return response.status === 200;
    } catch { return false; }
  }
}

export const sutarClient = new SutarClient();
export default sutarClient;
