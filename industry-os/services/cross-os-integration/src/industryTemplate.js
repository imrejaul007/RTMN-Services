/**
 * RTMN Industry OS - Universal Integration Template
 *
 * This template can be copied to ALL 24 Industry OS services
 * to enable sync with Workforce OS via Cross-OS Hub
 *
 * Usage:
 * 1. Copy this file to your industry OS
 * 2. Update the INDUSTRY_CONFIG at the top
 * 3. Import and call initIntegration() in your main app
 */

const axios = require('axios');

// ============================================================
// INDUSTRY CONFIGURATION - Update for each Industry OS
// ============================================================

const INDUSTRY_CONFIG = {
  hospitality: {
    industryCode: 'hospitality',
    industryName: 'Restaurant OS',
    requiredSkills: ['food_safety', 'hygiene', 'customer_service', 'culinary_arts'],
    complianceRequirements: ['food_safety_cert', 'hygiene_cert'],
    staffEndpoint: '/api/staff',
  },
  healthcare: {
    industryCode: 'healthcare',
    industryName: 'Healthcare OS',
    requiredSkills: ['patient_care', 'medical_coding', 'nursing', 'pharmacy'],
    complianceRequirements: ['hipaa_training', 'medical_license'],
    staffEndpoint: '/api/medical-staff',
  },
  hotel: {
    industryCode: 'hotel',
    industryName: 'Hotel OS',
    requiredSkills: ['front_desk', 'housekeeping', 'concierge', 'event_management'],
    complianceRequirements: ['tourism_cert', 'hospitality_training'],
    staffEndpoint: '/api/hotel-staff',
  },
  retail: {
    industryCode: 'retail',
    industryName: 'Retail OS',
    requiredSkills: ['pos_operations', 'inventory_management', 'visual_merchandising'],
    complianceRequirements: ['labor_laws', 'consumer_protection'],
    staffEndpoint: '/api/retail-staff',
  },
  // ... Add other industries
};

// ============================================================
// UNIVERSAL WORKFORCE INTEGRATION
// ============================================================

class UniversalWorkforceIntegration {
  constructor(config) {
    this.config = config;
    this.crossOS = axios.create({
      baseURL: process.env.CROSS_OS_URL || 'http://localhost:5085',
      timeout: 5000,
    });
    this.workforce = axios.create({
      baseURL: process.env.WORKFORCE_OS_URL || 'http://localhost:5065',
      timeout: 5000,
    });
    this.connected = false;
  }

  // Initialize connection
  async init() {
    try {
      // Test connection to Cross-OS Hub
      const response = await this.crossOS.get('/health');
      this.connected = true;
      console.log(`✅ ${this.config.industryName} connected to Cross-OS Hub`);
    } catch (error) {
      this.connected = false;
      console.warn(`⚠️ ${this.config.industryName} could not connect to Cross-OS Hub`);
    }
    return this.connected;
  }

  // ============================================================
  // STAFF SYNC
  // ============================================================

