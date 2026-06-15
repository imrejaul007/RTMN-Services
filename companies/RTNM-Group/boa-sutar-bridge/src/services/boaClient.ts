// BOA OS HTTP Client
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ServiceUnavailableError } from '../utils/errors';

export class BoaClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = config.boaOSUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({ baseURL: baseUrl, timeout: 5000 });
  }

  async getObjective(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/objective/${id}`);
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`[BoaClient] Failed to get objective ${id}: ${error.message}`);
      throw new ServiceUnavailableError('BOA OS');
    }
  }

  async getAllObjectives(filters?: { strategyId?: string; owner?: string }): Promise<any[]> {
    try {
      const response = await this.client.get('/api/v1/objective', { params: filters });
      return response.data?.data || [];
    } catch (error: any) {
      logger.warn(`[BoaClient] Failed to list objectives: ${error.message}`);
      return [];
    }
  }

  async getStrategy(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/strategy/${id}`);
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      return null;
    }
  }

  async getStrategySummary(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/strategy/${id}/summary`);
      return response.data?.data;
    } catch (error: any) { return null; }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 2000 });
      return response.status === 200;
    } catch { return false; }
  }
}

export const boaClient = new BoaClient();
export default boaClient;
