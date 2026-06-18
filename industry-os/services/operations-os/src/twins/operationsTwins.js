/**
 * Operations OS - Digital Twins
 * Every operational object has a twin
 */

class OperationsDigitalTwins {
  constructor(db) {
    this.db = db;
    this.twins = new Map();
    this.initializeTwins();
  }

  initializeTwins() {
    // Initialize all twins with data
    this.updateAllTwins();
  }

  updateAllTwins() {
    this.updateProcessTwin();
    this.updateProjectTwin();
    this.updateTaskTwin();
    this.updateResourceTwin();
    this.updateIncidentTwin();
    this.updateRiskTwin();
    this.updateDeliveryTwin();
    this.updateTeamTwin();
    this.updateDepartmentTwin();
    this.updateOperationsTwin();
  }

  // ============ PROCESS TWIN ============
  updateProcessTwin() {
    const processes = Array.from(this.db.processes?.values() || []);
    const twin = {
      id: 'TWIN-PROCESS',
      name: 'Process Digital Twin',
      type: 'process',
      lastUpdated: new Date().toISOString(),
      data: {
        totalProcesses: processes.length,
        active: processes.filter(p => p.status === 'active').length,
        byCategory: this.groupBy(processes, 'category'),
        avgSteps: processes.length > 0 ? processes.reduce((s, p) => s + (p.steps?.length || 0), 0) / processes.length : 0,
        mostUsed: this.getMostUsed(processes),
      },
      health: {
        score: 95,
        status: 'healthy',
      },
      sync: {
        source: 'Process OS',
        timestamp: new Date().toISOString(),
      },
    };
    this.twins.set('TWIN-PROCESS', twin);
  }

  // ============ PROJECT TWIN ============
  updateProjectTwin() {
    const projects = Array.from(this.db.projects?.values() || []);
    const twin = {
      id: 'TWIN-PROJECT',
      name: 'Project Digital Twin',
      type: 'project',
      lastUpdated: new Date().toISOString(),
      data: {
        totalProjects: projects.length,
        active: projects.filter(p => p.status === 'in_progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        delayed: projects.filter(p => new Date(p.endDate) < new Date()).length,
        atRisk: projects.filter(p => p.progress < 30).length,
        totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
        totalSpent: projects.reduce((s, p) => s + (p.spent || 0), 0),
        avgProgress: projects.length > 0 ? projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length : 0,
      },
      health: {
        score: this.calculateProjectHealth(projects),
        status: this.getProjectStatus(projects),
      },
      sync: {
        source: 'Project OS',
        timestamp: new Date().toISOString(),
      },
    };
    this.twins.set('TWIN-PROJECT', twin);
  }

  // ============ TASK TWIN ============
  updateTaskTwin() {
    const tasks = Array.from(this.db.tasks?.values() || []);
    const twin = {
      id: 'TWIN-TASK',
      name: 'Task Digital Twin',
      type: 'task',
      lastUpdated: new Date().toISOString(),
      data: {
        totalTasks: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
        byPriority: {
          critical: tasks.filter(t => t.priority === 'critical').length,
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length,
        },
        totalHoursEstimated: tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0),
        totalHoursLogged: tasks.reduce((s, t) => s + (t.loggedHours || 0), 0),
      },
      health: {
        score: this.calculateTaskHealth(tasks),
        status: 'healthy',
      },
    };
    this.twins.set('TWIN-TASK', twin);
  }

  // ============ RESOURCE TWIN ============
  updateResourceTwin() {
    const resources = Array.from(this.db.resources?.values() || []);
    const twin = {
      id: 'TWIN-RESOURCE',
      name: 'Resource Digital Twin',
      type: 'resource',
      lastUpdated: new Date().toISOString(),
      data: {
        totalResources: resources.length,
        rooms: resources.filter(r => r.type === 'room').length,
        equipment: resources.filter(r => r.type === 'equipment').length,
        vehicles: resources.filter(r => r.type === 'vehicle').length,
        avgUtilization: resources.length > 0 ? resources.reduce((s, r) => s + (r.utilization || 0), 0) / resources.length : 0,
        overloaded: resources.filter(r => r.utilization > 90).length,
        available: resources.filter(r => r.utilization < 80).length,
      },
      capacity: this.calculateCapacity(resources),
    };
    this.twins.set('TWIN-RESOURCE', twin);
  }

