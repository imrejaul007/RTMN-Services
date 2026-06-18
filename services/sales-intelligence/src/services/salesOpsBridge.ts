import axios, { AxiosInstance } from 'axios';
import { Deal, ForecastDataPoint } from '../models/Insights';

/**
 * SalesOpsBridge - Connects Sales Intelligence to Sales Hub and other services
 *
 * This service acts as a bridge to:
 * - REZ-ecosystem-connector (4399) - Service discovery
 * - REZ-event-bus (4510) - Event publishing
 * - Memory OS (4703) - Context storage
 * - Sales Hub (4100) - Core sales data
 */
export class SalesOpsBridge {
  private ecosystemConnector: AxiosInstance;
  private salesHub: AxiosInstance;
  private memoryOS: AxiosInstance;
  private eventBus: AxiosInstance;

  constructor() {
    const baseURL = process.env.REZ_ECOSYSTEM_CONNECTOR_URL || 'http://localhost:4399';

    this.ecosystemConnector = axios.create({
      baseURL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.salesHub = axios.create({
      baseURL: process.env.SALES_HUB_URL || 'http://localhost:4100',
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.memoryOS = axios.create({
      baseURL: process.env.MEMORY_OS_URL || 'http://localhost:4703',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.eventBus = axios.create({
      baseURL: process.env.REZ_EVENT_BUS_URL || 'http://localhost:4510',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Health check for all connected services
   */
  async healthCheck(): Promise<{ healthy: boolean; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {};

    try {
      await this.ecosystemConnector.get('/health');
      services.ecosystemConnector = true;
    } catch {
      services.ecosystemConnector = false;
    }

    try {
      await this.salesHub.get('/health');
      services.salesHub = true;
    } catch {
      services.salesHub = false;
    }

    try {
      await this.memoryOS.get('/health');
      services.memoryOS = true;
    } catch {
      services.memoryOS = false;
    }

    try {
      await this.eventBus.get('/health');
      services.eventBus = true;
    } catch {
      services.eventBus = false;
    }

    const healthy = Object.values(services).some(v => v);

    return { healthy, services };
  }

  // ==================== Deal Operations ====================

  /**
   * Get all deals with optional filters
   */
  async getDeals(teamId?: string, territoryId?: string): Promise<Deal[]> {
    try {
      const params: any = {};
      if (teamId) params.teamId = teamId;
      if (territoryId) params.territoryId = territoryId;

      const response = await this.salesHub.get('/api/deals', { params });
      return this.enrichDeals(response.data.deals || []);
    } catch (error) {
      console.error('Error fetching deals from Sales Hub:', error);
      return this.getMockDeals();
    }
  }

  /**
   * Get deals in a date range
   */
  async getDealsInRange(startDate: Date, endDate: Date): Promise<Deal[]> {
    try {
      const response = await this.salesHub.get('/api/deals', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return this.enrichDeals(response.data.deals || []);
    } catch (error) {
      console.error('Error fetching deals in range:', error);
      return this.getMockDeals();
    }
  }

  /**
   * Get only active (open) deals
   */
  async getActiveDeals(): Promise<Deal[]> {
    try {
      const response = await this.salesHub.get('/api/deals', {
        params: { status: 'active' }
      });
      return this.enrichDeals(response.data.deals || []);
    } catch (error) {
      console.error('Error fetching active deals:', error);
      return this.getMockDeals().filter(d =>
        d.stage !== 'closed_won' && d.stage !== 'closed_lost'
      );
    }
  }

  // ==================== Revenue Operations ====================

  /**
   * Get historical revenue data
   */
  async getHistoricalRevenue(
    startDate: Date,
    endDate: Date,
    territoryIds?: string[]
  ): Promise<ForecastDataPoint[]> {
    try {
      const response = await this.salesHub.get('/api/revenue/history', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          territories: territoryIds?.join(',')
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching historical revenue:', error);
      return this.getMockRevenueHistory(startDate, endDate);
    }
  }

  /**
   * Get forecast accuracy data
   */
  async getForecastAccuracy(): Promise<any[]> {
    try {
      const response = await this.salesHub.get('/api/forecasts/accuracy');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching forecast accuracy:', error);
      return this.getMockForecastAccuracy();
    }
  }

  // ==================== Rep Operations ====================

  /**
   * Get reps with their deals
   */
  async getRepsWithDeals(teamId?: string, repIds?: string[]): Promise<any[]> {
    try {
      const params: any = {};
      if (teamId) params.teamId = teamId;
      if (repIds) params.ids = repIds.join(',');

      const response = await this.salesHub.get('/api/reps', { params });
      return response.data.reps || [];
    } catch (error) {
      console.error('Error fetching reps:', error);
      return this.getMockReps();
    }
  }

  // ==================== Territory Operations ====================

  /**
   * Get territories with their deals
   */
  async getTerritories(territoryIds?: string[]): Promise<any[]> {
    try {
      const params: any = {};
      if (territoryIds) params.ids = territoryIds.join(',');

      const response = await this.salesHub.get('/api/territories', { params });
      return response.data.territories || [];
    } catch (error) {
      console.error('Error fetching territories:', error);
      return this.getMockTerritories();
    }
  }

  // ==================== Historical Stage Breakdown ====================

  /**
   * Get historical stage breakdown for comparison
   */
  async getHistoricalStageBreakdown(): Promise<any[]> {
    try {
      const response = await this.salesHub.get('/api/pipeline/history');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching historical stage breakdown:', error);
      return [];
    }
  }

  // ==================== Event Publishing ====================

  /**
   * Publish forecast generated event
   */
  async publishForecastGenerated(forecast: any): Promise<void> {
    try {
      await this.eventBus.post('/events', {
        type: 'forecast.generated',
        source: 'sales-intelligence',
        timestamp: new Date().toISOString(),
        payload: {
          forecastId: forecast.id,
          period: forecast.period,
          predictedRevenue: forecast.predictedRevenue,
          confidence: forecast.confidence
        }
      });
    } catch (error) {
      console.error('Error publishing forecast event:', error);
    }
  }

  /**
   * Publish anomaly detected event
   */
  async publishAnomalyDetected(anomaly: any): Promise<void> {
    try {
      await this.eventBus.post('/events', {
        type: 'anomaly.detected',
        source: 'sales-intelligence',
        timestamp: new Date().toISOString(),
        payload: {
          anomalyId: anomaly.id,
          metric: anomaly.metric,
          severity: anomaly.severity,
          deviation: anomaly.deviation
        }
      });
    } catch (error) {
      console.error('Error publishing anomaly event:', error);
    }
  }

  // ==================== Memory Operations ====================

  /**
   * Store insight in memory
   */
  async storeInsight(insight: any): Promise<void> {
    try {
      await this.memoryOS.post('/memories', {
        type: 'sales_insight',
        data: insight,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing insight in memory:', error);
    }
  }

  /**
   * Retrieve relevant memories
   */
  async getRelevantMemories(context: string): Promise<any[]> {
    try {
      const response = await this.memoryOS.get('/memories/search', {
        params: { query: context, type: 'sales_insight' }
      });
      return response.data.memories || [];
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  // ==================== Service Discovery ====================

  /**
   * Discover available services
   */
  async discoverServices(): Promise<any[]> {
    try {
      const response = await this.ecosystemConnector.get('/api/services');
      return response.data.services || [];
    } catch (error) {
      console.error('Error discovering services:', error);
      return [];
    }
  }

  // ==================== Mock Data for Development ====================

  private enrichDeals(deals: Deal[]): Deal[] {
    return deals.map(deal => ({
      ...deal,
      daysInStage: this.calculateDaysInStage(deal),
      daysSinceLastActivity: this.calculateDaysSinceActivity(deal)
    }));
  }

  private calculateDaysInStage(deal: Deal): number {
    const daysSinceUpdate = Math.ceil(
      (Date.now() - new Date(deal.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    return daysSinceUpdate;
  }

  private calculateDaysSinceActivity(deal: Deal): number {
    return this.calculateDaysInStage(deal);
  }

  private getMockDeals(): Deal[] {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
    const deals: Deal[] = [];

    for (let i = 1; i <= 50; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

      deals.push({
        id: `DEAL-${String(i).padStart(4, '0')}`,
        name: `Deal ${i} - ${['Enterprise', 'Mid-Market', 'SMB'][Math.floor(Math.random() * 3)]}`,
        value: 10000 + Math.floor(Math.random() * 190000),
        stage,
        probability: stage === 'prospecting' ? 0.1 :
                      stage === 'qualification' ? 0.25 :
                      stage === 'proposal' ? 0.5 :
                      stage === 'negotiation' ? 0.75 : 1,
        expectedCloseDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000),
        createdAt,
        updatedAt,
        ownerId: `REP-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
        territoryId: `TERR-${['EAST', 'WEST', 'CENTRAL', 'NORTH', 'SOUTH'][Math.floor(Math.random() * 5)]}`,
        accountId: `ACC-${String(i).padStart(4, '0')}`,
        accountName: `Account ${i}`,
        contactId: `CONT-${String(i).padStart(4, '0')}`,
        productLines: ['Product A', 'Product B'].slice(0, Math.floor(Math.random() * 2) + 1),
        tags: ['enterprise', 'new', 'expansion'].slice(0, Math.floor(Math.random() * 2) + 1)
      });
    }

    return deals;
  }

  private getMockRevenueHistory(startDate: Date, endDate: Date): ForecastDataPoint[] {
    const data: ForecastDataPoint[] = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const periods = Math.min(daysDiff, 90);

    for (let i = 0; i < periods; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const baseRevenue = 10000 + Math.sin(i / 7) * 2000;
      const randomVariation = (Math.random() - 0.5) * 5000;

      data.push({
        date,
        actualRevenue: Math.max(0, baseRevenue + randomVariation)
      });
    }

    return data;
  }

  private getMockForecastAccuracy(): any[] {
    const periods = [];
    const now = new Date();

    for (let i = 4; i > 0; i--) {
      const quarter = Math.ceil((now.getMonth() + 1) / 3);
      const year = i > 2 ? now.getFullYear() : now.getFullYear() - 1;
      const q = i > 2 ? quarter : 4 - Math.floor(i / 2);

      const forecasted = 400000 + Math.random() * 100000;
      const actual = forecasted * (0.9 + Math.random() * 0.3);

      periods.push({
        period: `Q${q}-${year}`,
        forecasted: Math.round(forecasted),
        actual: Math.round(actual)
      });
    }

    return periods;
  }

  private getMockReps(): any[] {
    const reps = [];

    for (let i = 1; i <= 10; i++) {
      reps.push({
        id: `REP-${String(i).padStart(3, '0')}`,
        name: ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Kevin', 'Lisa'][i - 1] + ' Smith',
        teamId: `TEAM-${['Enterprise', 'Mid-Market', 'SMB'][i % 3]}`,
        quota: 250000 + Math.floor(Math.random() * 500000),
        tenureDays: 90 + Math.floor(Math.random() * 1000),
        deals: this.getMockDeals().slice(0, 5)
      });
    }

    return reps;
  }

  private getMockTerritories(): any[] {
    const territories = ['EAST', 'WEST', 'CENTRAL', 'NORTH', 'SOUTH'];

    return territories.map((name, i) => ({
      id: `TERR-${name}`,
      name: `${name} Region`,
      topReps: [`REP-00${i + 1}`, `REP-00${i + 2}`],
      deals: this.getMockDeals().filter(d => d.territoryId === `TERR-${name}`)
    }));
  }
}
