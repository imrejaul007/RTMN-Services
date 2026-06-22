import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';

// Forensics MCP URLs from environment
const MCP_EVIDENCE_URL = process.env.MCP_EVIDENCE_URL || 'http://localhost:3120';
const MCP_DEEPFAKE_URL = process.env.MCP_DEEPFAKE_URL || 'http://localhost:3121';
const MCP_CUSTODY_URL = process.env.MCP_CUSTODY_URL || 'http://localhost:3122';
const MCP_FORENSICS_URL = process.env.MCP_FORENSICS_URL || 'http://localhost:3123';
const MCP_SOCIAL_URL = process.env.MCP_SOCIAL_URL || 'http://localhost:3130';
const MCP_FINANCIAL_URL = process.env.MCP_FINANCIAL_URL || 'http://localhost:3131';
const MCP_LOCATION_URL = process.env.MCP_LOCATION_URL || 'http://localhost:3132';
const MCP_REPORTS_URL = process.env.MCP_REPORTS_URL || 'http://localhost:3133';

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT = 15000;

function createForensicsClient(name: string, baseURL: string) {
  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error(`forensics_client_${name}_error`, {
        status: error.response?.status,
        error: error.message,
        url: error.config?.url
      });
      return Promise.reject(error);
    }
  );

  return {
    async get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
      const response: AxiosResponse<T> = await client.get(path, {
        headers: options?.headers,
        params: options?.params
      });
      return response.data;
    },

    async post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
      const response: AxiosResponse<T> = await client.post(path, data, {
        headers: options?.headers,
        params: options?.params
      });
      return response.data;
    }
  };
}

// Forensics MCP clients
export const evidenceClient = createForensicsClient('evidence', MCP_EVIDENCE_URL);
export const deepfakeClient = createForensicsClient('deepfake', MCP_DEEPFAKE_URL);
export const custodyClient = createForensicsClient('custody', MCP_CUSTODY_URL);
export const forensicsClient = createForensicsClient('forensics', MCP_FORENSICS_URL);
export const socialClient = createForensicsClient('social', MCP_SOCIAL_URL);
export const financialClient = createForensicsClient('financial', MCP_FINANCIAL_URL);
export const locationClient = createForensicsClient('location', MCP_LOCATION_URL);
export const reportsClient = createForensicsClient('reports', MCP_REPORTS_URL);

// Forensics Gateway client (unified orchestration)
const FORENSICS_GATEWAY_URL = process.env.FORENSICS_GATEWAY_URL || 'http://localhost:5100';

export const forensicsGatewayClient = {
  private: createForensicsClient('forensics-gateway', FORENSICS_GATEWAY_URL),

  async startInvestigation(input: {
    query: string;
    type?: string;
    priority?: string;
    mcpServices?: string[];
  }, options?: RequestOptions) {
    return this.private.post<{
      investigationId: string;
      status: string;
      results: Record<string, unknown>;
    }>('/api/investigation', input, options);
  },

  async generateReport(input: {
    investigationId: string;
    type: string;
    format?: string;
  }, options?: RequestOptions) {
    return this.private.post<{
      reportId: string;
      status: string;
      downloadUrl?: string;
    }>('/api/report/generate', input, options);
  },

  async getTools(options?: RequestOptions) {
    return this.private.get<{
      tools: Array<{
        name: string;
        description: string;
        endpoint: string;
        capabilities: string[];
      }>;
    }>('/api/tools', options);
  }
};
