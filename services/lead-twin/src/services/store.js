/**
 * RTMN Lead Twin - Shared Store Service v2.0
 * In-memory storage for leads and activities with shared access
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@rtmn/twinos-shared';

// ============ SHARED STORAGE ============

export const leads = new Map();
export const activities = new Map();

// ============ SEED DATA ============

const seedLeads = [
  { name: 'Sarah Johnson', email: 'sarah@techcorp.com', company: 'TechCorp', industry: 'Technology', type: 'hot', score: 85 },
  { name: 'Michael Chen', email: 'michael@acme.com', company: 'Acme Corp', industry: 'Retail', type: 'warm', score: 65 },
  { name: 'Emily Rodriguez', email: 'emily.r@globaltech.io', company: 'GlobalTech', industry: 'Technology', type: 'hot', score: 92 },
  { name: 'James Wilson', email: 'jwilson@startup.co', company: 'StartupCo', industry: 'SaaS', type: 'warm', score: 72 },
  { name: 'Lisa Anderson', email: 'lisa@enterprise.net', company: 'Enterprise Solutions', industry: 'Enterprise', type: 'hot', score: 88 },
  { name: 'David Kim', email: 'dkim@nexus.com', company: 'Nexus Industries', industry: 'Healthcare', type: 'warm', score: 68 },
  { name: 'Amanda Foster', email: 'amanda.f@innovate.tech', company: 'InnovateTech', industry: 'Technology', type: 'cold', score: 45 },
  { name: 'Robert Martinez', email: 'rmartinez@corp.biz', company: 'CorpBiz', industry: 'Finance', type: 'warm', score: 62 },
  { name: 'Jennifer Lee', email: 'jlee@cloudops.io', company: 'CloudOps', industry: 'Technology', type: 'hot', score: 78 },
  { name: 'Christopher Brown', email: 'cbrown@datawise.com', company: 'DataWise', industry: 'Analytics', type: 'warm', score: 70 },
  { name: 'Michelle Taylor', email: 'mtaylor@growthco.com', company: 'GrowthCo', industry: 'Marketing', type: 'cold', score: 42 },
  { name: 'Daniel Garcia', email: 'dgarcia@retailmax.com', company: 'RetailMax', industry: 'Retail', type: 'warm', score: 58 },
  { name: 'Stephanie White', email: 'swhite@healthplus.com', company: 'HealthPlus', industry: 'Healthcare', type: 'hot', score: 82 },
  { name: 'Andrew Jackson', email: 'ajackson@finstream.com', company: 'FinStream', industry: 'Finance', type: 'warm', score: 74 },
  { name: 'Nicole Harris', email: 'nharris@cloudscale.io', company: 'CloudScale', industry: 'Technology', type: 'hot', score: 90 },
  { name: 'Kevin Thompson', email: 'kthompson@logistics.co', company: 'LogiTech', industry: 'Logistics', type: 'cold', score: 48 },
  { name: 'Rachel Clark', email: 'rclark@medtech.com', company: 'MedTech Solutions', industry: 'Healthcare', type: 'warm', score: 66 },
  { name: 'Brandon Lewis', email: 'blewis@scaleware.io', company: 'ScaleWare', industry: 'Technology', type: 'cold', score: 38 },
  { name: 'Samantha Walker', email: 'swalker@retailgen.com', company: 'RetailGen', industry: 'Retail', type: 'warm', score: 71 },
  { name: 'Tyler Hall', email: 'thall@digitalsales.co', company: 'DigitalSales', industry: 'Sales', type: 'hot', score: 86 }
];

// Seed leads on startup
seedLeads.forEach((l) => {
  const id = `lead_${Date.now()}_${uuidv4().slice(0, 8)}`;
  leads.set(id, {
    id,
    ...l,
    status: 'active',
    businessId: null,
    createdAt: new Date().toISOString()
  });
});

logger.info(`Lead Twin store initialized with ${leads.size} leads`);

// ============ STORE SERVICE ============

export const leadStore = {
  // Lead operations
  leads: {
    getAll: () => Array.from(leads.values()),

    getById: (id) => leads.get(id),

    create: (leadData) => {
      const id = `lead_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const lead = {
        id,
        ...leadData,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      leads.set(id, lead);
      return lead;
    },

    update: (id, updates) => {
      const lead = leads.get(id);
      if (!lead) return null;
      const updated = {
        ...lead,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      leads.set(id, updated);
      return updated;
    },

    delete: (id) => {
      if (!leads.has(id)) return false;
      leads.delete(id);
      return true;
    },

    count: () => leads.size,

    search: (query) => {
      const q = query.toLowerCase();
      return Array.from(leads.values()).filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    }
  },

  // Activity operations
  activities: {
    getAll: () => Array.from(activities.values()),

    getById: (id) => activities.get(id),

    getByLeadId: (leadId) => {
      return Array.from(activities.values()).filter(a => a.leadId === leadId);
    },

    create: (activityData) => {
      const id = `act_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const activity = {
        id,
        ...activityData,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      activities.set(id, activity);
      return activity;
    },

    count: () => activities.size
  }
};

export default leadStore;
