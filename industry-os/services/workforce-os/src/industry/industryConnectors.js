/**
 * RTMN Industry OS Connectors
 *
 * Connects Workforce OS to all 24 Industry Operating Systems
 * for cross-industry employee management
 */

import axios from 'axios';

// Industry OS Configuration
const INDUSTRY_OS_CONFIG = {
  hospitality: { port: 5010, name: 'Restaurant OS', staffEndpoint: '/api/staff' },
  healthcare: { port: 5020, name: 'Healthcare OS', staffEndpoint: '/api/medical-staff' },
  hotel: { port: 5025, name: 'Hotel OS', staffEndpoint: '/api/hotel-staff' },
  retail: { port: 5030, name: 'Retail OS', staffEndpoint: '/api/retail-staff' },
  legal: { port: 5035, name: 'Legal OS', staffEndpoint: '/api/legal-staff' },
  education: { port: 5060, name: 'Education OS', staffEndpoint: '/api/faculty' },
  automotive: { port: 5080, name: 'Automotive OS', staffEndpoint: '/api/mechanics' },
  beauty: { port: 5090, name: 'Beauty OS', staffEndpoint: '/api/stylists' },
  fitness: { port: 5110, name: 'Fitness OS', staffEndpoint: '/api/trainers' },
  realestate: { port: 5230, name: 'RealEstate OS', staffEndpoint: '/api/agents' },
  sales: { port: 5055, name: 'Sales OS', staffEndpoint: '/api/sales-reps' },
  media: { port: 5600, name: 'Media OS', staffEndpoint: '/api/crew' },
  travel: { port: 5190, name: 'Travel OS', staffEndpoint: '/api/agents' },
  gaming: { port: 5120, name: 'Gaming OS', staffEndpoint: '/api/staff' },
  government: { port: 5130, name: 'Government OS', staffEndpoint: '/api/officials' },
  homeservices: { port: 5140, name: 'HomeServices OS', staffEndpoint: '/api/technicians' },
  manufacturing: { port: 5150, name: 'Manufacturing OS', staffEndpoint: '/api/workers' },
  nonprofit: { port: 5160, name: 'NonProfit OS', staffEndpoint: '/api/staff' },
  professional: { port: 5170, name: 'Professional OS', staffEndpoint: '/api/consultants' },
  sports: { port: 5180, name: 'Sports OS', staffEndpoint: '/api/athletes' },
  entertainment: { port: 5200, name: 'Entertainment OS', staffEndpoint: '/api/crew' },
  construction: { port: 5210, name: 'Construction OS', staffEndpoint: '/api/workers' },
  financial: { port: 5220, name: 'Financial OS', staffEndpoint: '/api/analysts' },
  transport: { port: 5240, name: 'Transport OS', staffEndpoint: '/api/drivers' },
};

// Base URL for local development
const getBaseUrl = (industry) => {
  const config = INDUSTRY_OS_CONFIG[industry];
  if (!config) return null;
  // In production, these would be separate services
  // For now, we simulate with local endpoints
  return process.env[`${industry.toUpperCase()}_OS_URL`] || `http://localhost:${config.port}`;
};

// Industry OS Client
class IndustryOSClient {
  constructor() {
    this.clients = {};
    this.connectedIndustries = new Set();

    // Initialize clients for each industry
    Object.entries(INDUSTRY_OS_CONFIG).forEach(([industry, config]) => {
      this.clients[industry] = axios.create({
        baseURL: getBaseUrl(industry),
        timeout: 5000,
      });
    });
  }

  // Check connection to all industries
  async healthCheckAll() {
    const results = {};

    await Promise.all(
      Object.entries(INDUSTRY_OS_CONFIG).map(async ([industry, config]) => {
        try {
          const { data } = await this.clients[industry].get('/health');
          results[industry] = { connected: true, status: data.status };
          this.connectedIndustries.add(industry);
        } catch (error) {
          results[industry] = { connected: false, error: error.message };
        }
      })
    );

    return results;
  }

  // Get connected industries
  getConnectedIndustries() {
    return Array.from(this.connectedIndustries);
  }

  // Sync employee to industry
  async syncEmployeeToIndustry(industry, employee) {
    const client = this.clients[industry];
    if (!client) return { error: 'Industry not found' };

    const staffData = {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.departmentId,
      position: employee.positionId,
      employmentType: employee.employmentType,
      status: employee.status,
      workLocation: employee.workLocation,
      joiningDate: employee.joiningDate,
      skills: employee.skills || [],
      certifications: employee.certifications || [],
      source: 'workforce-os',
      syncedAt: new Date().toISOString(),
    };

    try {
      const { data } = await client.post('/api/staff', staffData);
      return { success: true, data };
    } catch (error) {
      // Industry OS might not be running, store locally
      console.warn(`Failed to sync to ${industry}: ${error.message}`);
      return { success: false, error: error.message, local: true };
    }
  }

