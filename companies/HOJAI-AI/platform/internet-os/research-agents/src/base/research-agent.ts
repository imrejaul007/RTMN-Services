/**
 * HOJAI Base Research Agent
 *
 * Foundation for all autonomous research agents.
 * REUSES: InternetOS API + MemoryOS (4703) + TwinOS (4705)
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const TWIN_OS_URL = process.env.TWIN_OS_URL || 'http://localhost:4705';

export interface ResearchAgentConfig {
  name: string;
  type: 'market' | 'competitor' | 'procurement' | 'policy' | 'technology' | 'talent';
  skills: string[];
  actors: string[];
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly';
    time?: string; // HH:MM
  };
  deliveryChannels?: string[];
  memoryPartition?: string;
}

export interface ResearchReport {
  agentName: string;
  agentType: string;
  reportId: string;
  generatedAt: string;
  duration: number;
  data: any;
  summary: string;
  insights: string[];
  recommendations: string[];
  alerts?: string[];
}

export class ResearchAgent {
  protected config: ResearchAgentConfig;
  protected token: string;
  protected isRunning: boolean = false;

  constructor(config: ResearchAgentConfig, token?: string) {
    this.config = config;
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'research-agent';
  }

  protected get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Call an actor via InternetOS API
   */
  protected async callActor(
    actorId: string,
    action: string,
    params: Record<string, any>
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/${actorId}/run`,
        { action, params },
        { headers: this.headers, timeout: 30000 }
      );
      return response.data?.data || [];
    } catch (error) {
      console.warn(`Actor ${actorId} failed:`, (error as Error).message);
      return [];
    }
  }

  /**
   * Store report in MemoryOS
   */
  protected async storeReport(report: ResearchReport): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: `research-${this.config.type}`,
          content: JSON.stringify(report),
          type: 'research-report',
          metadata: {
            agentName: report.agentName,
            agentType: report.agentType,
            generatedAt: report.generatedAt,
          },
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.warn(`Failed to store report in MemoryOS:`, (error as Error).message);
    }
  }

  /**
   * Send alerts via webhook
   */
  protected async sendAlert(alert: string, data: any): Promise<void> {
    try {
      await axios.post(
        `${process.env.WEBHOOK_BUS_URL || 'http://localhost:4110'}/api/dispatch`,
        {
          eventType: `research.alert.${this.config.type}`,
          payload: {
            agent: this.config.name,
            alert,
            data,
            timestamp: new Date().toISOString(),
          },
        },
        { headers: { 'x-internal-token': this.token } }
      );
    } catch (error) {
      console.warn(`Failed to send alert:`, (error as Error).message);
    }
  }

  /**
   * Generate report - to be implemented by subclasses
   */
  async generateReport(..._args: any[]): Promise<ResearchReport> {
    throw new Error('Not implemented');
  }

  /**
   * Run once
   */
  async run(...args: any[]): Promise<ResearchReport> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const report = await this.generateReport(...args);
      report.duration = Date.now() - startTime;

      // Store in MemoryOS
      await this.storeReport(report);

      // Send alerts if any
      if (report.alerts && report.alerts.length > 0) {
        for (const alert of report.alerts) {
          await this.sendAlert(alert, report);
        }
      }

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  getName(): string {
    return this.config.name;
  }

  getType(): string {
    return this.config.type;
  }

  getConfig(): ResearchAgentConfig {
    return this.config;
  }
}

export default ResearchAgent;