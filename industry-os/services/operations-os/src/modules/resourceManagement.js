/**
 * Operations OS - Resource Management & Vendor Operations
 * People, AI agents, assets, infrastructure, and vendor management
 */

const { db } = require('../db/database');

class ResourceManagement {
  constructor() {
    this.db = db;
  }

  /**
   * Register a resource
   */
  registerResource(data) {
    const id = this.db.generateId('RES');

    const resource = {
      id,
      name: data.name,
      type: data.type || 'general', // human, ai_agent, equipment, facility, infrastructure, budget
      category: data.category || 'general',
      status: 'available', // available, busy, maintenance, unavailable
      capacity: data.capacity || 1,
      utilization: 0,
      skills: data.skills || [],
      owner: data.owner || null,
      department: data.department || null,
      location: data.location || null,
      metadata: data.metadata || {},
      cost: {
        hourly: data.cost?.hourly || 0,
        monthly: data.cost?.monthly || 0,
        currency: data.cost?.currency || 'USD',
      },
      availability: data.availability || {
        schedule: '9-5',
        timezone: 'UTC',
        holidays: [],
      },
      allocations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('resources', id, resource);
    return resource;
  }

  /**
   * Register AI agent
   */
  registerAIAgent(data) {
    const id = this.db.generateId('AIA');

    const agent = {
      id,
      name: data.name,
      type: 'ai_agent',
      category: data.category || 'automation', // automation, analysis, support, coordination
      provider: data.provider || 'internal', // openai, anthropic, internal
      model: data.model || 'gpt-4',
      capabilities: data.capabilities || [],
      skills: data.skills || [],
      status: 'active', // active, inactive, training, error
      cost: {
        perRequest: data.cost?.perRequest || 0,
        monthly: data.cost?.monthly || 0,
        currency: 'USD',
      },
      performance: {
        requests: 0,
        successRate: 100,
        avgLatency: 0,
        lastUsed: null,
      },
      owner: data.owner || null,
      department: data.department || null,
      usage: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('aiAgents', id, agent);
    return agent;
  }

  /**
   * Allocate resource
   */
  allocate(resourceId, allocationData) {
    const resource = this.db.get('resources', resourceId);
    if (!resource) return null;

    const allocation = {
      id: this.db.generateId('ALLOC'),
      resourceId,
      projectId: allocationData.projectId || null,
      taskId: allocationData.taskId || null,
      type: allocationData.type || 'project',
      startDate: allocationData.startDate,
      endDate: allocationData.endDate,
      allocation: allocationData.allocation || 100, // percentage
      status: 'active', // active, completed, cancelled
      createdAt: new Date().toISOString(),
    };

    resource.allocations.push(allocation);
    resource.utilization = this.calculateUtilization(resource);
    this.db.set('resources', resourceId, resource);

    return allocation;
  }

  /**
   * Calculate resource utilization
   */
  calculateUtilization(resource) {
    const activeAllocations = resource.allocations
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + a.allocation, 0);

    return Math.min(100, activeAllocations);
  }

  /**
   * Get resource capacity
   */
  getCapacity(resourceId, startDate, endDate) {
    const resource = this.db.get('resources', resourceId);
    if (!resource) return null;

    const allocations = resource.allocations.filter(a => {
      const allocStart = new Date(a.startDate);
      const allocEnd = new Date(a.endDate);
      return allocStart <= endDate && allocEnd >= startDate && a.status === 'active';
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocation, 0);

    return {
      resourceId,
      resourceName: resource.name,
      capacity: resource.capacity,
      allocated: totalAllocated,
      available: Math.max(0, resource.capacity - totalAllocated),
      utilization: Math.round((totalAllocated / resource.capacity) * 100),
      allocations: allocations.length,
    };
  }

  /**
   * Get available resources for a task
   */
  findAvailableResources(criteria) {
    const { skills, type, department, minAvailability } = criteria;
    let resources = this.db.getAll('resources');

    if (type) {
      resources = resources.filter(r => r.type === type);
    }

    if (department) {
      resources = resources.filter(r => r.department === department);
    }

    // Filter by skills
    if (skills && skills.length > 0) {
      resources = resources.filter(r => {
        const resourceSkills = r.skills || [];
        return skills.some(skill => resourceSkills.includes(skill));
      });
    }

    // Filter by availability
    if (minAvailability) {
      resources = resources.filter(r => {
        const available = 100 - r.utilization;
        return available >= minAvailability;
      });
    }

    // Calculate availability score
    return resources.map(r => ({
      ...r,
      availabilityScore: 100 - r.utilization,
      allocationCount: r.allocations?.filter(a => a.status === 'active').length || 0,
    })).sort((a, b) => b.availabilityScore - a.availabilityScore);
  }

  /**
   * Track AI agent usage
   */
  trackUsage(agentId, usageData) {
    const agent = this.db.get('aiAgents', agentId);
    if (!agent) return null;

    const usage = {
      id: this.db.generateId('USAGE'),
      agentId,
      timestamp: new Date().toISOString(),
      success: usageData.success || true,
      latency: usageData.latency || 0,
      cost: usageData.cost || agent.cost.perRequest,
      tokens: usageData.tokens || 0,
      metadata: usageData.metadata || {},
    };

    agent.usage.push(usage);
    agent.performance.requests++;
    agent.performance.lastUsed = usage.timestamp;

    if (usageData.latency) {
      agent.performance.avgLatency = (
        (agent.performance.avgLatency * (agent.performance.requests - 1) + usageData.latency) /
        agent.performance.requests
      );
    }

    if (!usageData.success) {
      agent.performance.successRate = (
        (agent.performance.successRate * (agent.performance.requests - 1)) /
        agent.performance.requests * 100
      );
    }

    this.db.set('aiAgents', agentId, agent);
    return usage;
  }

  /**
   * Get utilization report
   */
  getUtilizationReport(department = null) {
    let resources = this.db.getAll('resources');

    if (department) {
      resources = resources.filter(r => r.department === department);
    }

    const byType = {};
    const byDepartment = {};
    const overall = {
      total: resources.length,
      avgUtilization: 0,
      underUtilized: 0,
      overUtilized: 0,
    };

    let totalUtilization = 0;

    resources.forEach(r => {
      // By type
      if (!byType[r.type]) {
        byType[r.type] = { count: 0, utilization: 0 };
      }
      byType[r.type].count++;
      byType[r.type].utilization += r.utilization;

      // By department
      if (r.department) {
        if (!byDepartment[r.department]) {
          byDepartment[r.department] = { count: 0, utilization: 0 };
        }
        byDepartment[r.department].count++;
        byDepartment[r.department].utilization += r.utilization;
      }

      totalUtilization += r.utilization;

      if (r.utilization < 30) overall.underUtilized++;
      if (r.utilization > 90) overall.overUtilized++;
    });

    overall.avgUtilization = resources.length > 0
      ? Math.round(totalUtilization / resources.length)
      : 0;

    // Calculate averages
    Object.keys(byType).forEach(type => {
      byType[type].utilization = Math.round(byType[type].utilization / byType[type].count);
    });

    Object.keys(byDepartment).forEach(dept => {
      byDepartment[dept].utilization = Math.round(
        byDepartment[dept].utilization / byDepartment[dept].count
      );
    });

    return {
      overall,
      byType,
      byDepartment,
      underUtilizedResources: resources.filter(r => r.utilization < 30),
      overUtilizedResources: resources.filter(r => r.utilization > 90),
    };
  }
}

// Vendor Operations
class VendorOperations {
  constructor() {
    this.db = db;
  }

  /**
   * Register vendor
   */
  registerVendor(data) {
    const id = this.db.generateId('VND');

    const vendor = {
      id,
      name: data.name,
      type: data.type || 'service', // supplier, service_provider, software, consulting
      category: data.category || 'general',
      status: 'prospect', // prospect, active, inactive, terminated
      contact: {
        name: data.contact?.name,
        email: data.contact?.email,
        phone: data.contact?.phone,
      },
      address: data.address || {},
      contracts: [],
      slas: [],
      performance: {
        score: 0,
        quality: 0,
        delivery: 0,
        cost: 0,
        responsiveness: 0,
        incidents: 0,
      },
      kpis: [],
      documents: [],
      risks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('vendors', id, vendor);
    return vendor;
  }

  /**
   * Add contract
   */
  addContract(vendorId, contractData) {
    const vendor = this.db.get('vendors', vendorId);
    if (!vendor) return null;

    const contract = {
      id: this.db.generateId('CON'),
      vendorId,
      name: contractData.name,
      type: contractData.type || 'service', // service, license, subscription, one_time
      value: contractData.value || 0,
      currency: contractData.currency || 'USD',
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      status: 'active', // draft, pending, active, expired, terminated
      terms: contractData.terms || '',
      sla: contractData.sla || null,
      renewals: [],
      createdAt: new Date().toISOString(),
    };

    vendor.contracts.push(contract);
    this.db.set('vendors', vendorId, vendor);
    return contract;
  }

  /**
   * Add SLA
   */
  addSLA(vendorId, slaData) {
    const vendor = this.db.get('vendors', vendorId);
    if (!vendor) return null;

    const sla = {
      id: this.db.generateId('SLAV'),
      vendorId,
      name: slaData.name,
      type: slaData.type || 'response_time',
      metric: slaData.metric || '',
      target: slaData.target || 100,
      measurement: slaData.measurement || 'percentage',
      frequency: slaData.frequency || 'monthly',
      breaches: 0,
      lastChecked: null,
      status: 'active', // active, paused, inactive
      createdAt: new Date().toISOString(),
    };

    vendor.slas.push(sla);
    this.db.set('vendors', vendorId, vendor);
    return sla;
  }

  /**
   * Update performance score
   */
  updatePerformance(vendorId, performanceData) {
    const vendor = this.db.get('vendors', vendorId);
    if (!vendor) return null;

    if (performanceData.quality) vendor.performance.quality = performanceData.quality;
    if (performanceData.delivery) vendor.performance.delivery = performanceData.delivery;
    if (performanceData.cost) vendor.performance.cost = performanceData.cost;
    if (performanceData.responsiveness !== undefined) {
      vendor.performance.responsiveness = performanceData.responsiveness;
    }
    if (performanceData.incidents !== undefined) {
      vendor.performance.incidents = performanceData.incidents;
    }

    // Calculate overall score
    vendor.performance.score = Math.round(
      (vendor.performance.quality * 0.3 +
       vendor.performance.delivery * 0.25 +
       vendor.performance.cost * 0.2 +
       vendor.performance.responsiveness * 0.15 +
       (100 - vendor.performance.incidents) * 0.1)
    );

    vendor.updatedAt = new Date().toISOString();
    this.db.set('vendors', vendorId, vendor);
    return vendor;
  }

  /**
   * Check SLA compliance
   */
  checkSLACompliance(vendorId) {
    const vendor = this.db.get('vendors', vendorId);
    if (!vendor) return null;

    const slas = vendor.slas.filter(s => s.status === 'active');

    return {
      vendorId,
      vendorName: vendor.name,
      totalSLAs: slas.length,
      breached: slas.filter(s => s.breaches > 0).length,
      compliance: slas.length > 0
        ? Math.round(((slas.length - slas.filter(s => s.breaches > 0).length) / slas.length) * 100)
        : 100,
      slas: slas.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        target: s.target,
        breaches: s.breaches,
        status: s.breaches > 0 ? 'breached' : 'compliant',
      })),
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Get vendor health
   */
  getVendorHealth(vendorId) {
    const vendor = this.db.get('vendors', vendorId);
    if (!vendor) return null;

    const health = {
      overall: 'healthy', // healthy, at_risk, critical
      score: vendor.performance.score,
      contractStatus: this.getContractStatus(vendor),
      slaCompliance: this.checkSLACompliance(vendorId),
      riskLevel: 'low', // low, medium, high
      recommendations: [],
    };

    // Determine overall health
    if (health.score < 50 || health.contractStatus === 'expired') {
      health.overall = 'critical';
      health.riskLevel = 'high';
    } else if (health.score < 70 || health.slaCompliance?.breached > 0) {
      health.overall = 'at_risk';
      health.riskLevel = 'medium';
    }

    // Generate recommendations
    if (vendor.performance.delivery < 80) {
      health.recommendations.push('Delivery performance below target - schedule review meeting');
    }
    if (vendor.performance.incidents > 3) {
      health.recommendations.push('Multiple incidents reported - consider escalation');
    }

    return health;
  }

  /**
   * Get contract status
   */
  getContractStatus(vendor) {
    const activeContracts = vendor.contracts.filter(c => c.status === 'active');
    if (activeContracts.length === 0) return 'no_active';

    const expiringSoon = activeContracts.filter(c => {
      const daysToExpiry = (new Date(c.endDate) - Date.now()) / (1000 * 60 * 60 * 24);
      return daysToExpiry < 30;
    });

    if (expiringSoon.length > 0) return 'expiring';
    return 'active';
  }

  /**
   * Get vendor dashboard
   */
  getDashboard() {
    const vendors = this.db.getAll('vendors');

    const summary = {
      total: vendors.length,
      active: vendors.filter(v => v.status === 'active').length,
      inactive: vendors.filter(v => v.status === 'inactive').length,
      avgScore: 0,
      highPerformers: 0,
      atRisk: 0,
    };

    let totalScore = 0;
    vendors.filter(v => v.status === 'active').forEach(v => {
      totalScore += v.performance.score;
      if (v.performance.score >= 80) summary.highPerformers++;
      if (v.performance.score < 60) summary.atRisk++;
    });

    summary.avgScore = summary.active > 0
      ? Math.round(totalScore / summary.active)
      : 0;

    return {
      summary,
      topVendors: vendors
        .filter(v => v.status === 'active')
        .sort((a, b) => b.performance.score - a.performance.score)
        .slice(0, 5)
        .map(v => ({
          id: v.id,
          name: v.name,
          score: v.performance.score,
          contracts: v.contracts.filter(c => c.status === 'active').length,
        })),
      atRiskVendors: vendors
        .filter(v => v.status === 'active' && v.performance.score < 60),
      expiringContracts: vendors
        .flatMap(v => v.contracts.filter(c => {
          const daysToExpiry = (new Date(c.endDate) - Date.now()) / (1000 * 60 * 60 * 24);
          return c.status === 'active' && daysToExpiry < 30 && daysToExpiry > 0;
        }))
        .slice(0, 10),
    };
  }
}

// Express routes
function registerResourceRoutes(app) {
  const resources = new ResourceManagement();
  const vendors = new VendorOperations();

  // ============ RESOURCES ============

  // Register resource
  app.post('/api/resources', (req, res) => {
    const resource = resources.registerResource(req.body);
    res.status(201).json(resource);
  });

  // Get all resources
  app.get('/api/resources', (req, res) => {
    const { type, department, status } = req.query;
    let all = db.getAll('resources');

    if (type) all = all.filter(r => r.type === type);
    if (department) all = all.filter(r => r.department === department);
    if (status) all = all.filter(r => r.status === status);

    res.json({ resources: all, total: all.length });
  });

  // Get resource
  app.get('/api/resources/:id', (req, res) => {
    const resource = db.get('resources', req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  });

  // Allocate resource
  app.post('/api/resources/:id/allocate', (req, res) => {
    const allocation = resources.allocate(req.params.id, req.body);
    if (!allocation) return res.status(404).json({ error: 'Resource not found' });
    res.status(201).json(allocation);
  });

  // Get capacity
  app.get('/api/resources/:id/capacity', (req, res) => {
    const { startDate, endDate } = req.query;
    const capacity = resources.getCapacity(req.params.id, new Date(startDate), new Date(endDate));
    if (!capacity) return res.status(404).json({ error: 'Resource not found' });
    res.json(capacity);
  });

  // Find available
  app.get('/api/resources/available', (req, res) => {
    const { skills, type, department, minAvailability } = req.query;
    const available = resources.findAvailableResources({
      skills: skills ? skills.split(',') : null,
      type,
      department,
      minAvailability: minAvailability ? parseInt(minAvailability) : null,
    });
    res.json({ resources: available, total: available.length });
  });

  // Utilization report
  app.get('/api/resources/utilization', (req, res) => {
    const { department } = req.query;
    const report = resources.getUtilizationReport(department);
    res.json(report);
  });

  // ============ AI AGENTS ============

  // Register AI agent
  app.post('/api/ai-agents', (req, res) => {
    const agent = resources.registerAIAgent(req.body);
    res.status(201).json(agent);
  });

  // Get AI agents
  app.get('/api/ai-agents', (req, res) => {
    const agents = db.getAll('aiAgents');
    res.json({ agents, total: agents.length });
  });

  // Track AI usage
  app.post('/api/ai-agents/:id/usage', (req, res) => {
    const usage = resources.trackUsage(req.params.id, req.body);
    if (!usage) return res.status(404).json({ error: 'Agent not found' });
    res.status(201).json(usage);
  });

  // ============ VENDORS ============

  // Register vendor
  app.post('/api/vendors', (req, res) => {
    const vendor = vendors.registerVendor(req.body);
    res.status(201).json(vendor);
  });

  // Get vendors
  app.get('/api/vendors', (req, res) => {
    const { status, type } = req.query;
    let all = db.getAll('vendors');

    if (status) all = all.filter(v => v.status === status);
    if (type) all = all.filter(v => v.type === type);

    res.json({ vendors: all, total: all.length });
  });

  // Get vendor
  app.get('/api/vendors/:id', (req, res) => {
    const vendor = db.get('vendors', req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  });

  // Add contract
  app.post('/api/vendors/:id/contracts', (req, res) => {
    const contract = vendors.addContract(req.params.id, req.body);
    if (!contract) return res.status(404).json({ error: 'Vendor not found' });
    res.status(201).json(contract);
  });

  // Add SLA
  app.post('/api/vendors/:id/slas', (req, res) => {
    const sla = vendors.addSLA(req.params.id, req.body);
    if (!sla) return res.status(404).json({ error: 'Vendor not found' });
    res.status(201).json(sla);
  });

  // Update performance
  app.patch('/api/vendors/:id/performance', (req, res) => {
    const vendor = vendors.updatePerformance(req.params.id, req.body);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  });

  // Get SLA compliance
  app.get('/api/vendors/:id/sla-compliance', (req, res) => {
    const compliance = vendors.checkSLACompliance(req.params.id);
    if (!compliance) return res.status(404).json({ error: 'Vendor not found' });
    res.json(compliance);
  });

  // Get vendor health
  app.get('/api/vendors/:id/health', (req, res) => {
    const health = vendors.getVendorHealth(req.params.id);
    if (!health) return res.status(404).json({ error: 'Vendor not found' });
    res.json(health);
  });

  // Get vendor dashboard
  app.get('/api/vendors/dashboard', (req, res) => {
    const dashboard = vendors.getDashboard();
    res.json(dashboard);
  });
}

module.exports = { ResourceManagement, VendorOperations, registerResourceRoutes };