  // Remove employee from industry
  async removeEmployeeFromIndustry(industry, employeeId) {
    const client = this.clients[industry];
    if (!client) return { error: 'Industry not found' };

    try {
      await client.delete(`/api/staff/${employeeId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update employee in industry
  async updateEmployeeInIndustry(industry, employeeId, updates) {
    const client = this.clients[industry];
    if (!client) return { error: 'Industry not found' };

    try {
      const { data } = await client.patch(`/api/staff/${employeeId}`, updates);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get industry-specific data
  async getIndustryData(industry, endpoint) {
    const client = this.clients[industry];
    if (!client) return null;

    try {
      const { data } = await client.get(endpoint);
      return data;
    } catch (error) {
      return null;
    }
  }

  // Sync employee to multiple industries
  async syncEmployeeToAllIndustries(employee, industries) {
    const results = {};

    await Promise.all(
      industries.map(async (industry) => {
        results[industry] = await this.syncEmployeeToIndustry(industry, employee);
      })
    );

    return results;
  }

  // Remove employee from all industries
  async removeEmployeeFromAllIndustries(employeeId, industries) {
    const results = {};

    await Promise.all(
      industries.map(async (industry) => {
        results[industry] = await this.removeEmployeeFromIndustry(industry, employeeId);
      })
    );

    return results;
  }
}

export const industryOSClient = new IndustryOSClient();

// Industry Sync Service
class IndustrySyncService {
  constructor() {
    this.client = industryOSClient;
  }

  // Assign employee to industries
  async assignToIndustries(employee, industries) {
    const results = await this.client.syncEmployeeToAllIndustries(employee, industries);

    return {
      employeeId: employee.id,
      industries,
      results,
      assignedAt: new Date().toISOString(),
    };
  }

  // Remove from industries
  async removeFromIndustries(employeeId, industries) {
    const results = await this.client.removeEmployeeFromAllIndustries(employeeId, industries);

    return {
      employeeId,
      removedFrom: industries.filter(i => results[i]?.success),
      failed: industries.filter(i => !results[i]?.success),
    };
  }

  // Update across all industries
  async updateAcrossIndustries(employeeId, updates, industries) {
    const results = {};

    await Promise.all(
      industries.map(async (industry) => {
        results[industry] = await this.client.updateEmployeeInIndustry(industry, employeeId, updates);
      })
    );

    return results;
  }

  // Get skills transfer recommendations
  async getSkillsTransfer(employeeId, currentIndustry, targetIndustries) {
    // Map industry skills
    const industrySkills = {
      hospitality: ['food_preparation', 'customer_service', 'bartending', 'culinary_arts', 'hygiene'],
      hotel: ['front_desk', 'housekeeping', 'concierge', 'event_management', 'hospitality'],
      healthcare: ['patient_care', 'nursing', 'medical_coding', 'pharmacy', 'empathy'],
      retail: ['pos_operations', 'inventory_management', 'visual_merchandising', 'sales'],
      fitness: ['personal_training', 'group_fitness', 'nutrition', 'motivation'],
      beauty: ['hair_styling', 'skincare', 'makeup', 'client consultation'],
      automotive: ['diagnostics', 'repair', 'parts_knowledge', ' ASE_certification'],
      financial: ['financial_analysis', 'accounting', 'risk_management', 'regulatory_knowledge'],
    };

    const employeeSkills = await this.getEmployeeSkills(employeeId);
    const recommendations = [];

    for (const target of targetIndustries) {
      const targetSkills = industrySkills[target] || [];
      const transferable = employeeSkills.filter(s => targetSkills.includes(s));

      if (transferable.length > 0) {
        recommendations.push({
          industry: target,
          transferableSkills: transferable,
          missingSkills: targetSkills.filter(s => !employeeSkills.includes(s)),
          transferability: (transferable.length / targetSkills.length) * 100,
        });
      }
    }

    return recommendations.sort((a, b) => b.transferability - a.transferability);
  }

  // Get employee skills (simplified)
  async getEmployeeSkills(employeeId) {
    // Would normally fetch from employee record
    return [];
  }

  // Check compliance across industries
  async checkCompliance(employeeId, industries) {
    const compliance = {};

    for (const industry of industries) {
      try {
        const data = await this.client.getIndustryData(industry, `/api/compliance/${employeeId}`);
        compliance[industry] = data || { status: 'unknown' };
      } catch (error) {
        compliance[industry] = { status: 'not_synced' };
      }
    }

    return compliance;
  }
}

export const industrySyncService = new IndustrySyncService();

// Industry Registry
export function getIndustryConfig(industry) {
  return INDUSTRY_OS_CONFIG[industry] || null;
}

export function getAllIndustries() {
  return Object.entries(INDUSTRY_OS_CONFIG).map(([code, config]) => ({
    code,
    ...config,
  }));
}

export function getIndustryByPort(port) {
  return Object.entries(INDUSTRY_OS_CONFIG).find(([_, config]) => config.port === port)?.[0];
}

export default {
  industryOSClient,
  industrySyncService,
  getIndustryConfig,
  getAllIndustries,
  getIndustryByPort,
  INDUSTRY_OS_CONFIG,
};
