/**
 * Restaurant OS - Workforce OS Integration
 *
 * Syncs staff and training data with Workforce OS
 * via Cross-OS Integration Hub (Port 5085)
 */

const axios = require('axios');

// Configuration
const CROSS_OS_URL = process.env.CROSS_OS_URL || 'http://localhost:5085';
const WORKFORCE_OS_URL = process.env.WORKFORCE_OS_URL || 'http://localhost:5065';

// Integration Client
class WorkforceIntegration {
  constructor() {
    this.crossOS = axios.create({
      baseURL: CROSS_OS_URL,
      timeout: 5000,
    });
    this.workforce = axios.create({
      baseURL: WORKFORCE_OS_URL,
      timeout: 5000,
    });
  }

  // Sync staff member to Workforce OS
  async syncStaffToWorkforce(staff) {
    try {
      // 1. Try to create employee in Workforce OS first
      const employee = {
        firstName: staff.name.split(' ')[0] || staff.name,
        lastName: staff.name.split(' ').slice(1).join(' ') || '',
        email: staff.email || `staff_${staff.id}@restaurant.rtmn.com`,
        departmentId: 'RESTAURANT',
        positionId: staff.role.toUpperCase(),
        employmentType: 'full-time',
        status: staff.status === 'active' ? 'active' : 'inactive',
        industries: ['hospitality'],
      };

      // 2. Assign to Hospitality industry via Cross-OS Hub
      const response = await this.crossOS.post(
        `/api/employees/${staff.id}/assign`,
        {
          industries: ['hospitality'],
          role: staff.role,
        }
      );

      console.log(`✅ Staff ${staff.name} synced to Workforce OS`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Failed to sync staff ${staff.name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Sync training/certification to Workforce OS
  async syncTraining(staffId, training) {
    try {
      const response = await this.crossOS.post(
        `/api/employees/${staffId}/training`,
        {
          industry: 'hospitality',
          training: {
            name: training.name,
            skills: training.skills || [],
            completedAt: new Date().toISOString(),
            validUntil: training.validUntil,
          },
        }
      );

      console.log(`✅ Training ${training.name} synced for staff ${staffId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Failed to sync training:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Get staff compliance status
  async getCompliance(staffId) {
    try {
      const response = await this.crossOS.get(
        `/api/employees/${staffId}/compliance`
      );
      return response.data;
    } catch (error) {
      return { status: 'unknown' };
    }
  }

  // Get skills gap for hospitality industry
  async getSkillsGap() {
    try {
      const response = await this.crossOS.get(
        '/api/industries/hospitality/skills-gap'
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Publish staff event to Event Bus
  async publishEvent(eventType, payload) {
    try {
      await this.workforce.post('/api/events/publish', {
        type: eventType,
        payload,
        source: 'restaurant-os',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Event publish failed:', error.message);
    }
  }
}

// Restaurant-specific training requirements
const HOSPITALITY_TRAINING = {
  chef: ['food_safety', 'hygiene', 'culinary_arts', 'food_hygiene'],
  server: ['food_safety', 'customer_service', 'alcohol_service'],
  bartender: ['alcohol_service', 'food_safety', 'customer_service'],
  host: ['customer_service', 'seating_management'],
  manager: ['food_safety', 'staff_management', 'inventory_management'],
};

// Get required skills for a role
function getRequiredSkillsForRole(role) {
  const normalizedRole = role.toLowerCase().replace(' ', '_');
  return HOSPITALITY_TRAINING[normalizedRole] || ['food_safety', 'customer_service'];
}

// Initialize integration
const workforceIntegration = new WorkforceIntegration();

// Export for use in main app
module.exports = {
  workforceIntegration,
  getRequiredSkillsForRole,
  HOSPITALITY_TRAINING,
};
