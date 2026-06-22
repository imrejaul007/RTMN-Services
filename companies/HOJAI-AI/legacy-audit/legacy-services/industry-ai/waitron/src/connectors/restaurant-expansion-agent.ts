/**
 * Waitron → Restaurant Expansion Agent
 *
 * Autonomous agent that coordinates restaurant expansion
 * Uses SUTAR Goal OS, RisnaEstate, CorpPerks, and Nexha
 *
 * Flow: Owner asks → SUTAR Goal → Sub-agents → Locations + Staff + Suppliers + Contracts
 *
 * @module waitron-expansion-agent
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

export interface ExpansionGoal {
  id: string;
  merchantId: string;
  targetLocations: number;
  timeline: string;
  budget?: {
    perLocation: number;
    total: number;
  };
  status: 'planning' | 'location_search' | 'staffing' | 'suppliers' | 'licensing' | 'launch' | 'completed';
  progress: number;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  locality: string;
  city: string;
  area: string;
  rent: number;
  size: number; // sq ft
  footfall: number;
  demographics: {
    workingProfessionals: number;
    families: number;
    students: number;
  };
  competition: {
    nearbyRestaurants: number;
    avgRating: number;
  };
  score: number;
  pros: string[];
  cons: string[];
  images?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface StaffRequirement {
  role: string;
  count: number;
  salary: {
    min: number;
    max: number;
  };
  skills: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface SupplierSetup {
  category: string;
  required: boolean;
  suppliers: Array<{
    name: string;
    rating: number;
    deliveryDays: number;
    minOrderValue: number;
    priceRange: string;
  }>;
  contractStatus: 'pending' | 'negotiating' | 'signed';
}

export interface ExpansionPhase {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  tasks: Array<{
    id: string;
    description: string;
    assignedTo: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate?: string;
  }>;
  blockers?: string[];
  estimatedCompletion?: string;
}

export interface ExpansionPlan {
  goal: ExpansionGoal;
  phases: ExpansionPhase[];
  locations: Location[];
  staffRequirements: StaffRequirement[];
  supplierSetup: SupplierSetup[];
  estimatedInvestment: number;
  estimatedRevenue: number;
  roi: string;
  timeline: {
    startDate: string;
    endDate: string;
    milestones: Array<{
      name: string;
      date: string;
      type: 'location_signed' | 'staff_hired' | 'suppliers_onboarded' | 'license_obtained' | 'soft_launch' | 'grand_launch';
    }>;
  };
}

export class RestaurantExpansionAgent {
  private sutarClient: AxiosInstance;
  private risnaClient: AxiosInstance;
  private corpperksClient: AxiosInstance;
  private nexhaClient: AxiosInstance;

  // Service URLs
  private sutarUrl: string;
  private risnaUrl: string;
  private corpperksUrl: string;
  private nexhaUrl: string;

  // Active expansions
  private activeExpansions: Map<string, ExpansionPlan> = new Map();

  constructor(config?: {
    sutarUrl?: string;
    risnaUrl?: string;
    corpperksUrl?: string;
    nexhaUrl?: string;
    logger?: winston.Logger;
  }) {
    this.sutarUrl = config?.sutarUrl || process.env.SUTAR_GOAL_URL || 'http://localhost:4150';
    this.risnaUrl = config?.risnaUrl || process.env.RISNA_URL || 'http://localhost:4300';
    this.corpperksUrl = config?.corpperksUrl || process.env.CORPPERKS_URL || 'http://localhost:4006';
    this.nexhaUrl = config?.nexhaUrl || process.env.NEXHA_URL || 'http://localhost:4399';

    this.sutarClient = axios.create({
      baseURL: this.sutarUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.risnaClient = axios.create({
      baseURL: this.risnaUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.corpperksClient = axios.create({
      baseURL: this.corpperksUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.nexhaClient = axios.create({
      baseURL: this.nexhaUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('RestaurantExpansionAgent initialized', {
      sutarUrl: this.sutarUrl,
      risnaUrl: this.risnaUrl
    });
  }

  /**
   * Create expansion goal and start planning
   * Main entry point for the 8:00 PM flow in the story
   */
  async createExpansionPlan(params: {
    merchantId: string;
    merchantName: string;
    targetLocations: number;
    timeline: string;
    preferredCities?: string[];
    preferredAreas?: string[];
    budgetPerLocation?: number;
  }): Promise<ExpansionPlan> {
    try {
      logger.info('Creating expansion plan', {
        merchantId: params.merchantId,
        targetLocations: params.targetLocations,
        timeline: params.timeline
      });

      // Step 1: Create goal in SUTAR
      const goal = await this.createSutarGoal(params);

      // Step 2: Initialize expansion plan
      const plan: ExpansionPlan = {
        goal,
        phases: this.initializePhases(params.targetLocations),
        locations: [],
        staffRequirements: [],
        supplierSetup: [],
        estimatedInvestment: (params.budgetPerLocation || 5000000) * params.targetLocations,
        estimatedRevenue: 1000000 * params.targetLocations,
        roi: '24 months',
        timeline: {
          startDate: new Date().toISOString(),
          endDate: this.calculateEndDate(params.timeline),
          milestones: []
        }
      };

      // Step 3: Search for locations in parallel
      const [locations, staff, suppliers] = await Promise.allSettled([
        this.searchLocations({
          cities: params.preferredCities || ['Bangalore'],
          areas: params.preferredAreas,
          targetCount: params.targetLocations * 2 // Get 2x for selection
        }),
        this.getStaffRequirements(params.targetLocations),
        this.getSupplierSetup(params.targetLocations)
      ]);

      if (locations.status === 'fulfilled') {
        plan.locations = locations.value;
      }

      if (staff.status === 'fulfilled') {
        plan.staffRequirements = staff.value;
      }

      if (suppliers.status === 'fulfilled') {
        plan.supplierSetup = suppliers.value;
      }

      // Step 4: Update phases with actual data
      plan.phases = this.updatePhases(plan);

      // Store plan
      this.activeExpansions.set(goal.id, plan);

      logger.info('Expansion plan created', {
        goalId: goal.id,
        locationsFound: plan.locations.length,
        staffRoles: plan.staffRequirements.length
      });

      return plan;
    } catch (error: any) {
      logger.error('Expansion plan creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get expansion progress
   */
  async getExpansionProgress(goalId: string): Promise<{
    goal: ExpansionGoal;
    progress: number;
    currentPhase: string;
    completedTasks: number;
    totalTasks: number;
    blockers: string[];
  } | null> {
    const plan = this.activeExpansions.get(goalId);

    if (!plan) {
      return null;
    }

    const totalTasks = plan.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const completedTasks = plan.phases.reduce(
      (sum, p) => sum + p.tasks.filter(t => t.status === 'completed').length,
      0
    );

    const currentPhase = plan.phases.find(p => p.status === 'in_progress')?.name || 'Planning';
    const blockers = plan.phases.flatMap(p => p.blockers || []);

    return {
      goal: plan.goal,
      progress: plan.goal.progress,
      currentPhase,
      completedTasks,
      totalTasks,
      blockers
    };
  }

  /**
   * Execute next phase of expansion
   */
  async executeNextPhase(goalId: string): Promise<{
    success: boolean;
    phase: ExpansionPhase | null;
    message: string;
  }> {
    const plan = this.activeExpansions.get(goalId);

    if (!plan) {
      return { success: false, phase: null, message: 'Goal not found' };
    }

    // Find next pending phase
    const nextPhase = plan.phases.find(p => p.status === 'pending');

    if (!nextPhase) {
      return { success: false, phase: null, message: 'All phases completed' };
    }

    logger.info('Executing expansion phase', { goalId, phase: nextPhase.name });

    try {
      // Execute based on phase type
      switch (nextPhase.name) {
        case 'Location Search':
          await this.executeLocationSearch(plan, nextPhase);
          break;
        case 'Staff Recruitment':
          await this.executeStaffRecruitment(plan, nextPhase);
          break;
        case 'Supplier Setup':
          await this.executeSupplierSetup(plan, nextPhase);
          break;
        case 'Licensing':
          await this.executeLicensing(plan, nextPhase);
          break;
        case 'Launch':
          await this.executeLaunch(plan, nextPhase);
          break;
      }

      // Update phase status
      nextPhase.status = 'in_progress';

      // Execute tasks
      for (const task of nextPhase.tasks) {
        if (task.status === 'pending') {
          task.status = 'in_progress';
          // Simulate task completion
          task.status = 'completed';
        }
      }

      // Check if phase is complete
      if (nextPhase.tasks.every(t => t.status === 'completed')) {
        nextPhase.status = 'completed';
        nextPhase.progress = 100;
        plan.goal.progress = this.calculateOverallProgress(plan);
      }

      logger.info('Phase executed', { goalId, phase: nextPhase.name, status: nextPhase.status });

      return {
        success: true,
        phase: nextPhase,
        message: `Phase "${nextPhase.name}" executed successfully`
      };
    } catch (error: any) {
      logger.error('Phase execution failed', { error: error.message, phase: nextPhase.name });
      nextPhase.status = 'blocked';
      nextPhase.blockers = [error.message];

      return {
        success: false,
        phase: nextPhase,
        message: `Phase "${nextPhase.name}" blocked: ${error.message}`
      };
    }
  }

  // ============ Private Methods ============

  /**
   * Create goal in SUTAR
   */
  private async createSutarGoal(params: {
    merchantId: string;
    merchantName: string;
    targetLocations: number;
    timeline: string;
  }): Promise<ExpansionGoal> {
    try {
      const response = await this.sutarClient.post('/api/goals', {
        type: 'expansion',
        entity_type: 'restaurant_merchant',
        entity_id: params.merchantId,
        name: `Expand to ${params.targetLocations} new locations`,
        description: `Restaurant expansion plan for ${params.merchantName}`,
        target_metrics: {
          locations: params.targetLocations,
          timeline: params.timeline
        },
        sub_goals: [
          { name: 'Location Search', priority: 1 },
          { name: 'Staff Recruitment', priority: 2 },
          { name: 'Supplier Setup', priority: 3 },
          { name: 'Licensing', priority: 4 },
          { name: 'Launch', priority: 5 }
        ]
      });

      return {
        id: response.data.id || `EXP-${Date.now()}`,
        merchantId: params.merchantId,
        targetLocations: params.targetLocations,
        timeline: params.timeline,
        budget: {
          perLocation: 5000000,
          total: 5000000 * params.targetLocations
        },
        status: 'planning',
        progress: 0,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.warn('SUTAR goal creation failed, using local goal', { error: error.message });
      return {
        id: `EXP-${Date.now()}`,
        merchantId: params.merchantId,
        targetLocations: params.targetLocations,
        timeline: params.timeline,
        budget: {
          perLocation: 5000000,
          total: 5000000 * params.targetLocations
        },
        status: 'planning',
        progress: 0,
        createdAt: new Date().toISOString()
      };
    }
  }

  /**
   * Initialize expansion phases
   */
  private initializePhases(targetLocations: number): ExpansionPhase[] {
    const phases: ExpansionPhase[] = [
      {
        name: 'Location Search',
        status: 'pending',
        progress: 0,
        tasks: [
          { id: 'loc-1', description: 'Identify target areas', assignedTo: 'RisaAgent', status: 'pending' },
          { id: 'loc-2', description: 'Evaluate footfall potential', assignedTo: 'RisaAgent', status: 'pending' },
          { id: 'loc-3', description: 'Compare rental costs', assignedTo: 'RisaAgent', status: 'pending' },
          { id: 'loc-4', description: 'Negotiate lease terms', assignedTo: 'SutarAgent', status: 'pending' },
          { id: 'loc-5', description: 'Sign location agreements', assignedTo: 'ContractAgent', status: 'pending' }
        ]
      },
      {
        name: 'Staff Recruitment',
        status: 'pending',
        progress: 0,
        tasks: [
          { id: 'staff-1', description: 'Define staffing requirements', assignedTo: 'CorpPerksAgent', status: 'pending' },
          { id: 'staff-2', description: 'Post job listings', assignedTo: 'CorpPerksAgent', status: 'pending' },
          { id: 'staff-3', description: 'Screen candidates', assignedTo: 'CorpPerksAgent', status: 'pending' },
          { id: 'staff-4', description: 'Conduct interviews', assignedTo: 'HRManager', status: 'pending' },
          { id: 'staff-5', description: 'Onboard new staff', assignedTo: 'CorpPerksAgent', status: 'pending' }
        ]
      },
      {
        name: 'Supplier Setup',
        status: 'pending',
        progress: 0,
        tasks: [
          { id: 'sup-1', description: 'Identify supplier categories', assignedTo: 'NexhaAgent', status: 'pending' },
          { id: 'sup-2', description: 'Request supplier quotes', assignedTo: 'NexhaAgent', status: 'pending' },
          { id: 'sup-3', description: 'Negotiate terms', assignedTo: 'SutarAgent', status: 'pending' },
          { id: 'sup-4', description: 'Sign supplier contracts', assignedTo: 'ContractAgent', status: 'pending' }
        ]
      },
      {
        name: 'Licensing',
        status: 'pending',
        progress: 0,
        tasks: [
          { id: 'lic-1', description: 'Apply for FSSAI license', assignedTo: 'LegalAgent', status: 'pending' },
          { id: 'lic-2', description: 'Get municipal permits', assignedTo: 'LegalAgent', status: 'pending' },
          { id: 'lic-3', description: 'Obtain fire safety certificate', assignedTo: 'LegalAgent', status: 'pending' },
          { id: 'lic-4', description: 'Complete insurance', assignedTo: 'LegalAgent', status: 'pending' }
        ]
      },
      {
        name: 'Launch',
        status: 'pending',
        progress: 0,
        tasks: [
          { id: 'launch-1', description: 'Staff training', assignedTo: 'CorpPerksAgent', status: 'pending' },
          { id: 'launch-2', description: 'Equipment installation', assignedTo: 'OpsAgent', status: 'pending' },
          { id: 'launch-3', description: 'Inventory setup', assignedTo: 'OpsAgent', status: 'pending' },
          { id: 'launch-4', description: 'Soft launch', assignedTo: 'MarketingAgent', status: 'pending' },
          { id: 'launch-5', description: 'Grand opening', assignedTo: 'MarketingAgent', status: 'pending' }
        ]
      }
    ];

    return phases;
  }

  /**
   * Search for locations via RisnaEstate
   */
  private async searchLocations(params: {
    cities: string[];
    areas?: string[];
    targetCount: number;
  }): Promise<Location[]> {
    try {
      logger.info('Searching locations via RisnaEstate', params);

      // Try RisnaEstate API
      const response = await this.risnaClient.get('/api/properties', {
        params: {
          type: 'commercial',
          city: params.cities.join(','),
          area: params.areas?.join(','),
          limit: params.targetCount
        }
      });

      if (response.data?.properties) {
        return response.data.properties.map((p: any) => this.parseLocation(p));
      }

      return [];
    } catch (error: any) {
      logger.warn('RisnaEstate search failed, using mock locations', { error: error.message });
      return this.generateMockLocations(params.targetCount);
    }
  }

  /**
   * Parse location from RisnaEstate response
   */
  private parseLocation(property: any): Location {
    return {
      id: property.id,
      name: property.name || property.locality,
      address: property.address,
      locality: property.locality || property.area,
      city: property.city,
      area: property.area || property.locality,
      rent: property.rent || property.price || 100000,
      size: property.size || property.area_sqft || 1500,
      footfall: property.footfall || property.daily_visitors || 500,
      demographics: property.demographics || {
        workingProfessionals: 60,
        families: 25,
        students: 15
      },
      competition: property.competition || {
        nearbyRestaurants: 5,
        avgRating: 3.8
      },
      score: property.score || 75,
      pros: property.pros || ['Good location', 'High footfall'],
      cons: property.cons || ['Expensive rent'],
      coordinates: property.coordinates
    };
  }

  /**
   * Generate mock locations for demo
   */
  private generateMockLocations(count: number): Location[] {
    const areas = [
      { locality: 'Whitefield', city: 'Bangalore', rent: 150000, footfall: 800 },
      { locality: 'Electronic City', city: 'Bangalore', rent: 120000, footfall: 600 },
      { locality: 'Sarjapur', city: 'Bangalore', rent: 100000, footfall: 500 },
      { locality: 'Hebbal', city: 'Bangalore', rent: 130000, footfall: 700 },
      { locality: 'Marathahalli', city: 'Bangalore', rent: 140000, footfall: 750 },
      { locality: 'HSR Layout', city: 'Bangalore', rent: 110000, footfall: 650 }
    ];

    return areas.slice(0, count).map((area, i) => ({
      id: `LOC-${i + 1}`,
      name: `${area.locality} Outlet`,
      address: `Commercial Space, ${area.locality}`,
      locality: area.locality,
      city: area.city,
      area: area.locality,
      rent: area.rent,
      size: 1500,
      footfall: area.footfall,
      demographics: {
        workingProfessionals: 55,
        families: 30,
        students: 15
      },
      competition: {
        nearbyRestaurants: 4 + Math.floor(Math.random() * 4),
        avgRating: 3.5 + Math.random()
      },
      score: 70 + Math.random() * 20,
      pros: ['High footfall area', 'Near tech parks', 'Good visibility'],
      cons: ['Premium rent']
    }));
  }

  /**
   * Get staff requirements
   */
  private async getStaffRequirements(locationCount: number): Promise<StaffRequirement[]> {
    // Base requirements per location
    const perLocation: StaffRequirement[] = [
      { role: 'Restaurant Manager', count: 1, salary: { min: 40000, max: 60000 }, skills: ['Leadership', 'Operations', 'Inventory'], priority: 'high' },
      { role: 'Head Chef', count: 1, salary: { min: 35000, max: 50000 }, skills: ['Cooking', 'Menu Planning', 'Hygiene'], priority: 'high' },
      { role: 'Sous Chef', count: 2, salary: { min: 25000, max: 35000 }, skills: ['Cooking', 'Prep Work'], priority: 'high' },
      { role: 'Waiter', count: 4, salary: { min: 15000, max: 20000 }, skills: ['Service', 'Customer Relations'], priority: 'medium' },
      { role: 'Cashier', count: 2, salary: { min: 18000, max: 25000 }, skills: ['POS', 'Cash Handling'], priority: 'medium' },
      { role: 'Kitchen Helper', count: 3, salary: { min: 12000, max: 15000 }, skills: ['Prep Work', 'Cleaning'], priority: 'low' }
    ];

    // Multiply by location count
    return perLocation.map(req => ({
      ...req,
      count: req.count * locationCount
    }));
  }

  /**
   * Get supplier setup requirements
   */
  private async getSupplierSetup(locationCount: number): Promise<SupplierSetup[]> {
    return [
      {
        category: 'Vegetables & Groceries',
        required: true,
        suppliers: [
          { name: 'Metro Cash & Carry', rating: 4.2, deliveryDays: 1, minOrderValue: 10000, priceRange: '₹₹' },
          { name: 'FarmFresh Supplies', rating: 4.5, deliveryDays: 1, minOrderValue: 5000, priceRange: '₹₹' }
        ],
        contractStatus: 'pending'
      },
      {
        category: 'Meat & Poultry',
        required: true,
        suppliers: [
          { name: 'FreshMeat Hub', rating: 4.3, deliveryDays: 1, minOrderValue: 8000, priceRange: '₹₹₹' },
          { name: 'Premium Meats', rating: 4.6, deliveryDays: 1, minOrderValue: 12000, priceRange: '₹₹₹' }
        ],
        contractStatus: 'pending'
      },
      {
        category: 'Beverages',
        required: true,
        suppliers: [
          { name: 'Beverage Distributors', rating: 4.0, deliveryDays: 2, minOrderValue: 15000, priceRange: '₹₹' }
        ],
        contractStatus: 'pending'
      },
      {
        category: 'Packaging',
        required: true,
        suppliers: [
          { name: 'EcoPack Solutions', rating: 4.1, deliveryDays: 3, minOrderValue: 5000, priceRange: '₹' }
        ],
        contractStatus: 'pending'
      }
    ];
  }

  /**
   * Execute location search phase
   */
  private async executeLocationSearch(plan: ExpansionPlan, phase: ExpansionPhase): Promise<void> {
    phase.status = 'in_progress';
    plan.goal.status = 'location_search';

    // Add location tasks
    for (let i = 0; i < plan.locations.length && i < plan.goal.targetLocations; i++) {
      const location = plan.locations[i];
      phase.tasks.push({
        id: `loc-sign-${i}`,
        description: `Sign lease for ${location.name}`,
        assignedTo: 'ContractAgent',
        status: 'pending'
      });
    }

    logger.info('Location search phase started', { locations: plan.locations.length });
  }

  /**
   * Execute staff recruitment phase
   */
  private async executeStaffRecruitment(plan: ExpansionPlan, phase: ExpansionPhase): Promise<void> {
    phase.status = 'in_progress';
    plan.goal.status = 'staffing';

    // Try CorpPerks for recruitment
    try {
      await this.corpperksClient.post('/api/jobs/bulk', {
        merchantId: plan.goal.merchantId,
        locations: plan.goal.targetLocations,
        roles: plan.staffRequirements
      });
    } catch (e) {
      logger.warn('CorpPerks recruitment API not available');
    }

    logger.info('Staff recruitment phase started', { roles: plan.staffRequirements.length });
  }

  /**
   * Execute supplier setup phase
   */
  private async executeSupplierSetup(plan: ExpansionPlan, phase: ExpansionPhase): Promise<void> {
    phase.status = 'in_progress';
    plan.goal.status = 'suppliers';

    // Create RFQs via Nexha
    for (const setup of plan.supplierSetup) {
      try {
        await this.nexhaClient.post('/api/rfqs', {
          type: 'supplier_onboarding',
          merchantId: plan.goal.merchantId,
          items: setup.suppliers.map(s => ({
            category: setup.category,
            supplierName: s.name
          }))
        });
      } catch (e) {
        logger.warn('Nexha RFQ creation failed');
      }
    }

    logger.info('Supplier setup phase started', { categories: plan.supplierSetup.length });
  }

  /**
   * Execute licensing phase
   */
  private async executeLicensing(plan: ExpansionPlan, phase: ExpansionPhase): Promise<void> {
    phase.status = 'in_progress';
    plan.goal.status = 'licensing';

    // Add licensing tasks for each location
    phase.tasks.push({
      id: 'lic-fssai',
      description: 'FSSAI license application',
      assignedTo: 'LegalAgent',
      status: 'pending'
    });

    logger.info('Licensing phase started');
  }

  /**
   * Execute launch phase
   */
  private async executeLaunch(plan: ExpansionPlan, phase: ExpansionPhase): Promise<void> {
    phase.status = 'in_progress';
    plan.goal.status = 'launch';

    // Create launch timeline
    plan.timeline.milestones = [
      { name: 'Soft Launch', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'soft_launch' },
      { name: 'Grand Opening', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), type: 'grand_launch' }
    ];

    logger.info('Launch phase started');
  }

  /**
   * Update phases with actual plan data
   */
  private updatePhases(plan: ExpansionPlan): ExpansionPhase[] {
    const phases = this.initializePhases(plan.goal.targetLocations);

    // Add location count to first phase
    if (plan.locations.length > 0) {
      phases[0].tasks.push({
        id: 'loc-count',
        description: `${plan.locations.length} locations identified`,
        assignedTo: 'RisaAgent',
        status: 'completed'
      });
    }

    // Add staff count to second phase
    const totalStaff = plan.staffRequirements.reduce((sum, r) => sum + r.count, 0);
    phases[1].tasks.push({
      id: 'staff-count',
      description: `${totalStaff} staff needed for ${plan.goal.targetLocations} locations`,
      assignedTo: 'CorpPerksAgent',
      status: 'completed'
    });

    return phases;
  }

  /**
   * Calculate overall progress
   */
  private calculateOverallProgress(plan: ExpansionPlan): number {
    const completedPhases = plan.phases.filter(p => p.status === 'completed').length;
    return Math.round((completedPhases / plan.phases.length) * 100);
  }

  /**
   * Calculate end date from timeline
   */
  private calculateEndDate(timeline: string): string {
    const now = new Date();
    const months = parseInt(timeline) || 12;

    return new Date(now.setMonth(now.getMonth() + months)).toISOString();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; sutar: boolean; risna: boolean }> {
    const [sutarHealth, risnaHealth] = await Promise.all([
      this.sutarClient.get('/health').then(() => true).catch(() => false),
      this.risnaClient.get('/health').then(() => true).catch(() => false)
    ]);

    return {
      healthy: sutarHealth || risnaHealth,
      sutar: sutarHealth,
      risna: risnaHealth
    };
  }
}

// Export singleton instance
export const restaurantExpansionAgent = new RestaurantExpansionAgent();

export default RestaurantExpansionAgent;