  // ============ INCIDENT TWIN ============
  updateIncidentTwin() {
    const incidents = Array.from(this.db.incidents?.values() || []);
    const twin = {
      id: 'TWIN-INCIDENT',
      name: 'Incident Digital Twin',
      type: 'incident',
      lastUpdated: new Date().toISOString(),
      data: {
        totalIncidents: incidents.length,
        open: incidents.filter(i => i.status !== 'resolved').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
        bySeverity: {
          critical: incidents.filter(i => i.severity === 'critical').length,
          high: incidents.filter(i => i.severity === 'high').length,
          medium: incidents.filter(i => i.severity === 'medium').length,
          low: incidents.filter(i => i.severity === 'low').length,
        },
        avgResolutionTime: '2.5 hours',
      },
      alerts: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').map(i => ({
        type: 'critical',
        incident: i.title,
        action: 'Immediate response required',
      })),
    };
    this.twins.set('TWIN-INCIDENT', twin);
  }

  // ============ RISK TWIN ============
  updateRiskTwin() {
    const risks = Array.from(this.db.risks?.values() || []);
    const twin = {
      id: 'TWIN-RISK',
      name: 'Risk Digital Twin',
      type: 'risk',
      lastUpdated: new Date().toISOString(),
      data: {
        totalRisks: risks.length,
        identified: risks.filter(r => r.status === 'identified').length,
        active: risks.filter(r => r.status === 'active').length,
        mitigated: risks.filter(r => r.status === 'mitigated').length,
        byImpact: {
          critical: risks.filter(r => r.impact === 'critical').length,
          high: risks.filter(r => r.impact === 'high').length,
          medium: risks.filter(r => r.impact === 'medium').length,
          low: risks.filter(r => r.impact === 'low').length,
        },
        byCategory: this.groupBy(risks, 'category'),
      },
      riskScore: this.calculateRiskScore(risks),
    };
    this.twins.set('TWIN-RISK', twin);
  }

  // ============ DELIVERY TWIN ============
  updateDeliveryTwin() {
    const deliveries = Array.from(this.db.deliveries?.values() || []);
    const twin = {
      id: 'TWIN-DELIVERY',
      name: 'Delivery Digital Twin',
      type: 'delivery',
      lastUpdated: new Date().toISOString(),
      data: {
        totalDeliveries: deliveries.length,
        planning: deliveries.filter(d => d.status === 'planning').length,
        inProgress: deliveries.filter(d => d.status === 'in_progress').length,
        completed: deliveries.filter(d => d.status === 'completed').length,
        onHold: deliveries.filter(d => d.status === 'on_hold').length,
        avgProgress: deliveries.length > 0 ? deliveries.reduce((s, d) => s + (d.progress || 0), 0) / deliveries.length : 0,
      },
    };
    this.twins.set('TWIN-DELIVERY', twin);
  }

  // ============ TEAM TWIN ============
  updateTeamTwin() {
    const twin = {
      id: 'TWIN-TEAM',
      name: 'Team Digital Twin',
      type: 'team',
      lastUpdated: new Date().toISOString(),
      data: {
        totalMembers: this.db.employees?.size || 0,
        departments: 8,
        avgWorkload: 72,
        utilization: 78,
        productivity: 85,
      },
    };
    this.twins.set('TWIN-TEAM', twin);
  }

  // ============ DEPARTMENT TWIN ============
  updateDepartmentTwin() {
    const departments = Array.from(this.db.departments?.values() || []);
    const twin = {
      id: 'TWIN-DEPARTMENT',
      name: 'Department Digital Twin',
      type: 'department',
      lastUpdated: new Date().toISOString(),
      data: {
        totalDepartments: departments.length,
        departments: departments.map(d => ({
          name: d.name,
          headcount: d.headcount || 0,
          projects: this.db.projects?.values ? this.getDeptProjects(d.name) : 0,
        })),
      },
    };
    this.twins.set('TWIN-DEPARTMENT', twin);
  }

  // ============ OPERATIONS TWIN ============
  updateOperationsTwin() {
    const twin = {
      id: 'TWIN-OPERATIONS',
      name: 'Operations Digital Twin (AI COO)',
      type: 'operations',
      lastUpdated: new Date().toISOString(),
      data: {
        processHealth: this.twins.get('TWIN-PROCESS')?.health?.score || 95,
        projectHealth: this.twins.get('TWIN-PROJECT')?.health?.score || 85,
        taskHealth: this.twins.get('TWIN-TASK')?.health?.score || 80,
        resourceCapacity: this.twins.get('TWIN-RESOURCE')?.capacity || 75,
        incidentRisk: this.twins.get('TWIN-INCIDENT')?.data?.open || 0,
        riskScore: this.twins.get('TWIN-RISK')?.riskScore || 25,
      },
      overallHealth: this.calculateOverallHealth(),
      recommendations: this.generateTwinRecommendations(),
    };
    this.twins.set('TWIN-OPERATIONS', twin);
  }

  // ============ HELPER METHODS ============

  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getMostUsed(processes) {
    const execCounts = {};
    this.db.sopExecutions?.forEach(exec => {
      execCounts[exec.processId] = (execCounts[exec.processId] || 0) + 1;
    });
    const sorted = Object.entries(execCounts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(([id]) => processes.find(p => p.id === id)?.name || id);
  }

  calculateProjectHealth(projects) {
    if (projects.length === 0) return 100;
    let score = 100;
    score -= projects.filter(p => new Date(p.endDate) < new Date()).length * 15;
    score -= projects.filter(p => p.progress < 30).length * 10;
    return Math.max(0, Math.min(100, score));
  }

  getProjectStatus(projects) {
    const delayed = projects.filter(p => new Date(p.endDate) < new Date()).length;
    const atRisk = projects.filter(p => p.progress < 30).length;
    if (delayed > 0 || atRisk > 2) return 'critical';
    if (delayed > 0 || atRisk > 0) return 'warning';
    return 'healthy';
  }

  calculateTaskHealth(tasks) {
    if (tasks.length === 0) return 100;
    let score = 100;
    score -= tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length * 5;
    score -= tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length * 10;
    return Math.max(0, Math.min(100, score));
  }

  calculateCapacity(resources) {
    const avg = resources.length > 0 ? resources.reduce((s, r) => s + (r.utilization || 0), 0) / resources.length : 0;
    return {
      avgUtilization: avg.toFixed(0),
      status: avg > 90 ? 'overloaded' : avg > 80 ? 'optimal' : 'available',
      needsAttention: avg > 90,
    };
  }

  calculateRiskScore(risks) {
    let score = 0;
    risks.forEach(r => {
      const impact = { critical: 4, high: 3, medium: 2, low: 1 }[r.impact] || 2;
      const prob = { high: 3, medium: 2, low: 1 }[r.probability] || 2;
      score += impact * prob;
    });
    return Math.min(100, score * 5);
  }

  calculateOverallHealth() {
    const twins = ['TWIN-PROCESS', 'TWIN-PROJECT', 'TWIN-TASK', 'TWIN-RESOURCE'];
    let total = 0;
    twins.forEach(id => {
      const twin = this.twins.get(id);
      if (twin?.health?.score) total += twin.health.score;
    });
    return (total / twins.length).toFixed(0);
  }

  generateTwinRecommendations() {
    const recs = [];
    const opsTwin = this.twins.get('TWIN-OPERATIONS');

    if (opsTwin?.data?.projectHealth < 80) recs.push('Review at-risk projects');
    if (opsTwin?.data?.incidentRisk > 0) recs.push('Address open critical incidents');
    if (opsTwin?.data?.riskScore > 40) recs.push('Review and mitigate high risks');
    if (opsTwin?.data?.resourceCapacity > 90) recs.push('Consider adding resources');
    if (recs.length === 0) recs.push('All twins healthy - maintain current practices');

    return recs;
  }

  // ============ PUBLIC METHODS ============

  getAllTwins() {
    this.updateAllTwins();
    return Array.from(this.twins.values());
  }

  getTwin(type) {
    const twinMap = {
      process: 'TWIN-PROCESS',
      project: 'TWIN-PROJECT',
      task: 'TWIN-TASK',
      resource: 'TWIN-RESOURCE',
      incident: 'TWIN-INCIDENT',
      risk: 'TWIN-RISK',
      delivery: 'TWIN-DELIVERY',
      team: 'TWIN-TEAM',
      department: 'TWIN-DEPARTMENT',
      operations: 'TWIN-OPERATIONS',
    };
    const twinId = twinMap[type];
    if (twinId) this.twins.get(twinId)?.lastUpdated = new Date().toISOString();
    return this.twins.get(twinId) || null;
  }

  getTwinHealth() {
    const twins = this.getAllTwins();
    return {
      totalTwins: twins.length,
      healthy: twins.filter(t => t.health?.score > 70).length,
      warning: twins.filter(t => t.health?.score >= 50 && t.health?.score <= 70).length,
      critical: twins.filter(t => t.health?.score < 50).length,
      avgHealth: twins.reduce((s, t) => s + (t.health?.score || 0), 0) / twins.length,
    };
  }
}

module.exports = OperationsDigitalTwins;
