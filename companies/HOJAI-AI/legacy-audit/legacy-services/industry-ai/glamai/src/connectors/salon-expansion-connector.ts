/**
 * GlamAI → Salon Expansion Connector
 *
 * Autonomous agent for salon chain expansion
 * Uses SUTAR, RisnaEstate, CorpPerks, Nexha
 *
 * Flow: Owner asks → Expansion Agent → Locations + Staff + Suppliers
 *
 * @module glamai-expansion-connector
 * @version 1.0.0
 */

import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

export interface Location {
  id: string;
  name: string;
  address: string;
  locality: string;
  city: string;
  rent: number;
  size: number;
  footfall: number;
  score: number;
  pros: string[];
  cons: string[];
}

export interface StaffRequirement {
  role: string;
  count: number;
  salary: { min: number; max: number };
}

export interface ExpansionPlan {
  id: string;
  salonId: string;
  targetLocations: number;
  timeline: string;
  locations: Location[];
  staffRequirements: StaffRequirement[];
  estimatedInvestment: number;
  estimatedRevenue: number;
  roi: string;
  phases: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    tasks: string[];
  }>;
}

export class SalonExpansionConnector {
  private sutarUrl: string;
  private risnaUrl: string;
  private corpperksUrl: string;

  constructor(config?: { sutarUrl?: string; risnaUrl?: string; corpperksUrl?: string }) {
    this.sutarUrl = config?.sutarUrl || process.env.SUTAR_GOAL_URL || 'http://localhost:4150';
    this.risnaUrl = config?.risnaUrl || process.env.RISNA_URL || 'http://localhost:4300';
    this.corpperksUrl = config?.corpperksUrl || process.env.CORPPERKS_URL || 'http://localhost:4006';

    logger.info('SalonExpansionConnector initialized', { sutarUrl: this.sutarUrl, risnaUrl: this.risnaUrl });
  }

  /**
   * Create expansion plan
   */
  async createExpansionPlan(params: {
    salonId: string;
    salonName: string;
    targetLocations: number;
    timeline: string;
    preferredCities?: string[];
    budgetPerLocation?: number;
  }): Promise<ExpansionPlan> {
    try {
      logger.info('Creating expansion plan', { salonId: params.salonId, targets: params.targetLocations });

      // Search locations via RisnaEstate
      const locations = await this.searchLocations({
        cities: params.preferredCities || ['Bangalore', 'Mumbai', 'Delhi'],
        targetCount: params.targetLocations * 2
      });

      // Calculate staff requirements
      const staffRequirements = this.calculateStaffRequirements(params.targetLocations);

      // Estimate investment
      const budget = params.budgetPerLocation || 3000000; // ₹30L per salon
      const estimatedInvestment = budget * params.targetLocations;
      const estimatedRevenue = 500000 * params.targetLocations; // ₹5L/month per salon

      // Create plan
      const plan: ExpansionPlan = {
        id: `EXP-${Date.now()}`,
        salonId: params.salonId,
        targetLocations: params.targetLocations,
        timeline: params.timeline,
        locations: locations.slice(0, params.targetLocations),
        staffRequirements,
        estimatedInvestment,
        estimatedRevenue,
        roi: `${Math.round((estimatedRevenue * 12 / estimatedInvestment) * 100)}% annual`,
        phases: [
          { name: 'Location Search', status: 'pending', tasks: ['Identify locations', 'Evaluate footfall', 'Negotiate lease'] },
          { name: 'Staff Recruitment', status: 'pending', tasks: ['Define requirements', 'Post jobs', 'Interview', 'Train'] },
          { name: 'Equipment Setup', status: 'pending', tasks: ['Order equipment', 'Install', 'Stock products'] },
          { name: 'Licensing', status: 'pending', tasks: ['Apply for license', 'Get permits', 'Insurance'] },
          { name: 'Grand Opening', status: 'pending', tasks: ['Marketing', 'Soft launch', 'Full launch'] }
        ]
      };

      // Create SUTAR goal
      await this.createSutarGoal(params.salonId, plan);

      logger.info('Expansion plan created', { planId: plan.id, locations: plan.locations.length });

      return plan;
    } catch (error: any) {
      logger.error('Expansion plan failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Search for salon locations
   */
  private async searchLocations(params: {
    cities: string[];
    targetCount: number;
  }): Promise<Location[]> {
    try {
      const client = axios.create({ baseURL: this.risnaUrl, timeout: 15000 });
      const response = await client.get('/api/properties', {
        params: { type: 'commercial', city: params.cities.join(','), limit: params.targetCount }
      });

      if (response.data?.properties) {
        return response.data.properties.map((p: any) => ({
          id: p.id,
          name: p.name || p.locality,
          address: p.address,
          locality: p.locality,
          city: p.city,
          rent: p.rent || 100000,
          size: p.size || 1000,
          footfall: p.footfall || 500,
          score: p.score || 75,
          pros: p.pros || ['Good location'],
          cons: p.cons || []
        }));
      }

      return this.generateMockLocations(params.targetCount);
    } catch {
      return this.generateMockLocations(params.targetCount);
    }
  }

  private generateMockLocations(count: number): Location[] {
    const areas = [
      { locality: 'Whitefield', city: 'Bangalore', rent: 80000, footfall: 600 },
      { locality: 'Koramangala', city: 'Bangalore', rent: 90000, footfall: 700 },
      { locality: 'Indiranagar', city: 'Bangalore', rent: 75000, footfall: 550 },
      { locality: 'HSR Layout', city: 'Bangalore', rent: 65000, footfall: 500 },
      { locality: 'Jayanagar', city: 'Bangalore', rent: 70000, footfall: 580 }
    ];

    return areas.slice(0, count).map((a, i) => ({
      id: `LOC-${i + 1}`,
      name: `${a.locality} Salon`,
      address: `Commercial Space, ${a.locality}`,
      locality: a.locality,
      city: a.city,
      rent: a.rent,
      size: 800,
      footfall: a.footfall,
      score: 70 + Math.random() * 20,
      pros: ['High footfall', 'Premium locality', 'Good parking'],
      cons: ['Premium rent']
    }));
  }

  private calculateStaffRequirements(locationCount: number): StaffRequirement[] {
    return [
      { role: 'Salon Manager', count: locationCount, salary: { min: 35000, max: 50000 } },
      { role: 'Senior Stylist', count: locationCount * 2, salary: { min: 25000, max: 40000 } },
      { role: 'Junior Stylist', count: locationCount * 2, salary: { min: 15000, max: 25000 } },
      { role: 'Receptionist', count: locationCount, salary: { min: 15000, max: 20000 } },
      { role: 'Beauty Advisor', count: locationCount, salary: { min: 18000, max: 25000 } }
    ];
  }

  private async createSutarGoal(salonId: string, plan: ExpansionPlan): Promise<void> {
    try {
      const client = axios.create({ baseURL: this.sutarUrl, timeout: 10000 });
      await client.post('/api/goals', {
        type: 'expansion',
        entity_type: 'salon',
        entity_id: salonId,
        name: `Expand to ${plan.targetLocations} new locations`,
        target_metrics: { locations: plan.targetLocations }
      });
    } catch (e) {
      logger.warn('SUTAR goal creation failed');
    }
  }

  /**
   * Execute expansion phase
   */
  async executePhase(planId: string, phaseName: string): Promise<{ success: boolean; message: string }> {
    logger.info('Executing expansion phase', { planId, phase: phaseName });
    // Implementation would trigger actual phase execution
    return { success: true, message: `Phase "${phaseName}" executed` };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

export const salonExpansionConnector = new SalonExpansionConnector();