  // Sync staff to Workforce OS
  async syncStaff(staff) {
    if (!this.connected) {
      console.warn('Cross-OS Hub not connected, skipping sync');
      return { success: false, error: 'Not connected' };
    }

    try {
      // Assign to industry
      const response = await this.crossOS.post(
        `/api/employees/${staff.id}/assign`,
        {
          industries: [this.config.industryCode],
          role: staff.role || staff.title,
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Remove staff from Workforce OS
  async removeStaff(staffId) {
    if (!this.connected) return { success: false };

    try {
      await this.crossOS.delete(
        `/api/employees/${staffId}/assign/${this.config.industryCode}`
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update staff in Workforce OS
  async updateStaff(staffId, updates) {
    if (!this.connected) return { success: false };

    try {
      await this.crossOS.patch(
        `/api/employees/${staffId}/assign/${this.config.industryCode}`,
        updates
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  // SKILLS SYNC
  // ============================================================

  // Add skills for staff
  async addSkills(staffId, skills) {
    if (!this.connected) return { success: false };

    try {
      const response = await this.crossOS.post(
        `/api/employees/${staffId}/skills`,
        {
          industry: this.config.industryCode,
          skills,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get staff's skills in this industry
  async getSkills(staffId) {
    if (!this.connected) return { skills: [] };

    try {
      const response = await this.crossOS.get(`/api/employees/${staffId}/skills`);
      const industrySkills = response.data.skills?.[this.config.industryCode] || [];
      return { skills: industrySkills };
    } catch (error) {
      return { skills: [] };
    }
  }

  // ============================================================
  // TRAINING SYNC
  // ============================================================

  // Record training completion
  async recordTraining(staffId, training) {
    if (!this.connected) return { success: false };

    try {
      // Add skills from training
      if (training.skills) {
        await this.addSkills(staffId, training.skills);
      }

      // Record training
      const response = await this.crossOS.post(
        `/api/employees/${staffId}/training`,
        {
          industry: this.config.industryCode,
          training,
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get training requirements
  async getTrainingRequirements() {
    if (!this.connected) return { requirements: this.config.requiredSkills };

    try {
      const response = await this.crossOS.get(
        `/api/industries/${this.config.industryCode}/training-requirements`
      );
      return response.data;
    } catch (error) {
      return {
        requirements: this.config.requiredSkills.map(s => ({ skill: s, required: true }))
      };
    }
  }

  // ============================================================
  // COMPLIANCE SYNC
  // ============================================================

  // Update compliance status
  async updateCompliance(staffId, compliance) {
    if (!this.connected) return { success: false };

    try {
      const response = await this.crossOS.post(
        `/api/employees/${staffId}/compliance`,
        {
          industry: this.config.industryCode,
          compliance: {
            ...compliance,
            status: compliance.valid ? 'compliant' : 'non_compliant',
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get staff compliance status
  async getCompliance(staffId) {
    if (!this.connected) return { status: 'unknown' };

    try {
      const response = await this.crossOS.get(`/api/employees/${staffId}/compliance`);
      return response.data.compliance?.[this.config.industryCode] || { status: 'unknown' };
    } catch (error) {
      return { status: 'unknown' };
    }
  }

  // Get industry compliance dashboard
  async getComplianceDashboard() {
    if (!this.connected) return { complianceRate: 'N/A' };

    try {
      const response = await this.crossOS.get(
        `/api/industries/${this.config.industryCode}/compliance-dashboard`
      );
      return response.data;
    } catch (error) {
      return { complianceRate: 'N/A' };
    }
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  // Get workforce analytics
  async getWorkforceAnalytics() {
    if (!this.connected) return null;

    try {
      const response = await this.crossOS.get('/api/analytics/workforce');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Get talent pool for this industry
  async getTalentPool() {
    if (!this.connected) return [];

    try {
      const response = await this.crossOS.get('/api/analytics/talent-pool');
      return response.data.pool?.filter(t =>
        t.industries.includes(this.config.industryCode)
      ) || [];
    } catch (error) {
      return [];
    }
  }
}

// ============================================================
// EXPRESS MIDDLEWARE - Add to your Industry OS
// ============================================================

// Create integration middleware
function createIntegrationMiddleware(industryCode, dbGetter) {
  // Get config for this industry
  const config = INDUSTRY_CONFIG[industryCode] || INDUSTRY_CONFIG.hospitality;
  const integration = new UniversalWorkforceIntegration(config);

  return {
    // Initialize on app start
    init: async () => {
      await integration.init();
      return integration;
    },

    // Get integration instance
    getIntegration: () => integration,

    // Middleware to auto-sync staff
    autoSyncStaff: async (req, res, next) => {
      if (req.method === 'POST' && req.path.includes('/staff')) {
        const staff = req.body;
        await integration.syncStaff(staff);
      }
      if (req.method === 'DELETE' && req.path.includes('/staff')) {
        const staffId = req.params.id;
        await integration.removeStaff(staffId);
      }
      next();
    },

    // Auto-sync training
    autoSyncTraining: async (staffId, training) => {
      return integration.recordTraining(staffId, training);
    },

    // Routes to add to your app
    routes: [
      // Sync staff to Workforce
      {
        method: 'post',
        path: `/api${config.staffEndpoint}/sync`,
        handler: async (req, res) => {
          const { staffId } = req.body;
          const result = await integration.syncStaff({ id: staffId, ...req.body });
          res.json(result);
        }
      },
      // Get skills gap
      {
        method: 'get',
        path: `/api${config.staffEndpoint}/skills-gap`,
        handler: async (req, res) => {
          const gap = await integration.getSkills(req.params.staffId);
          res.json({
            industry: config.industryName,
            requiredSkills: config.requiredSkills,
            staffSkills: gap.skills,
            missingSkills: config.requiredSkills.filter(s => !gap.skills.includes(s)),
          });
        }
      },
      // Get compliance dashboard
      {
        method: 'get',
        path: `/api${config.staffEndpoint}/compliance-dashboard`,
        handler: async (req, res) => {
          const dashboard = await integration.getComplianceDashboard();
          res.json(dashboard);
        }
      },
      // Get training requirements
      {
        method: 'get',
        path: `/api${config.staffEndpoint}/training-requirements`,
        handler: async (req, res) => {
          const requirements = await integration.getTrainingRequirements();
          res.json(requirements);
        }
      },
    ],
  };
}

// ============================================================
// USAGE EXAMPLE
// ============================================================

/*
// In your Industry OS (e.g., restaurant-os):

const { createIntegrationMiddleware } = require('./integration');

// Create middleware for hospitality industry
const workforce = createIntegrationMiddleware('hospitality');

// Initialize on startup
app.listen(PORT, async () => {
  await workforce.init();
  console.log(`${INDUSTRY_CONFIG.hospitality.industryName} started with Workforce OS integration`);
});

// Add routes
workforce.routes.forEach(route => {
  app[route.method](route.path, route.handler);
});

// When staff gets certified:
app.post('/api/staff/:id/certify', async (req, res) => {
  const staffId = req.params.id;
  const certification = req.body;

  // Save locally
  await saveCertification(staffId, certification);

  // Sync to Workforce OS
  await workforce.getIntegration().recordTraining(staffId, {
    name: certification.name,
    skills: certification.skills,
    completedAt: new Date().toISOString(),
  });

  res.json({ success: true });
});
*/

// Export
module.exports = {
  UniversalWorkforceIntegration,
  INDUSTRY_CONFIG,
  createIntegrationMiddleware,
};
