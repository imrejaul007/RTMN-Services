// In-memory lead storage service
const leads = new Map();

export const leadStore = {
  getAll: () => Array.from(leads.values()),

  getById: (id) => leads.get(id),

  create: (lead) => {
    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newLead = {
      id,
      ...lead,
      score: lead.score || 50,
      createdAt: new Date().toISOString()
    };
    leads.set(id, newLead);
    return newLead;
  },

  update: (id, updates) => {
    const lead = leads.get(id);
    if (!lead) return null;
    const updated = { ...lead, ...updates, updatedAt: new Date().toISOString() };
    leads.set(id, updated);
    return updated;
  },

  delete: (id) => {
    if (!leads.has(id)) return false;
    leads.delete(id);
    return true;
  },

  search: (query) => {
    const q = query.toLowerCase();
    return Array.from(leads.values()).filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  },

  filterByType: (type) => {
    return Array.from(leads.values()).filter(l => l.type === type);
  },

  filterByIndustry: (industry) => {
    return Array.from(leads.values()).filter(l => l.industry === industry);
  },

  seed: (initialLeads) => {
    initialLeads.forEach(l => {
      const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      leads.set(id, { id, ...l, createdAt: new Date().toISOString() });
    });
    return leads.size;
  },

  count: () => leads.size
};

export default leadStore;
